import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { FileStore } from "../src/store/fileStore.js";
import { ZeroGComputeAdapter } from "../src/adapters/zeroGComputeAdapter.js";
import { WorkflowRunService } from "../src/services/workflowRunService.js";
import { TemplateService } from "../src/services/templateService.js";
import { AuditService } from "../src/services/auditService.js";
import { StudioAgentService } from "../src/services/studioAgentService.js";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createTempStore() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "private-agent-studio-"));
  return new FileStore(path.join(directory, "state.json"));
}

function createConfig(overrides = {}) {
  return {
    zeroG: {
      network: "testnet",
      chainId: 16602,
      rpcUrl: "https://evmrpc-testnet.0g.ai",
      privateKey: "",
      explorerBaseUrl: "https://chainscan-galileo.0g.ai/tx/",
      chainExplorerBaseUrl: "https://chainscan-galileo.0g.ai/address/",
      registryAddress: "",
      agentRegistryAddress: "0xd06ea0b9AD8935df0e823555F0433604B880711D",
      storageIndexerRpc: "https://indexer-storage-testnet-turbo.0g.ai",
      computeProvider: "",
      computeFallbackProviders: [],
      computeApiKey: "",
      computeApiBase: "",
      computeModel: "",
      computeRequireTee: true,
      ...overrides,
    },
  };
}

test("FileStore serializes concurrent transactions without losing updates", async () => {
  const store = await createTempStore();

  await Promise.all([
    store.transaction(async (state) => {
      await delay(50);
      state.agents.push({ id: "agent_one" });
      return null;
    }),
    store.transaction(async (state) => {
      state.runs.push({ id: "run_one" });
      return null;
    }),
  ]);

  const state = await store.readState();
  assert.deepEqual(state.agents.map((item) => item.id), ["agent_one"]);
  assert.deepEqual(state.runs.map((item) => item.id), ["run_one"]);
});

test("ZeroGComputeAdapter auto mode only selects direct API when it is fully ready", () => {
  const partialDirect = new ZeroGComputeAdapter(
    createConfig({
      computeApiKey: "app-sk-test",
      computeApiBase: "https://compute.0g.ai/v1",
      computeModel: "glm-5",
      computeRequireTee: true,
    }),
  );
  assert.equal(partialDirect.resolveExecutionMode("auto"), "zerog_broker");
  assert.equal(partialDirect.isDirectApiReady(), false);

  const readyDirect = new ZeroGComputeAdapter(
    createConfig({
      computeApiKey: "app-sk-test",
      computeApiBase: "https://compute.0g.ai/v1",
      computeModel: "glm-5",
      computeRequireTee: false,
    }),
  );
  assert.equal(readyDirect.resolveExecutionMode("auto"), "zerog_direct_api");
  assert.equal(readyDirect.isDirectApiReady(), true);
});

test("WorkflowRunService completes runs without a backend signer by persisting traces locally", async () => {
  const store = await createTempStore();
  const auditService = new AuditService(store, {
    canWriteDocuments() {
      return false;
    },
  });
  const templateService = new TemplateService();
  let invocationCount = 0;
  const computeAdapter = {
    async runStructuredJsonPrompt(input) {
      invocationCount += 1;
      if (invocationCount === 1) {
        return {
          summary: "plan",
          tasks: [{ id: "task-1", ownerRole: "researcher", objective: "analyze" }],
          risks: [],
          inference: {
            executionMode: input.executionMode,
            provider: "stub",
            model: "stub-model",
          },
        };
      }

      if (invocationCount === 2) {
        return {
          summary: "research",
          findings: ["finding"],
          nextAction: "finalize",
          inference: {
            executionMode: input.executionMode,
            provider: "stub",
            model: "stub-model",
          },
        };
      }

      return {
        finalOutput: "final answer",
        suggestedActions: ["ship"],
        approvalRequired: false,
        inference: {
          executionMode: input.executionMode,
          provider: "stub",
          model: "stub-model",
        },
      };
    },
  };
  const storageAdapter = {
    canWriteDocuments() {
      return false;
    },
  };
  const service = new WorkflowRunService(
    store,
    computeAdapter,
    storageAdapter,
    auditService,
    templateService,
  );

  const agent = {
    id: "agent_local_only",
    owner: "0x1234567890123456789012345678901234567890",
    name: "Research Agent",
    templateId: "private-research-copilot",
    privacy: { visibility: "private" },
    policy: {
      approvalMode: "manual",
      allowDelegation: true,
      maxStepsPerRun: 3,
    },
    knowledge: { sources: [] },
    status: "draft",
  };

  const run = await service.startRun(agent, {
    objective: "Summarize the latest private memo",
    runtime: {
      credentialSource: "user_runtime",
      executionMode: "auto",
      providedSecretKeys: [],
    },
  });

  assert.equal(run.status, "completed");
  assert.equal(run.tracePersistence, "local_only");
  assert.equal(run.storageRoot, null);
  assert.equal(run.storageTxHash, null);
  assert.equal(run.compute.requestedExecutionMode, "auto");

  const state = await store.readState();
  assert.equal(state.auditEvents.length, 1);
  assert.equal(state.auditEvents[0].type, "run.completed");
  assert.equal(state.auditEvents[0].storageRoot, null);
});

