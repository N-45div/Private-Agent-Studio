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
  },
} = createServiceContainer();

function jsonError(response, statusCode, error) {
  sendJson(response, statusCode, {
    error: error.code || "request_failed",
    message: error.message,
    details: error.details || null,
  });
}

export async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const path = url.pathname;

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

      const baseUrl = `${url.protocol}//${url.host}`;
      const manifest = await studioAgentService.getExportManifest(agentExportManifestMatch[1], {
        baseUrl,
      });
      return sendJson(response, 200, { manifest });
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
