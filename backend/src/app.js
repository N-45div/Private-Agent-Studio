import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { config } from "./config.js";
import { applyCors, methodNotAllowed, notFound, readJson, sendJson } from "./lib/http.js";
import { isAppError } from "./lib/errors.js";
import { createServiceContainer } from "./services/container.js";

const {
  services: {
    templateService,
    auditService,
    studioAgentService,
    workflowRunService,
    vaultService,
    proposalService,
    executionService,
    computeAdapter,
    store,
  },
} = createServiceContainer();

const STORAGE_NODE_METHOD_PATTERN = /^zgs_[A-Za-z0-9_]+$/;

function isBlockedProxyHost(hostname) {
  const normalized = hostname.toLowerCase();
  const ipv4Match = normalized.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [, aRaw, bRaw] = ipv4Match;
    const a = Number(aRaw);
    const b = Number(bRaw);
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }

  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "::1" ||
    normalized.endsWith(".localhost")
  );
}

async function getTrustedStorageNodeUrls() {
  const response = await fetch(config.zeroG.storageIndexerRpc, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "indexer_getShardedNodes",
      params: [],
    }),
  });

  if (!response.ok) {
    throw new Error(`0G indexer returned ${response.status}`);
  }

  const payload = await response.json();
  const trusted = payload?.result?.trusted || [];
  return new Set(
    trusted
      .map((node) => {
        try {
          return node?.url ? new URL(node.url).toString() : "";
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  );
}

async function proxyStorageNodeRequest(request, response, targetUrl) {
  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    return sendJson(response, 400, {
      error: "invalid_storage_node_url",
      message: "Storage node URL is invalid",
    });
  }

  if (!["http:", "https:"].includes(parsedTarget.protocol) || isBlockedProxyHost(parsedTarget.hostname)) {
    return sendJson(response, 400, {
      error: "storage_node_url_not_allowed",
      message: "Storage node URL is not allowed",
    });
  }

  const body = await readJson(request);
  if (!STORAGE_NODE_METHOD_PATTERN.test(body?.method || "")) {
    return sendJson(response, 400, {
      error: "storage_node_method_not_allowed",
      message: "Only 0G storage node JSON-RPC methods can be proxied",
    });
  }

  const trustedNodeUrls = await getTrustedStorageNodeUrls();
  if (!trustedNodeUrls.has(parsedTarget.toString())) {
    return sendJson(response, 403, {
      error: "storage_node_not_trusted",
      message: "Storage node URL is not in the configured 0G indexer trusted set",
    });
  }

  const upstream = await fetch(parsedTarget, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  applyCors(response);
  response.writeHead(upstream.status, {
    "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
  });
  response.end(text);
}

function jsonError(response, statusCode, error) {
  sendJson(response, statusCode, {
    error: error.code || "request_failed",
    message: error.message,
    details: error.details || null,
  });
}

function toMcpSlug(value) {
  const slug = String(value || "agent")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || "agent";
}

function buildAgentMcpSurface(agent, baseUrl) {
  const slug = toMcpSlug(agent.name);
  const manifestUri = `private-agent-studio://${agent.id}/manifest`;
  const proofUri = `private-agent-studio://${agent.id}/proof`;
  const runbookUri = `private-agent-studio://${agent.id}/runbook`;

  const tools = [
    {
      name: `${slug}.run`,
      description: `Run ${agent.name} as a published private 0G agent.`,
      inputSchema: {
        type: "object",
        properties: {
          objective: { type: "string" },
          audience: { type: "string" },
          tone: { type: "string" },
          context: {
            type: "object",
            additionalProperties: true,
          },
        },
        required: ["objective"],
        additionalProperties: false,
      },
    },
    {
      name: `${slug}.summarize`,
      description: `Ask ${agent.name} for a concise private workflow summary.`,
      inputSchema: {
        type: "object",
        properties: {
          focus: { type: "string" },
          audience: { type: "string" },
        },
        additionalProperties: false,
      },
    },
    {
      name: `${slug}.evidence`,
      description: `Return ${agent.name} storage, registry, authorization, and runtime proof.`,
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  ];

  const resources = [
    {
      uri: manifestUri,
      name: `${agent.name} manifest`,
      description: "Export manifest with package metadata, workflow, runtime endpoints, and MCP surface.",
      mimeType: "application/json",
    },
    {
      uri: proofUri,
      name: `${agent.name} 0G proof`,
      description: "0G Storage root, registry contract, registration transaction, and active grant count.",
      mimeType: "application/json",
    },
    {
      uri: runbookUri,
      name: `${agent.name} runbook`,
      description: "Plain-English runtime instructions for OpenClaw or another MCP client.",
      mimeType: "text/markdown",
    },
  ];

  const prompts = [
    {
      name: `${slug}.private_brief`,
      description: `Run ${agent.name} for a concise private operating brief.`,
      arguments: [
        {
          name: "objective",
          description: "What this private agent should accomplish.",
          required: true,
        },
        {
          name: "audience",
          description: "Who the answer is for.",
          required: false,
        },
      ],
    },
  ];

  return {
    slug,
    endpoint: `${baseUrl}/api/agents/${agent.id}/mcp`,
    tools,
    resources,
    prompts,
  };
}

function buildAgentProof(agent) {
  return {
    agentId: agent.id,
    agentName: agent.name,
    status: agent.status,
    storageRoot: agent.storageRoot || null,
    storageTxHash: agent.storageTxHash || null,
    registryAddress: agent.registryAddress || config.zeroG.agentRegistryAddress || null,
    registrationTxHash: agent.registrationTxHash || null,
    onchainStatus: agent.onchainStatus,
  };
}

function buildAgentRunbook(agent, surface) {
  return [
    `# ${agent.name} MCP`,
    "",
    "This is an agent-bound MCP connector generated by Private Agent Studio.",
    "",
    "## Tools",
    ...surface.tools.map((tool) => `- \`${tool.name}\`: ${tool.description}`),
    "",
    "## Resources",
    ...surface.resources.map((resource) => `- \`${resource.uri}\`: ${resource.description}`),
    "",
    "## Runtime",
    `- MCP endpoint: ${surface.endpoint}`,
    `- 0G Storage root: ${agent.storageRoot || "not published"}`,
    `- Registry: ${agent.registryAddress || config.zeroG.agentRegistryAddress || "not configured"}`,
    `- Onchain status: ${agent.onchainStatus}`,
  ].join("\n");
}

function createAgentMcpServer(agent, baseUrl) {
  const surface = buildAgentMcpSurface(agent, baseUrl);
  const server = new McpServer(
    {
      name: `${surface.slug}-mcp`,
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    },
  );

  server.registerTool(
    `${surface.slug}.run`,
    {
      title: `Run ${agent.name}`,
      description: `Run ${agent.name} as a published private 0G agent.`,
      inputSchema: {
        objective: z.string().describe("What the private agent should accomplish."),
        audience: z.string().optional().describe("Who the result is for."),
        tone: z.string().optional().describe("Preferred response tone."),
        context: z.record(z.unknown()).optional().describe("Optional private runtime context."),
      },
    },
    async ({ objective, audience = "", tone = "", context = {} }) => {
      const run = await workflowRunService.startRun(agent, {
        objective,
        input: {
          audience,
          tone,
          context,
        },
        runtime: {
          credentialSource: "platform_managed",
          executionMode: "auto",
          providedSecretKeys: [],
        },
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ run }, null, 2) }],
        structuredContent: { run },
      };
    },
  );

  server.registerTool(
    `${surface.slug}.summarize`,
    {
      title: `Summarize ${agent.name}`,
      description: `Ask ${agent.name} for a concise private workflow summary.`,
      inputSchema: {
        focus: z.string().optional().describe("What the summary should focus on."),
        audience: z.string().optional().describe("Who the summary is for."),
      },
    },
    async ({ focus = "", audience = "" }) => {
      const run = await workflowRunService.startRun(agent, {
        objective: `Summarize ${agent.name}${focus ? ` with focus on ${focus}` : ""}.`,
        input: { audience },
        runtime: {
          credentialSource: "platform_managed",
          executionMode: "auto",
          providedSecretKeys: [],
        },
      });

      return {
        content: [{ type: "text", text: JSON.stringify({ run }, null, 2) }],
        structuredContent: { run },
      };
    },
  );

  server.registerTool(
    `${surface.slug}.evidence`,
    {
      title: `${agent.name} 0G Evidence`,
      description: `Return ${agent.name} storage, registry, authorization, and runtime proof.`,
      inputSchema: {},
    },
    async () => {
      const runs = await studioAgentService.listAgentRuns(agent.id);
      const output = {
        proof: buildAgentProof(agent),
        runCount: runs.length,
        resources: surface.resources,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    },
  );

  server.registerResource(
    `${surface.slug}.manifest`,
    `private-agent-studio://${agent.id}/manifest`,
    {
      title: `${agent.name} manifest`,
      description: "Export manifest with package metadata, workflow, runtime endpoints, and MCP surface.",
      mimeType: "application/json",
    },
    async (uri) => {
      const manifest = await studioAgentService.getExportManifest(agent.id, { baseUrl });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(manifest, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    `${surface.slug}.proof`,
    `private-agent-studio://${agent.id}/proof`,
    {
      title: `${agent.name} 0G proof`,
      description: "0G Storage root, registry contract, registration transaction, and active grant count.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(buildAgentProof(agent), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    `${surface.slug}.runbook`,
    `private-agent-studio://${agent.id}/runbook`,
    {
      title: `${agent.name} runbook`,
      description: "Plain-English runtime instructions for OpenClaw or another MCP client.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/markdown",
          text: buildAgentRunbook(agent, surface),
        },
      ],
    }),
  );

  server.registerPrompt(
    `${surface.slug}.private_brief`,
    {
      title: `${agent.name} private brief`,
      description: `Run ${agent.name} for a concise private operating brief.`,
      argsSchema: {
        objective: z.string().describe("What this private agent should accomplish."),
        audience: z.string().optional().describe("Who the answer is for."),
      },
    },
    async ({ objective, audience = "the requesting operator" }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `${objective}\n\nAudience: ${audience}\nReturn a concise, private, action-oriented result.`,
          },
        },
      ],
    }),
  );

  return { server, surface };
}

