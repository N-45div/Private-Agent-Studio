import { validateVaultPolicy, validateVaultPolicyPatch } from "../lib/validation.js";

function withDefaults(input = {}) {
  const treasury = input.treasury || {};
  const policy = input.policy || {};

  return {
    name: input.name,
    owner: input.owner,
    agentId: input.agentId || "agentvault-default",
    executionMode: input.executionMode || "hybrid",
    treasury: {
      balances: treasury.balances || { USDC: 0 },
      deployedCapitalUsd: treasury.deployedCapitalUsd || 0,
    },
    policy: {
      ...validateVaultPolicy({
        reserveRatio: policy.reserveRatio ?? 0.3,
        maxTradeUsd: policy.maxTradeUsd ?? 5000,
        autoExecuteThresholdUsd: policy.autoExecuteThresholdUsd ?? 1000,
        dailySpendLimitUsd: policy.dailySpendLimitUsd ?? 10000,
        allowedTokens: policy.allowedTokens || ["USDC"],
        allowedProtocols: policy.allowedProtocols || ["Aave"],
      }),
    },
  };
}

export class VaultService {
  constructor(store, auditService, storageAdapter, chainAdapter) {
    this.store = store;
    this.auditService = auditService;
    this.storageAdapter = storageAdapter;
    this.chainAdapter = chainAdapter;
  }

  async listVaults() {
    const state = await this.store.readState();
    return state.vaults;
  }

  async getVault(vaultId) {
    const state = await this.store.readState();
    return state.vaults.find((vault) => vault.id === vaultId) || null;
  }

  async createVault(input) {
    if (!input?.name || !input?.owner) {
      throw new Error("Vault requires name and owner");
    }

    const payload = withDefaults(input);
    const vaultId = this.store.createId("vault");
    const metadataDocument = await this.storageAdapter.writeDocument("vault-metadata", {
      vaultId,
      ...payload,
    });
    const chainRecord = await this.chainAdapter.createVault({
      vaultId,
      owner: payload.owner,
      agentId: payload.agentId,
      policy: payload.policy,
      metadataRoot: metadataDocument.rootHash,
    });

    const vault = await this.store.transaction((state) => {
      const nextVault = {
        id: vaultId,
        ...payload,
        metadataRoot: metadataDocument.rootHash,
        metadataTxHash: metadataDocument.txHash,
        policyAnchorTxHash: chainRecord.txHash,
        policyHash: chainRecord.policyHash,
        explorerUrl: chainRecord.explorerUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.vaults.push(nextVault);
      return nextVault;
    });

    await this.auditService.record("vault.created", vault.id, {
      name: vault.name,
      owner: vault.owner,
      policy: vault.policy,
      metadataRoot: vault.metadataRoot,
      chainTxHash: vault.policyAnchorTxHash,
    });

    return vault;
  }

  async updatePolicy(vaultId, policyPatch) {
    const currentVault = await this.getVault(vaultId);
    if (!currentVault) {
      return null;
    }

    const nextPolicy = validateVaultPolicyPatch(policyPatch, currentVault.policy);
    const metadataDocument = await this.storageAdapter.writeDocument("vault-policy", {
      vaultId,
      policy: nextPolicy,
    });
    const chainRecord = await this.chainAdapter.updatePolicy({
      vaultId,
      policy: nextPolicy,
      metadataRoot: metadataDocument.rootHash,
    });

    const vault = await this.store.transaction((state) => {
      const existing = state.vaults.find((item) => item.id === vaultId);

      if (!existing) {
        return null;
      }

      existing.policy = nextPolicy;
      existing.policyHash = chainRecord.policyHash;
      existing.metadataRoot = metadataDocument.rootHash;
      existing.metadataTxHash = metadataDocument.txHash;
      existing.policyAnchorTxHash = chainRecord.txHash;
      existing.explorerUrl = chainRecord.explorerUrl;
      existing.updatedAt = new Date().toISOString();
      return existing;
    });

    if (!vault) {
      return null;
    }

    await this.auditService.record("vault.policy_updated", vault.id, {
      policy: vault.policy,
      metadataRoot: vault.metadataRoot,
      chainTxHash: vault.policyAnchorTxHash,
    });

    return vault;
  }
}
