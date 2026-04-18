export class ProposalService {
  constructor(store, strategyService, riskService, auditService, storageAdapter, chainAdapter) {
    this.store = store;
    this.strategyService = strategyService;
    this.riskService = riskService;
    this.auditService = auditService;
    this.storageAdapter = storageAdapter;
    this.chainAdapter = chainAdapter;
  }

  async generate(vault, input = {}) {
    const draft = await this.strategyService.generateProposal(vault, input);
    const risk = this.riskService.evaluate(vault, draft);
    const proposalId = this.store.createId("proposal");
    const proposalPayload = {
      vaultId: vault.id,
      draft,
      risk,
    };
    const document = await this.storageAdapter.writeDocument("proposal", proposalPayload);
    const chainRecord = await this.chainAdapter.recordProposal({
      vaultId: vault.id,
      proposalId,
      proposal: proposalPayload,
      storageRoot: document.rootHash,
    });

    const proposal = await this.store.transaction((state) => {
      const nextProposal = {
        id: proposalId,
        vaultId: vault.id,
        ...draft,
        risk,
        storageRoot: document.rootHash,
        storageTxHash: document.txHash,
        proposalHash: chainRecord.proposalHash,
        chainTxHash: chainRecord.txHash,
        explorerUrl: chainRecord.explorerUrl,
        createdAt: new Date().toISOString(),
        approvedAt: null,
        executedAt: null,
      };

      state.proposals.push(nextProposal);
      return nextProposal;
    });

    await this.auditService.record("proposal.generated", vault.id, {
      proposalId: proposal.id,
      actionType: proposal.actionType,
      riskDecision: proposal.risk.decision,
      chainTxHash: proposal.chainTxHash,
    });

    return proposal;
  }

  async getProposal(proposalId) {
    const state = await this.store.readState();
    return state.proposals.find((proposal) => proposal.id === proposalId) || null;
  }

  async approve(proposalId, approval = {}) {
    const proposal = await this.store.transaction((state) => {
      const existing = state.proposals.find((item) => item.id === proposalId);
      if (!existing) {
        return null;
      }

      existing.approval = {
        approvedBy: approval.approvedBy || "operator",
        notes: approval.notes || "",
      };
      existing.approvedAt = new Date().toISOString();
      existing.status = "approved";
      return existing;
    });

    if (!proposal) {
      return null;
    }

    await this.auditService.record("proposal.approved", proposal.vaultId, {
      proposalId: proposal.id,
      approvedBy: proposal.approval.approvedBy,
    });

    return proposal;
  }
}