async function handleAgentMcpProfile(response, agentId, baseUrl) {
  const agent = await studioAgentService.getAgent(agentId);
  if (!agent) {
    return sendJson(response, 404, { error: "agent_not_found" });
  }

  const surface = buildAgentMcpSurface(agent, baseUrl);

  return sendJson(response, 200, {
    name: `${surface.slug}-mcp`,
    transport: "streamable_http",
    endpoint: surface.endpoint,
    agentId: agent.id,
    agentName: agent.name,
    tools: surface.tools,
    resources: surface.resources,
    prompts: surface.prompts,
    clientConfig: {
      mcpServers: {
        [`${surface.slug}-mcp`]: {
          transport: "streamable_http",
          url: surface.endpoint,
        },
      },
    },
  });
}

async function handleAgentMcpRequest(request, response, agentId, baseUrl) {
  const agent = await studioAgentService.getAgent(agentId);
  if (!agent) {
    return sendJson(response, 404, { error: "agent_not_found" });
  }

  if (request.method !== "POST") {
    return methodNotAllowed(response, ["POST"]);
  }

  const { server } = createAgentMcpServer(agent, baseUrl);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  applyCors(response);
  await server.connect(transport);
  response.on("close", () => {
    transport.close().catch(() => null);
    server.close().catch(() => null);
  });
  await transport.handleRequest(request, response);
}

