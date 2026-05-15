import { config } from "../config.js";
import { FileStore } from "../store/fileStore.js";
import { ZeroGStateStore } from "../store/zeroGStateStore.js";
import { ZeroGSnapshotStateStore } from "../store/zeroGSnapshotStateStore.js";
import { ZeroGStorageAdapter } from "../adapters/zeroGStorageAdapter.js";
import { ZeroGChainAdapter } from "../adapters/zeroGChainAdapter.js";
import { ZeroGAgentRegistryAdapter } from "../adapters/zeroGAgentRegistryAdapter.js";
import { ZeroGComputeAdapter } from "../adapters/zeroGComputeAdapter.js";
import { MarketDataAdapter } from "../adapters/marketDataAdapter.js";
import { AuditService } from "./auditService.js";
import { TemplateService } from "./templateService.js";
import { StudioAgentService } from "./studioAgentService.js";
import { WorkflowRunService } from "./workflowRunService.js";
import { VaultService } from "./vaultService.js";
import { StrategyService } from "./strategyService.js";
import { RiskService } from "./riskService.js";
import { ProposalService } from "./proposalService.js";
import { ExecutionService } from "./executionService.js";

export function createServiceContainer() {
  const fileStore = new FileStore(config.dataFile);
  const storageAdapter = new ZeroGStorageAdapter(config);
  const chainAdapter = new ZeroGChainAdapter(config);
  const agentRegistryAdapter = new ZeroGAgentRegistryAdapter(config);
  const store = config.stateStore === "zerog_kv"
    ? new ZeroGStateStore(config, fileStore)
    : config.stateStore === "zerog_snapshot"
      ? new ZeroGSnapshotStateStore(config, fileStore, storageAdapter, agentRegistryAdapter)
      : fileStore;
  const computeAdapter = new ZeroGComputeAdapter(config);
  const marketDataAdapter = new MarketDataAdapter();

  const templateService = new TemplateService();
  const auditService = new AuditService(store, storageAdapter);
  const studioAgentService = new StudioAgentService(
    store,
    config,
    storageAdapter,
    agentRegistryAdapter,
    auditService,
    templateService,
  );
  const workflowRunService = new WorkflowRunService(
    store,
    computeAdapter,
    storageAdapter,
    auditService,
    templateService,
  );
  const vaultService = new VaultService(store, auditService, storageAdapter, chainAdapter);
  const strategyService = new StrategyService(marketDataAdapter, computeAdapter);
  const riskService = new RiskService();
  const proposalService = new ProposalService(
    store,
    strategyService,
    riskService,
    auditService,
    storageAdapter,
    chainAdapter,
  );
  const executionService = new ExecutionService(
    store,
    chainAdapter,
    storageAdapter,
    auditService,
  );

  return {
    config,
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
  };
}
