import { keccakJson } from "../lib/hash.js";
import { AppError } from "../lib/errors.js";
import {
  validateAuthorizationIntentInput,
  validateConfirmAuthorizationInput,
  validateConfirmOnchainRegistrationInput,
  validateConfirmPublishInput,
  validateConfirmRevocationInput,
  validateCreateAgentInput,
  validateUpdateWorkflowInput,
} from "../lib/validation.js";

function buildAgentPackage(agentId, payload, template) {
  return {
    agentId,
    owner: payload.owner,
    name: payload.name,
    description: payload.description,
    template: {
      id: template.id,
      name: template.name,
      category: template.category,
    },
    tracks: template.tracks,
    privacy: payload.privacy,
    collaborators: payload.collaborators,
    knowledge: payload.knowledge,
    policy: payload.policy,
    workflow: {
      allowDelegation: payload.policy.allowDelegation,
      maxStepsPerRun: payload.policy.maxStepsPerRun,
      roles: template.roles,
      tools: template.tools,
      executionModel: "multi_agent_a2a",
    },
    requiredSecrets: template.requiredSecrets || [],
    runtimeTargets: template.runtimeTargets || [],
  };
}

function buildMetadataEnvelope(agent) {
  return {
    name: agent.name,
    description: agent.description,
    templateId: agent.templateId,
    collaborators: agent.collaborators,
    privacy: agent.privacy,
    knowledge: agent.knowledge,
    tracks: agent.tracks,
  };
}

function joinUrl(baseUrl, pathname) {
  if (!baseUrl) {
    return pathname;
  }

  return `${baseUrl.replace(/\/+$/, "")}${pathname}`;
}

function toMcpSlug(value) {
  const slug = String(value || "agent")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || "agent";
}

export class StudioAgentService {
  constructor(store, config, storageAdapter, agentRegistryAdapter, auditService, templateService) {
    this.store = store;
    this.config = config;
    this.storageAdapter = storageAdapter;
    this.agentRegistryAdapter = agentRegistryAdapter;
    this.auditService = auditService;
    this.templateService = templateService;
  }

  async listAgents() {
    const state = await this.store.readState();
    return state.agents;
  }

  async listAgentRuns(agentId) {
    const state = await this.store.readState();
    return state.runs.filter((run) => run.agentId === agentId);
  }

  async getAgent(agentId) {
    const state = await this.store.readState();
    return state.agents.find((agent) => agent.id === agentId) || null;
  }

