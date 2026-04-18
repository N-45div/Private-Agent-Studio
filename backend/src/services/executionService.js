import { AppError } from "../lib/errors.js";

export class ExecutionService {
  constructor(store, chainAdapter, storageAdapter, auditService) {
    this.store = store;
    this.chainAdapter = chainAdapter;
    this.storageAdapter = storageAdapter;
    this.auditService = auditService;
  }

  async execute(vault, proposal) {
    if (proposal.risk.decision === "blocked") {
      throw new AppError("Blocked proposals cannot be executed", {
        code: "proposal_blocked",
        statusCode: 409,
      });
    }

    if (proposal.risk.requiresApproval && !proposal.approvedAt) {
      throw new AppError("Proposal requires approval before execution", {
        code: "proposal_requires_approval",
        statusCode: 409,
      });
    }

    await this.store.transaction((state) => {
      const existingProposal = state.proposals.find((item) => item.id === proposal.id);
      if (!existingProposal) {
        throw new AppError("Proposal not found", {
          code: "proposal_not_found",
          statusCode: 404,
        });
      }

      if (existingProposal.executedAt) {
        throw new AppError("Proposal has already been executed", {
          code: "proposal_already_executed",
          statusCode: 409,
        });
      }

      if (existingProposal.executionInProgressAt) {
        throw new AppError("Proposal execution is already in progress", {
          code: "proposal_execution_in_progress",
          statusCode: 409,
        });
      }

      existingProposal.executionInProgressAt = new Date().toISOString();
      return existingProposal.id;
    });

    const executionPlan = {
      vaultId: vault.id,
      proposalId: proposal.id,
      actionType: proposal.actionType,
      amountUsd: proposal.amountUsd,
      token: proposal.token,
      targetProtocol: proposal.targetProtocol,
    };

    try {
      const storageReceipt = await this.storageAdapter.writeDocument("execution", {
        executionPlan,
      });
      const chainReceipt = await this.chainAdapter.recordExecution({
        vaultId: vault.id,
        proposalId: proposal.id,
        execution: executionPlan,
        storageRoot: storageReceipt.rootHash,
      });

      const execution = await this.store.transaction((state) => {
        const existingProposal = state.proposals.find((item) => item.id === proposal.id);
        const existingVault = state.vaults.find((item) => item.id === vault.id);

        if (!existingProposal || !existingVault) {
          return null;
        }

        existingProposal.executedAt = new Date().toISOString();
        existingProposal.executionInProgressAt = null;

        if (proposal.actionType === "deploy_to_yield") {
          existingVault.treasury.balances.USDC = Number(
            (Number(existingVault.treasury.balances.USDC || 0) - proposal.amountUsd).toFixed(2),
          );
          existingVault.treasury.deployedCapitalUsd = Number(
            (Number(existingVault.treasury.deployedCapitalUsd || 0) + proposal.amountUsd).toFixed(2),
          );
        }

        existingVault.updatedAt = new Date().toISOString();

        const nextExecution = {
          id: this.store.createId("execution"),
          vaultId: vault.id,
          proposalId: proposal.id,
          status: "submitted",
          txHash: chainReceipt.txHash,
          explorerUrl: chainReceipt.explorerUrl,
          executionHash: chainReceipt.executionHash,
          storageRoot: storageReceipt.rootHash,
          storageTxHash: storageReceipt.txHash,
          createdAt: new Date().toISOString(),
        };

        state.executions.push(nextExecution);
        return nextExecution;
      });

      if (!execution) {
        throw new AppError("Execution could not be persisted", {
          code: "execution_persist_failed",
          statusCode: 500,
        });
      }

      await this.auditService.record("proposal.executed", vault.id, {
        proposalId: proposal.id,
        executionId: execution.id,
        txHash: execution.txHash,
        storageRoot: execution.storageRoot,
      });

      return execution;
    } catch (error) {
      await this.store.transaction((state) => {
        const existingProposal = state.proposals.find((item) => item.id === proposal.id);
        if (existingProposal) {
          existingProposal.executionInProgressAt = null;
        }
        return existingProposal || null;
      });
      throw error;
    }
  }
}
