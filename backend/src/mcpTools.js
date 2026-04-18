import { AppError } from "./lib/errors.js";

function jsonText(payload) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
    isError: false,
  };
}

function errorText(error) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            error: error.code || "tool_failed",
            message: error.message,
            details: error.details || null,
          },
          null,
          2,
        ),
      },
    ],
    isError: true,
  };
}

export function listStudioTools() {
  return [
    {
      name: "studio.health",
      description: "Return Private Agent Studio backend readiness and 0G configuration state.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "studio.list_templates",
      description: "List available private multi-agent workflow templates.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "studio.list_agents",
      description: "List all stored agent packages.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: "studio.get_compute_diagnostics",
      description: "Inspect current 0G Compute connectivity, including broker/provider failures or direct API readiness.",
      inputSchema: {
        type: "object",
        properties: {
          acknowledgeProviders: { type: "boolean" },
          probeDirectApi: { type: "boolean" },
        },
        additionalProperties: false,
      },
    },
    {
      name: "studio.create_agent",
      description: "Create a local private agent draft with multi-agent workflow metadata.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          owner: { type: "string" },
          templateId: { type: "string" },
          description: { type: "string" },
          collaborators: {
            type: "array",
            items: { type: "string" },
          },
          privacy: {
            type: "object",
            properties: {
              visibility: { type: "string" },
              dataSensitivity: { type: "string" },
              exportability: { type: "string" },
            },
            additionalProperties: false,
          },
          knowledge: {
            type: "object",
            properties: {
              sources: {
                type: "array",
                items: { type: "string" },
              },
            },
            additionalProperties: false,
          },
          policy: {
            type: "object",
            properties: {
              approvalMode: { type: "string" },
              allowDelegation: { type: "boolean" },
              maxStepsPerRun: { type: "number" },
            },
            additionalProperties: false,
          },
        },
        required: ["name", "owner", "templateId"],
        additionalProperties: false,
      },
    },
    {
      name: "studio.get_agent",
      description: "Fetch one agent package by id.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
        },
        required: ["agentId"],
        additionalProperties: false,
      },
    },
    {
      name: "studio.get_agent_export_manifest",
      description: "Return an export manifest for API or MCP consumers of a given agent package.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
          baseUrl: { type: "string" },
        },
        required: ["agentId"],
        additionalProperties: false,
      },
    },
    {
      name: "studio.get_publish_intent",
      description: "Return the draft package payload and instructions for user-wallet publication to 0G.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
        },
        required: ["agentId"],
        additionalProperties: false,
      },
    },
    {
      name: "studio.confirm_publish",
      description: "Confirm that the owner wallet published the agent package to 0G Storage or 0G Chain.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
          publisher: { type: "string" },
          packageHash: { type: "string" },
          publishMode: { type: "string" },
          storageRoot: { type: "string" },
          storageTxHash: { type: "string" },
          chainTxHash: { type: "string" },
          encryptionScheme: { type: "string" },
          signature: { type: "string" },
        },
        required: ["agentId", "publisher", "packageHash", "publishMode", "storageRoot"],
        additionalProperties: false,
      },
    },
    {
      name: "studio.get_onchain_registration_intent",
      description: "Return the contract call data for owner-wallet registration of a published agent on 0G Chain.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
        },
        required: ["agentId"],
        additionalProperties: false,
      },
    },
    {
      name: "studio.confirm_onchain_registration",
      description: "Confirm that the owner wallet registered the published agent on the onchain registry.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
          registrant: { type: "string" },
          packageHash: { type: "string" },
          storageRoot: { type: "string" },
          chainTxHash: { type: "string" },
          registryAddress: { type: "string" },
          registrationMode: { type: "string" },
        },
        required: [
          "agentId",
          "registrant",
          "packageHash",
          "storageRoot",
          "chainTxHash",
          "registryAddress",
        ],
        additionalProperties: false,
      },
    },
    {
      name: "studio.list_authorizations",
      description: "List all usage authorizations for a registered agent.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
        },
        required: ["agentId"],
        additionalProperties: false,
      },
    },
    {
      name: "studio.create_authorization_intent",
      description: "Prepare a usage authorization transaction for a grantee on the onchain registry.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
          grantee: { type: "string" },
          label: { type: "string" },
          accessMode: { type: "string" },
          capabilities: {
            type: "array",
            items: { type: "string" },
          },
          expiresAt: { type: "number" },
        },
        required: ["agentId", "grantee"],
        additionalProperties: false,
      },
    },
    {
      name: "studio.confirm_authorization",
      description: "Confirm that the owner wallet executed a prepared usage authorization onchain.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
          authorizationId: { type: "string" },
          authorizer: { type: "string" },
          scopeHash: { type: "string" },
          chainTxHash: { type: "string" },
          registryAddress: { type: "string" },
        },
        required: [
          "agentId",
          "authorizationId",
          "authorizer",
          "scopeHash",
          "chainTxHash",
          "registryAddress",
        ],
        additionalProperties: false,
      },
    },
    {
      name: "studio.start_run",
      description: "Run a private multi-agent workflow for an agent package through 0G Compute.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
          objective: { type: "string" },
          input: { type: "object" },
          runtime: {
            type: "object",
            properties: {
              credentialSource: { type: "string" },
              executionMode: { type: "string" },
              providedSecretKeys: {
                type: "array",
                items: { type: "string" },
              },
            },
            additionalProperties: false,
          },
        },
        required: ["agentId", "objective"],
        additionalProperties: false,
      },
    },
    {
      name: "studio.get_run",
      description: "Fetch one workflow run by id.",
      inputSchema: {
        type: "object",
        properties: {
          runId: { type: "string" },
        },
        required: ["runId"],
        additionalProperties: false,
      },
    },
    {
      name: "studio.list_agent_runs",
      description: "List runs for a given agent package.",
      inputSchema: {
        type: "object",
        properties: {
          agentId: { type: "string" },
        },
        required: ["agentId"],
        additionalProperties: false,
      },
    },
  ];
}