export async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const path = url.pathname;
  const forwardedProto = request.headers["x-forwarded-proto"];
  const detectedProtocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto || url.protocol.replace(":", "");
  const protocol = url.host.endsWith(".run.app") ? "https" : detectedProtocol;
  const baseUrl = `${protocol}://${url.host}`;

  try {
    if (request.method === "OPTIONS") {
      applyCors(response);
      response.writeHead(204);
      return response.end();
    }

    if (path === "/health") {
      if (request.method !== "GET") {
        return methodNotAllowed(response, ["GET"]);
      }

      return sendJson(response, 200, {
        ok: true,
        service: "private-agent-studio-backend",
        timestamp: new Date().toISOString(),
        network: config.zeroG.network,
        chainId: config.zeroG.chainId,
        rpcUrl: config.zeroG.rpcUrl,
        stateStore: store.describe?.() || { kind: config.stateStore },
        readiness: {
          hasPrivateKey: Boolean(config.zeroG.privateKey),
          hasRegistry: Boolean(config.zeroG.registryAddress),
          hasAgentRegistry: Boolean(config.zeroG.agentRegistryAddress),
          storageIndexerRpc: config.zeroG.storageIndexerRpc,
          computeProvider: config.zeroG.computeProvider || "auto-discovery",
          hasComputeApiKey: Boolean(config.zeroG.computeApiKey),
          computeApiBase: config.zeroG.computeApiBase || null,
        },
      });
    }

    if (path === "/api/vaults") {
      if (request.method === "GET") {
        const vaults = await vaultService.listVaults();
        return sendJson(response, 200, { vaults });
      }

      if (request.method === "POST") {
        const body = await readJson(request);
        const vault = await vaultService.createVault(body);
        return sendJson(response, 201, { vault });
      }

      return methodNotAllowed(response, ["GET", "POST"]);
    }

    if (path === "/api/templates") {
      if (request.method !== "GET") {
        return methodNotAllowed(response, ["GET"]);
      }

      const templates = templateService.listTemplates();
      return sendJson(response, 200, { templates });
    }

    if (path === "/api/diagnostics/compute") {
      if (request.method !== "GET") {
        return methodNotAllowed(response, ["GET"]);
      }

      const acknowledgeProviders = url.searchParams.get("ack") === "true";
      const probeDirectApi = url.searchParams.get("probe") === "true";
      const compute = await computeAdapter.getDiagnostics({ acknowledgeProviders, probeDirectApi });
      return sendJson(response, 200, { compute });
    }

    if (path === "/api/zerog/storage-node-proxy") {
      if (request.method !== "POST") {
        return methodNotAllowed(response, ["POST"]);
      }

      const targetUrl = url.searchParams.get("url") || "";
      return proxyStorageNodeRequest(request, response, targetUrl);
    }

    if (path === "/api/agents") {
      if (request.method === "GET") {
        const agents = await studioAgentService.listAgents();
        return sendJson(response, 200, { agents });
      }

      if (request.method === "POST") {
        const body = await readJson(request);
        const agent = await studioAgentService.createAgent(body);
        return sendJson(response, 201, { agent });
      }

      return methodNotAllowed(response, ["GET", "POST"]);
    }

    const agentMatch = path.match(/^\/api\/agents\/([^/]+)$/);
    if (agentMatch) {
      if (request.method === "GET") {
        const agent = await studioAgentService.getAgent(agentMatch[1]);
        if (!agent) {
          return sendJson(response, 404, { error: "agent_not_found" });
        }

        return sendJson(response, 200, { agent });
      }

      if (request.method === "PATCH") {
        const body = await readJson(request);
        const agent = await studioAgentService.updateWorkflow(agentMatch[1], body);
        return sendJson(response, 200, { agent });
      }

      return methodNotAllowed(response, ["GET", "PATCH"]);
    }

    const agentExportManifestMatch = path.match(/^\/api\/agents\/([^/]+)\/export-manifest$/);
    if (agentExportManifestMatch) {
      if (request.method !== "GET") {
        return methodNotAllowed(response, ["GET"]);
      }

      const manifest = await studioAgentService.getExportManifest(agentExportManifestMatch[1], {
        baseUrl,
      });
      return sendJson(response, 200, { manifest });
    }

    const agentMcpMatch = path.match(/^\/api\/agents\/([^/]+)\/mcp$/);
    if (agentMcpMatch) {
      return handleAgentMcpRequest(request, response, agentMcpMatch[1], baseUrl);
    }

    const agentMcpProfileMatch = path.match(/^\/api\/agents\/([^/]+)\/mcp-profile$/);
    if (agentMcpProfileMatch) {
      if (request.method !== "GET") {
        return methodNotAllowed(response, ["GET"]);
      }

      return handleAgentMcpProfile(response, agentMcpProfileMatch[1], baseUrl);
    }

    const agentPublishIntentMatch = path.match(/^\/api\/agents\/([^/]+)\/publish-intent$/);
    if (agentPublishIntentMatch) {
      if (request.method !== "GET") {
        return methodNotAllowed(response, ["GET"]);
      }

      const publishIntent = await studioAgentService.getPublishIntent(agentPublishIntentMatch[1]);
      return sendJson(response, 200, { publishIntent });
    }

    const agentPublishMatch = path.match(/^\/api\/agents\/([^/]+)\/publish$/);
    if (agentPublishMatch) {
      if (request.method !== "POST") {
        return methodNotAllowed(response, ["POST"]);
      }

      const body = await readJson(request);
      const agent = await studioAgentService.confirmPublishedAgent(agentPublishMatch[1], body);
      return sendJson(response, 200, { agent });
    }

    const agentServerPublishMatch = path.match(/^\/api\/agents\/([^/]+)\/server-publish$/);
    if (agentServerPublishMatch) {
      if (request.method !== "POST") {
        return methodNotAllowed(response, ["POST"]);
      }

      const result = await studioAgentService.publishAgentPackageFromBackend(agentServerPublishMatch[1]);
      return sendJson(response, 200, result);
    }

    const agentOnchainIntentMatch = path.match(/^\/api\/agents\/([^/]+)\/onchain-registration-intent$/);
    if (agentOnchainIntentMatch) {
      if (request.method !== "GET") {
        return methodNotAllowed(response, ["GET"]);
      }

      const registrationIntent = await studioAgentService.getOnchainRegistrationIntent(
        agentOnchainIntentMatch[1],
      );
      return sendJson(response, 200, { registrationIntent });
    }

    const agentOnchainRegistrationMatch = path.match(/^\/api\/agents\/([^/]+)\/onchain-registration$/);
    if (agentOnchainRegistrationMatch) {
      if (request.method !== "POST") {
        return methodNotAllowed(response, ["POST"]);
      }

      const body = await readJson(request);
      const agent = await studioAgentService.confirmOnchainRegistration(
        agentOnchainRegistrationMatch[1],
        body,
      );
      return sendJson(response, 200, { agent });
    }

    const agentAuthorizationsMatch = path.match(/^\/api\/agents\/([^/]+)\/authorizations$/);
    if (agentAuthorizationsMatch) {
      if (request.method === "GET") {
        const authorizations = await studioAgentService.listAuthorizations(
          agentAuthorizationsMatch[1],
        );
        return sendJson(response, 200, { authorizations });
      }

      return methodNotAllowed(response, ["GET"]);
    }

    const agentAuthorizationIntentMatch = path.match(
      /^\/api\/agents\/([^/]+)\/authorizations\/intents$/,
    );
    if (agentAuthorizationIntentMatch) {
      if (request.method !== "POST") {
        return methodNotAllowed(response, ["POST"]);
      }

      const body = await readJson(request);
      const authorization = await studioAgentService.createAuthorizationIntent(
        agentAuthorizationIntentMatch[1],
        body,
      );
      return sendJson(response, 201, authorization);
    }

    const agentAuthorizationConfirmMatch = path.match(
      /^\/api\/agents\/([^/]+)\/authorizations\/([^/]+)\/confirm$/,
    );
    if (agentAuthorizationConfirmMatch) {
      if (request.method !== "POST") {
        return methodNotAllowed(response, ["POST"]);
      }

      const body = await readJson(request);
      const authorization = await studioAgentService.confirmAuthorization(
        agentAuthorizationConfirmMatch[1],
        agentAuthorizationConfirmMatch[2],
        body,
      );
      return sendJson(response, 200, { authorization });
    }

    const agentAuthorizationRevokeIntentMatch = path.match(
      /^\/api\/agents\/([^/]+)\/authorizations\/([^/]+)\/revoke-intent$/,
    );
    if (agentAuthorizationRevokeIntentMatch) {
      if (request.method !== "GET") {
        return methodNotAllowed(response, ["GET"]);
      }

      const revokeIntent = await studioAgentService.getRevocationIntent(
        agentAuthorizationRevokeIntentMatch[1],
        agentAuthorizationRevokeIntentMatch[2],
      );
      return sendJson(response, 200, { revokeIntent });
    }

    const agentAuthorizationRevokeMatch = path.match(
      /^\/api\/agents\/([^/]+)\/authorizations\/([^/]+)\/revoke$/,
    );
    if (agentAuthorizationRevokeMatch) {
      if (request.method !== "POST") {
        return methodNotAllowed(response, ["POST"]);
      }

      const body = await readJson(request);
      const authorization = await studioAgentService.confirmRevocation(
        agentAuthorizationRevokeMatch[1],
        agentAuthorizationRevokeMatch[2],
        body,
      );
      return sendJson(response, 200, { authorization });
    }

    const agentRunsMatch = path.match(/^\/api\/agents\/([^/]+)\/runs$/);
    if (agentRunsMatch) {
      const agent = await studioAgentService.getAgent(agentRunsMatch[1]);
      if (!agent) {
        return sendJson(response, 404, { error: "agent_not_found" });
      }

      if (request.method === "GET") {
        const runs = await studioAgentService.listAgentRuns(agent.id);
        return sendJson(response, 200, { runs });
      }

      if (request.method === "POST") {
        const body = await readJson(request);
        const run = await workflowRunService.startRun(agent, body);
        return sendJson(response, 201, { run });
      }

      return methodNotAllowed(response, ["GET", "POST"]);
    }

    const runMatch = path.match(/^\/api\/runs\/([^/]+)$/);
    if (runMatch) {
      if (request.method !== "GET") {
        return methodNotAllowed(response, ["GET"]);
      }

      const run = await workflowRunService.getRun(runMatch[1]);
      if (!run) {
        return sendJson(response, 404, { error: "run_not_found" });
      }

      return sendJson(response, 200, { run });
    }

    const vaultMatch = path.match(/^\/api\/vaults\/([^/]+)$/);
    if (vaultMatch) {
      if (request.method !== "GET") {
        return methodNotAllowed(response, ["GET"]);
      }

      const vault = await vaultService.getVault(vaultMatch[1]);
      if (!vault) {
        return sendJson(response, 404, { error: "vault_not_found" });
      }

      return sendJson(response, 200, { vault });
    }

    const policyMatch = path.match(/^\/api\/vaults\/([^/]+)\/policies$/);
    if (policyMatch) {
      if (request.method !== "POST") {
        return methodNotAllowed(response, ["POST"]);
      }

      const body = await readJson(request);
      const vault = await vaultService.updatePolicy(policyMatch[1], body);
      if (!vault) {
        return sendJson(response, 404, { error: "vault_not_found" });
      }

      return sendJson(response, 200, { vault });
    }

    const proposalGenerateMatch = path.match(/^\/api\/vaults\/([^/]+)\/proposals\/generate$/);
    if (proposalGenerateMatch) {
      if (request.method !== "POST") {
        return methodNotAllowed(response, ["POST"]);
      }

      const vault = await vaultService.getVault(proposalGenerateMatch[1]);
      if (!vault) {
        return sendJson(response, 404, { error: "vault_not_found" });
      }

      const body = await readJson(request);
      const proposal = await proposalService.generate(vault, body);
      return sendJson(response, 201, { proposal });
    }

    const proposalApproveMatch = path.match(/^\/api\/proposals\/([^/]+)\/approve$/);
    if (proposalApproveMatch) {
      if (request.method !== "POST") {
        return methodNotAllowed(response, ["POST"]);
      }

      const body = await readJson(request);
      const proposal = await proposalService.approve(proposalApproveMatch[1], body);
      if (!proposal) {
        return sendJson(response, 404, { error: "proposal_not_found" });
      }

      return sendJson(response, 200, { proposal });
    }

    const proposalExecuteMatch = path.match(/^\/api\/proposals\/([^/]+)\/execute$/);
    if (proposalExecuteMatch) {
      if (request.method !== "POST") {
        return methodNotAllowed(response, ["POST"]);
      }

      const proposal = await proposalService.getProposal(proposalExecuteMatch[1]);
      if (!proposal) {
        return sendJson(response, 404, { error: "proposal_not_found" });
      }

      const vault = await vaultService.getVault(proposal.vaultId);
      if (!vault) {
        return sendJson(response, 404, { error: "vault_not_found" });
      }

      const execution = await executionService.execute(vault, proposal);
      return sendJson(response, 201, { execution });
    }

    const auditMatch = path.match(/^\/api\/vaults\/([^/]+)\/audit$/);
    if (auditMatch) {
      if (request.method !== "GET") {
        return methodNotAllowed(response, ["GET"]);
      }

      const events = await auditService.listByVault(auditMatch[1]);
      return sendJson(response, 200, { events });
    }

    return notFound(response);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return sendJson(response, 400, {
        error: "invalid_json",
        message: "Request body must be valid JSON",
      });
    }

    if (isAppError(error)) {
      return jsonError(response, error.statusCode, error);
    }

    return jsonError(response, 400, error);
  }
}