test("StudioAgentService keeps one active authorization record per grantee", async () => {
  const store = await createTempStore();
  const storageAdapter = {
    config: {
      zeroG: {
        storageIndexerRpc: "https://indexer-storage-testnet-turbo.0g.ai",
        rpcUrl: "https://evmrpc-testnet.0g.ai",
      },
    },
    canWriteDocuments() {
      return false;
    },
  };
  const templateService = new TemplateService();
  const auditService = new AuditService(store, storageAdapter);
  const service = new StudioAgentService(
    store,
    createConfig(),
    storageAdapter,
    {
      buildAuthorizeUsageCall({ agentId, grantee, scopeHash, expiresAt }) {
        return {
          contractAddress: "0xd06ea0b9AD8935df0e823555F0433604B880711D",
          functionName: "authorizeUsage",
          args: [agentId, grantee, scopeHash, expiresAt],
          calldata: "0x1234",
          chainId: 16602,
        };
      },
      buildRegisterAgentCall() {
        throw new Error("not needed in this test");
      },
    },
    auditService,
    templateService,
  );

  const agent = await service.createAgent({
    name: "DAO Ops",
    owner: "0x1234567890123456789012345678901234567890",
    templateId: "dao-ops-copilot",
    collaborators: [],
    privacy: {
      visibility: "private",
      dataSensitivity: "restricted",
      exportability: "owner_authorized",
    },
    policy: {
      approvalMode: "manual",
      allowDelegation: true,
      maxStepsPerRun: 4,
    },
    knowledge: {
      sources: [],
    },
  });

  await store.transaction((state) => {
    const current = state.agents.find((item) => item.id === agent.id);
    current.status = "published";
    current.storageRoot = `0x${"1".repeat(64)}`;
    current.onchainStatus = "registered";
    return null;
  });

  await service.createAuthorizationIntent(agent.id, {
    grantee: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    label: "OpenClaw runtime",
    accessMode: "licensed_mcp",
    capabilities: ["run.workflow"],
    expiresAt: 1893456000,
  });

  const secondIntent = await service.createAuthorizationIntent(agent.id, {
    grantee: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    label: "OpenClaw runtime",
    accessMode: "licensed_mcp",
    capabilities: ["run.workflow", "read.summary"],
    expiresAt: 1893457000,
  });

  const intentAuthorizations = await service.listAuthorizations(agent.id);
  assert.equal(intentAuthorizations.length, 1);
  assert.deepEqual(intentAuthorizations[0].capabilities, ["run.workflow", "read.summary"]);

  const confirmed = await service.confirmAuthorization(
    agent.id,
    secondIntent.authorization.id,
    {
      authorizer: agent.owner,
      scopeHash: secondIntent.authorization.scopeHash,
      chainTxHash: `0x${"2".repeat(64)}`,
      registryAddress: "0xd06ea0b9AD8935df0e823555F0433604B880711D",
    },
  );

  assert.equal(confirmed.status, "active");

  const activeAuthorizations = await service.listAuthorizations(agent.id);
  assert.equal(activeAuthorizations.length, 1);
  assert.equal(activeAuthorizations[0].status, "active");
  assert.deepEqual(activeAuthorizations[0].capabilities, ["run.workflow", "read.summary"]);
});