export async function callStudioTool(name, args, container) {
  const {
    config,
    services: { templateService, studioAgentService, workflowRunService, computeAdapter },
  } = container;

  try {
    switch (name) {
      case "studio.health":
        return jsonText({
          ok: true,
          service: "private-agent-studio-mcp",
          network: config.zeroG.network,
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
      case "studio.list_templates":
        return jsonText({ templates: templateService.listTemplates() });
      case "studio.list_agents":
        return jsonText({ agents: await studioAgentService.listAgents() });
      case "studio.get_compute_diagnostics":
        return jsonText({
          compute: await computeAdapter.getDiagnostics({
            acknowledgeProviders: Boolean(args?.acknowledgeProviders),
            probeDirectApi: Boolean(args?.probeDirectApi),
          }),
        });
      case "studio.create_agent":
        return jsonText({ agent: await studioAgentService.createAgent(args || {}) });
      case "studio.get_agent": {
        const agent = await studioAgentService.getAgent(args?.agentId);
        if (!agent) {
          throw new AppError("Agent not found", {
            code: "agent_not_found",
            statusCode: 404,
          });
        }
        return jsonText({ agent });
      }
      case "studio.get_agent_export_manifest":
        return jsonText({
          manifest: await studioAgentService.getExportManifest(args?.agentId, {
            baseUrl: args?.baseUrl || "",
          }),
        });
      case "studio.get_publish_intent":
        return jsonText({
          publishIntent: await studioAgentService.getPublishIntent(args?.agentId),
        });
      case "studio.confirm_publish":
        return jsonText({
          agent: await studioAgentService.confirmPublishedAgent(args?.agentId, args || {}),
        });
      case "studio.get_onchain_registration_intent":
        return jsonText({
          registrationIntent: await studioAgentService.getOnchainRegistrationIntent(args?.agentId),
        });
      case "studio.confirm_onchain_registration":
        return jsonText({
          agent: await studioAgentService.confirmOnchainRegistration(args?.agentId, args || {}),
        });
      case "studio.list_authorizations":
        return jsonText({
          authorizations: await studioAgentService.listAuthorizations(args?.agentId),
        });
      case "studio.create_authorization_intent":
        return jsonText(
          await studioAgentService.createAuthorizationIntent(args?.agentId, args || {}),
        );
      case "studio.confirm_authorization":
        return jsonText({
          authorization: await studioAgentService.confirmAuthorization(
            args?.agentId,
            args?.authorizationId,
            args || {},
          ),
        });
      case "studio.start_run": {
        const agent = await studioAgentService.getAgent(args?.agentId);
        if (!agent) {
          throw new AppError("Agent not found", {
            code: "agent_not_found",
            statusCode: 404,
          });
        }
        const run = await workflowRunService.startRun(agent, {
          objective: args?.objective,
          input: args?.input || {},
          runtime: args?.runtime || {},
        });
        return jsonText({ run });
      }
      case "studio.get_run": {
        const run = await workflowRunService.getRun(args?.runId);
        if (!run) {
          throw new AppError("Run not found", {
            code: "run_not_found",
            statusCode: 404,
          });
        }
        return jsonText({ run });
      }
      case "studio.list_agent_runs":
        return jsonText({
          runs: await studioAgentService.listAgentRuns(args?.agentId),
        });
      default:
        throw new AppError(`Unknown tool: ${name}`, {
          code: "unknown_tool",
          statusCode: 400,
        });
    }
  } catch (error) {
    return errorText(error);
  }
}