  async createAgent(input) {
    const payload = validateCreateAgentInput(input, this.templateService.getTemplateIds());
    const template = this.templateService.getTemplate(payload.templateId);
    const agentId = this.store.createId("agent");
    const agentPackage = buildAgentPackage(agentId, payload, template);
    const packageHash = keccakJson(agentPackage);

    const agent = await this.store.transaction((state) => {
      const nextAgent = {
        id: agentId,
        owner: payload.owner,
        name: payload.name,
        description: payload.description,
        templateId: payload.templateId,
        collaborators: payload.collaborators,
        privacy: payload.privacy,
        policy: payload.policy,
        knowledge: payload.knowledge,
        workflow: agentPackage.workflow,
        tracks: template.tracks,
        packageHash,
        draftPackage: agentPackage,
        status: "draft",
        publishState: "local_only",
        onchainStatus: "not_registered",
        authorizations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.agents.push(nextAgent);
      return nextAgent;
    });

    await this.auditService.recordLocal("agent.draft_created", agent.id, {
      templateId: agent.templateId,
      owner: agent.owner,
      packageHash: agent.packageHash,
      privacy: agent.privacy,
    });

    return agent;
  }

  async updateWorkflow(agentId, input) {
    const currentAgent = await this.getAgent(agentId);
    if (!currentAgent) {
      throw new AppError("Agent not found", {
        code: "agent_not_found",
        statusCode: 404,
      });
    }

    if (currentAgent.status !== "draft" || !currentAgent.draftPackage) {
      throw new AppError("Only draft agents can be edited in the builder", {
        code: "agent_not_editable",
        statusCode: 409,
      });
    }

    const payload = validateUpdateWorkflowInput(input);
    const currentRoles = currentAgent.workflow?.roles || [];
    const currentRoleIds = currentRoles.map((role) => role.id);

    if (
      payload.roleOrder.length !== currentRoleIds.length ||
      payload.roleOrder.some((roleId) => !currentRoleIds.includes(roleId))
    ) {
      throw new AppError("roleOrder must match the current workflow role ids", {
        code: "validation_error",
        statusCode: 400,
        details: {
          roleOrder: payload.roleOrder,
          currentRoleIds,
        },
      });
    }

    const orderedRoles = payload.roleOrder.map((roleId) =>
      currentRoles.find((role) => role.id === roleId),
    );

    const agent = await this.store.transaction((state) => {
      const existing = state.agents.find((item) => item.id === agentId);
      if (!existing) {
        return null;
      }

      const nextDraftPackage = structuredClone(existing.draftPackage);
      nextDraftPackage.workflow.roles = orderedRoles;
      const nextPackageHash = keccakJson(nextDraftPackage);

      existing.workflow.roles = orderedRoles;
      existing.draftPackage = nextDraftPackage;
      existing.packageHash = nextPackageHash;
      existing.updatedAt = new Date().toISOString();
      return existing;
    });

    await this.auditService.recordLocal("agent.workflow_reordered", agent.id, {
      roleOrder: payload.roleOrder,
      packageHash: agent.packageHash,
    });

    return agent;
  }

  async getPublishIntent(agentId) {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new AppError("Agent not found", {
        code: "agent_not_found",
        statusCode: 404,
      });
    }

    if (!agent.draftPackage) {
      throw new AppError("Agent draft package is missing", {
        code: "agent_draft_missing",
        statusCode: 409,
      });
    }

    return {
      agentId: agent.id,
      owner: agent.owner,
      packageHash: agent.packageHash,
      packagePayload: agent.draftPackage,
      workflow: agent.workflow,
      recommendedPublishFlow: [
        "Encrypt the draft package client-side.",
        "Upload the encrypted package to 0G Storage with the user's wallet signer.",
        "Optionally anchor ownership or authorization on 0G Chain.",
        "Let the connected runtime provide any required model or tool secrets instead of storing them on the platform by default.",
        "Call confirm publish with the resulting storage root and any transaction metadata.",
      ],
      targets: {
        storageIndexerRpc: this.storageAdapter.config.zeroG.storageIndexerRpc,
        rpcUrl: this.storageAdapter.config.zeroG.rpcUrl,
      },
    };
  }

  async confirmPublishedAgent(agentId, input) {
    const currentAgent = await this.getAgent(agentId);
    if (!currentAgent) {
      throw new AppError("Agent not found", {
        code: "agent_not_found",
        statusCode: 404,
      });
    }

    const payload = validateConfirmPublishInput(
      input,
      currentAgent.owner,
      currentAgent.packageHash,
    );

    const agent = await this.store.transaction((state) => {
      const existing = state.agents.find((item) => item.id === agentId);
      if (!existing) {
        return null;
      }

      existing.status = "published";
      existing.publishState = payload.publishMode;
      existing.publishedBy = payload.publisher;
      existing.storageRoot = payload.storageRoot;
      existing.storageTxHash = payload.storageTxHash;
      existing.chainTxHash = payload.chainTxHash;
      existing.encryptionScheme = payload.encryptionScheme;
      existing.publishSignature = payload.signature;
      existing.publishedAt = new Date().toISOString();
      existing.updatedAt = new Date().toISOString();
      return existing;
    });

    await this.auditService.recordLocal("agent.published", agent.id, {
      packageHash: agent.packageHash,
      publisher: payload.publisher,
      storageRoot: payload.storageRoot,
      chainTxHash: payload.chainTxHash,
      publishMode: payload.publishMode,
    });

    return agent;
  }

  async publishAgentPackageFromBackend(agentId) {
    const currentAgent = await this.getAgent(agentId);
    if (!currentAgent) {
      throw new AppError("Agent not found", {
        code: "agent_not_found",
        statusCode: 404,
      });
    }

    if (!this.storageAdapter.canWriteDocuments()) {
      throw new AppError("Backend 0G Storage signer is not configured", {
        code: "zerog_storage_signer_missing",
        statusCode: 503,
      });
    }

    const upload = await this.storageAdapter.writeDocument("agent-package", currentAgent.draftPackage);
    const agent = await this.confirmPublishedAgent(agentId, {
      publisher: currentAgent.owner,
      packageHash: currentAgent.packageHash,
      publishMode: "backend_storage",
      storageRoot: upload.rootHash,
      storageTxHash: upload.txHash,
      encryptionScheme: "backend_assisted",
    });

    return { agent, upload };
  }

  async getOnchainRegistrationIntent(agentId) {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new AppError("Agent not found", {
        code: "agent_not_found",
        statusCode: 404,
      });
    }

    if (agent.status !== "published" || !agent.storageRoot) {
      throw new AppError("Agent must be published to 0G Storage before onchain registration", {
        code: "agent_not_published",
        statusCode: 409,
      });
    }

    const policyHash = keccakJson(agent.policy);
    const metadataHash = keccakJson(buildMetadataEnvelope(agent));
    const workflowHash = keccakJson(agent.workflow);
    const call = this.agentRegistryAdapter.buildRegisterAgentCall({
      agentId: agent.id,
      owner: agent.owner,
      packageHash: agent.packageHash,
      storageRoot: agent.storageRoot,
      policyHash,
      metadataHash,
      workflowHash,
    });

    return {
      agentId: agent.id,
      owner: agent.owner,
      contractAddress: call.contractAddress,
      functionName: call.functionName,
      args: call.args,
      calldata: call.calldata,
      chainId: call.chainId,
      packageHash: agent.packageHash,
      storageRoot: agent.storageRoot,
      policyHash,
      metadataHash,
      workflowHash,
      explorerAddressUrl: `${this.config.zeroG.chainExplorerBaseUrl}${call.contractAddress}`,
      recommendedFlow: [
        "Use the package owner's wallet to call registerAgent on 0G Chain.",
        "Wait for the transaction to be confirmed on ChainScan.",
        "Call the backend confirmation endpoint with the tx hash and registry address.",
      ],
    };
  }

  async confirmOnchainRegistration(agentId, input) {
    const currentAgent = await this.getAgent(agentId);
    if (!currentAgent) {
      throw new AppError("Agent not found", {
        code: "agent_not_found",
        statusCode: 404,
      });
    }

    if (!currentAgent.storageRoot) {
      throw new AppError("Agent must be published before onchain registration", {
        code: "agent_not_published",
        statusCode: 409,
      });
    }

    const payload = validateConfirmOnchainRegistrationInput(
      input,
      currentAgent.owner,
      currentAgent.packageHash,
      currentAgent.storageRoot,
    );
    if (
      this.config.zeroG.agentRegistryAddress &&
      payload.registryAddress.toLowerCase() !== this.config.zeroG.agentRegistryAddress.toLowerCase()
    ) {
      throw new AppError("registryAddress does not match the configured private agent registry", {
        code: "validation_error",
        statusCode: 400,
        details: {
          registryAddress: payload.registryAddress,
          expectedRegistryAddress: this.config.zeroG.agentRegistryAddress,
        },
      });
    }

    const policyHash = keccakJson(currentAgent.policy);
    const metadataHash = keccakJson(buildMetadataEnvelope(currentAgent));
    const workflowHash = keccakJson(currentAgent.workflow);

    const agent = await this.store.transaction((state) => {
      const existing = state.agents.find((item) => item.id === agentId);
      if (!existing) {
        return null;
      }

      existing.onchainStatus = "registered";
      existing.registryAddress = payload.registryAddress;
      existing.registrationTxHash = payload.chainTxHash;
      existing.registrationMode = payload.registrationMode;
      existing.policyHash = policyHash;
      existing.metadataHash = metadataHash;
      existing.workflowHash = workflowHash;
      existing.registeredAt = new Date().toISOString();
      existing.updatedAt = new Date().toISOString();
      return existing;
    });

    await this.auditService.recordLocal("agent.onchain_registered", agent.id, {
      registryAddress: payload.registryAddress,
      chainTxHash: payload.chainTxHash,
      packageHash: agent.packageHash,
      storageRoot: agent.storageRoot,
      policyHash,
      metadataHash,
      workflowHash,
    });

    return agent;
  }

  async listAuthorizations(agentId) {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new AppError("Agent not found", {
        code: "agent_not_found",
        statusCode: 404,
      });
    }

    return agent.authorizations || [];
  }

  async createAuthorizationIntent(agentId, input) {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new AppError("Agent not found", {
        code: "agent_not_found",
        statusCode: 404,
      });
    }

    if (agent.onchainStatus !== "registered") {
      throw new AppError("Agent must be registered onchain before authorizing usage", {
        code: "agent_not_registered",
        statusCode: 409,
      });
    }

    const payload = validateAuthorizationIntentInput(input);
    const scope = {
      accessMode: payload.accessMode,
      capabilities: payload.capabilities,
      label: payload.label,
    };
    const scopeHash = keccakJson(scope);
    const authorizationId = this.store.createId("auth");
    const call = this.agentRegistryAdapter.buildAuthorizeUsageCall({
      agentId: agent.id,
      grantee: payload.grantee,
      scopeHash,
      expiresAt: payload.expiresAt,
    });

    const authorization = await this.store.transaction((state) => {
      const existing = state.agents.find((item) => item.id === agentId);
      if (!existing) {
        return null;
      }

      existing.authorizations = existing.authorizations || [];
      const existingRecord = existing.authorizations.find(
        (item) => item.grantee.toLowerCase() === payload.grantee.toLowerCase(),
      );
      const record = existingRecord || {
        createdAt: new Date().toISOString(),
      };

      record.id = authorizationId;
      record.grantee = payload.grantee;
      record.accessMode = payload.accessMode;
      record.capabilities = payload.capabilities;
      record.label = payload.label;
      record.expiresAt = payload.expiresAt;
      record.scopeHash = scopeHash;
      record.status = "intent_prepared";
      record.contractAddress = call.contractAddress;
      record.authorizer = null;
      record.chainTxHash = null;
      record.registryAddress = null;
      record.authorizedAt = null;
      record.updatedAt = new Date().toISOString();

      if (!existingRecord) {
        existing.authorizations.push(record);
      }

      existing.updatedAt = new Date().toISOString();
      return record;
    });

    await this.auditService.recordLocal("agent.authorization_intent_created", agent.id, {
      authorizationId,
      grantee: payload.grantee,
      scopeHash,
      expiresAt: payload.expiresAt,
      accessMode: payload.accessMode,
    });

    return {
      authorization,
      intent: {
        agentId: agent.id,
        contractAddress: call.contractAddress,
        functionName: call.functionName,
        args: call.args,
        calldata: call.calldata,
        chainId: call.chainId,
        scopeHash,
        explorerAddressUrl: `${this.config.zeroG.chainExplorerBaseUrl}${call.contractAddress}`,
      },
    };
  }

  async confirmAuthorization(agentId, authorizationId, input) {
    const currentAgent = await this.getAgent(agentId);
    if (!currentAgent) {
      throw new AppError("Agent not found", {
        code: "agent_not_found",
        statusCode: 404,
      });
    }

    const currentAuthorization = (currentAgent.authorizations || []).find(
      (item) => item.id === authorizationId,
    );
    if (!currentAuthorization) {
      throw new AppError("Authorization intent not found", {
        code: "authorization_not_found",
        statusCode: 404,
      });
    }

    const payload = validateConfirmAuthorizationInput(
      input,
      currentAgent.owner,
      currentAuthorization.scopeHash,
    );
    if (
      this.config.zeroG.agentRegistryAddress &&
      payload.registryAddress.toLowerCase() !== this.config.zeroG.agentRegistryAddress.toLowerCase()
    ) {
      throw new AppError("registryAddress does not match the configured private agent registry", {
        code: "validation_error",
        statusCode: 400,
        details: {
          registryAddress: payload.registryAddress,
          expectedRegistryAddress: this.config.zeroG.agentRegistryAddress,
        },
      });
    }

    const authorization = await this.store.transaction((state) => {
      const existing = state.agents.find((item) => item.id === agentId);
      if (!existing) {
        return null;
      }

      for (const item of existing.authorizations || []) {
        if (
          item.grantee.toLowerCase() === currentAuthorization.grantee.toLowerCase() &&
          item.id !== authorizationId
        ) {
          item.status = "superseded";
          item.updatedAt = new Date().toISOString();
        }
      }

      const record = (existing.authorizations || []).find((item) => item.id === authorizationId);
      if (!record) {
        return null;
      }

      record.status = "active";
      record.authorizer = payload.authorizer;
      record.chainTxHash = payload.chainTxHash;
      record.registryAddress = payload.registryAddress;
      record.authorizedAt = new Date().toISOString();
      record.updatedAt = new Date().toISOString();
      existing.updatedAt = new Date().toISOString();
      return record;
    });

    await this.auditService.recordLocal("agent.authorization_confirmed", agentId, {
      authorizationId,
      grantee: authorization.grantee,
      scopeHash: authorization.scopeHash,
      chainTxHash: payload.chainTxHash,
      registryAddress: payload.registryAddress,
    });

    return authorization;
  }

  async getRevocationIntent(agentId, authorizationId) {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new AppError("Agent not found", {
        code: "agent_not_found",
        statusCode: 404,
      });
    }

    const authorization = (agent.authorizations || []).find((item) => item.id === authorizationId);
    if (!authorization) {
      throw new AppError("Authorization not found", {
        code: "authorization_not_found",
        statusCode: 404,
      });
    }

    if (authorization.status !== "active") {
      throw new AppError("Only active authorizations can be revoked", {
        code: "authorization_not_active",
        statusCode: 409,
      });
    }

    const call = this.agentRegistryAdapter.buildRevokeUsageCall({
      agentId: agent.id,
      grantee: authorization.grantee,
    });

    return {
      authorizationId: authorization.id,
      agentId: agent.id,
      grantee: authorization.grantee,
      contractAddress: call.contractAddress,
      functionName: call.functionName,
      args: call.args,
      calldata: call.calldata,
      chainId: call.chainId,
      explorerAddressUrl: `${this.config.zeroG.chainExplorerBaseUrl}${call.contractAddress}`,
      recommendedFlow: [
        "Use the package owner's wallet to call revokeUsage on 0G Chain.",
        "Wait for the transaction to be confirmed on ChainScan.",
        "Call the backend revocation confirmation endpoint with the tx hash and registry address.",
      ],
    };
  }

  async confirmRevocation(agentId, authorizationId, input) {
    const currentAgent = await this.getAgent(agentId);
    if (!currentAgent) {
      throw new AppError("Agent not found", {
        code: "agent_not_found",
        statusCode: 404,
      });
    }

    const currentAuthorization = (currentAgent.authorizations || []).find(
      (item) => item.id === authorizationId,
    );
    if (!currentAuthorization) {
      throw new AppError("Authorization not found", {
        code: "authorization_not_found",
        statusCode: 404,
      });
    }

    if (currentAuthorization.status !== "active") {
      throw new AppError("Only active authorizations can be revoked", {
        code: "authorization_not_active",
        statusCode: 409,
      });
    }

    const payload = validateConfirmRevocationInput(input, currentAgent.owner);
    if (
      this.config.zeroG.agentRegistryAddress &&
      payload.registryAddress.toLowerCase() !== this.config.zeroG.agentRegistryAddress.toLowerCase()
    ) {
      throw new AppError("registryAddress does not match the configured private agent registry", {
        code: "validation_error",
        statusCode: 400,
        details: {
          registryAddress: payload.registryAddress,
          expectedRegistryAddress: this.config.zeroG.agentRegistryAddress,
        },
      });
    }

    const authorization = await this.store.transaction((state) => {
      const existing = state.agents.find((item) => item.id === agentId);
      if (!existing) {
        return null;
      }

      const record = (existing.authorizations || []).find((item) => item.id === authorizationId);
      if (!record) {
        return null;
      }

      record.status = "revoked";
      record.revoker = payload.revoker;
      record.revocationTxHash = payload.chainTxHash;
      record.revokedAt = new Date().toISOString();
      record.updatedAt = new Date().toISOString();
      existing.updatedAt = new Date().toISOString();
      return record;
    });

    await this.auditService.recordLocal("agent.authorization_revoked", agentId, {
      authorizationId,
      grantee: authorization.grantee,
      chainTxHash: payload.chainTxHash,
      registryAddress: payload.registryAddress,
    });

    return authorization;
  }

  async getExportManifest(agentId, options = {}) {
    const agent = await this.getAgent(agentId);
    if (!agent) {
      throw new AppError("Agent not found", {
        code: "agent_not_found",
        statusCode: 404,
      });
    }

    const authorizations = agent.authorizations || [];
    const activeAuthorizations = authorizations.filter((authorization) => authorization.status === "active");
    const baseUrl = options.baseUrl || "";
    const mcpSlug = toMcpSlug(agent.name);
    const mcpEndpoint = joinUrl(baseUrl, `/api/agents/${agent.id}/mcp`);

    return {
      manifestVersion: "2026-04-18",
      exportedAt: new Date().toISOString(),
      agent: {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        owner: agent.owner,
        status: agent.status,
        templateId: agent.templateId,
        tracks: agent.tracks,
        packageHash: agent.packageHash,
        privacy: agent.privacy,
        workflow: agent.workflow,
      },
      storage: {
        storageRoot: agent.storageRoot || null,
        storageTxHash: agent.storageTxHash || null,
      },
      onchain: {
        status: agent.onchainStatus,
        registryAddress: agent.registryAddress || this.config.zeroG.agentRegistryAddress || null,
        registrationTxHash: agent.registrationTxHash || null,
        activeAuthorizationCount: activeAuthorizations.length,
      },
      runtime: {
        ownershipModel: "runtime_owned_secrets",
        targets: agent.draftPackage?.runtimeTargets || [],
        requiredSecrets: agent.draftPackage?.requiredSecrets || [],
        recommendedCredentialSource: "user_runtime",
        instructions: [
          "Keep model and tool API keys in the connected runtime or user environment by default.",
          "Use workspace-scoped or platform-managed secrets only for explicit hosted-runtime deployments.",
          "Record which secret classes were supplied for each run without persisting raw secret values.",
        ],
      },
      api: {
        getAgent: joinUrl(baseUrl, `/api/agents/${agent.id}`),
        listRuns: joinUrl(baseUrl, `/api/agents/${agent.id}/runs`),
        startRun: joinUrl(baseUrl, `/api/agents/${agent.id}/runs`),
        authorizations: joinUrl(baseUrl, `/api/agents/${agent.id}/authorizations`),
      },
      mcp: {
        serverType: "agent_bound_streamable_http",
        endpoint: mcpEndpoint,
        readyMade: true,
        clientConfig: {
          mcpServers: {
            [`${mcpSlug}-mcp`]: {
              transport: "streamable_http",
              url: mcpEndpoint,
            },
          },
        },
        secretInjection: {
          supported: true,
          ownershipModel: "hosted_runtime_or_runtime_owned_secrets",
          requiredSecrets: [],
        },
        toolCalls: [
          {
            name: `${mcpSlug}.run`,
            arguments: {
              objective: `Run ${agent.name} and return a concise private workflow summary.`,
              audience: "operator",
              tone: "concise",
            },
          },
          {
            name: `${mcpSlug}.summarize`,
            arguments: {
              focus: "workflow, storage proof, registry proof, and recommended next actions",
              audience: "operator",
            },
          },
          {
            name: `${mcpSlug}.evidence`,
            arguments: {},
          },
        ],
        resources: [
          `private-agent-studio://${agent.id}/manifest`,
          `private-agent-studio://${agent.id}/proof`,
          `private-agent-studio://${agent.id}/runbook`,
        ],
        prompts: [`${mcpSlug}.private_brief`],
      },
      openclaw: {
        integrationMode: "agent_bound_mcp_or_hosted_api",
        baseUrl,
        manifestUrl: joinUrl(baseUrl, `/api/agents/${agent.id}/export-manifest`),
        runEndpoint: joinUrl(baseUrl, `/api/agents/${agent.id}/runs`),
        mcpEndpoint,
        mcpServerName: `${mcpSlug}-mcp`,
        preferredExecutionMode: "auto",
        rationale:
          "Use the per-agent MCP endpoint when OpenClaw or another MCP client should invoke this exact published agent. Use the hosted API when the client only supports HTTP actions.",
        hostedApiProfile: {
          credentialSource: "platform_managed",
          executionMode: "auto",
          requiredRuntimeSecrets: [],
        },
        localMcpDeveloperAdapter: {
          availableInRepository: true,
          transport: "stdio",
          command: "npm run mcp",
          note: "Only use this when running the repository locally as an MCP server. The hosted API is the default product handoff.",
        },
      },
      activeAuthorizations: activeAuthorizations.map((authorization) => ({
        id: authorization.id,
        grantee: authorization.grantee,
        accessMode: authorization.accessMode,
        capabilities: authorization.capabilities,
        label: authorization.label,
        expiresAt: authorization.expiresAt,
        scopeHash: authorization.scopeHash,
        chainTxHash: authorization.chainTxHash || null,
      })),
    };
  }
}
