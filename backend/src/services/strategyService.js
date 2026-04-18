export class StrategyService {
  constructor(marketDataAdapter, computeAdapter) {
    this.marketDataAdapter = marketDataAdapter;
    this.computeAdapter = computeAdapter;
  }

  async generateProposal(vault, input = {}) {
    const snapshot = await this.marketDataAdapter.getSnapshot(input.marketData);
    const aiDecision = await this.computeAdapter.generateTreasuryDecision({
      vault,
      marketContext: snapshot,
    });

    return this.normalizeDecision(vault, snapshot, aiDecision);
  }

  normalizeDecision(vault, snapshot, aiDecision) {
    const usdcBalance = Number(vault.treasury.balances.USDC || 0);
    const reserveTargetUsd = usdcBalance * Number(vault.policy.reserveRatio || 0);
    const deployableUsd = Math.max(usdcBalance - reserveTargetUsd, 0);
    const policyCapUsd = Math.min(
      Number(vault.policy.maxTradeUsd || 0),
      Number(vault.policy.dailySpendLimitUsd || 0),
    );
    const requestedAmountUsd = Math.max(Number(aiDecision.amountUsd || 0), 0);
    const amountUsd = Math.min(requestedAmountUsd, deployableUsd, policyCapUsd);
    const targetProtocol = aiDecision.targetProtocol || null;
    const token = aiDecision.token || "USDC";

    if (
      aiDecision.actionType !== "deploy_to_yield" ||
      amountUsd <= 0 ||
      !targetProtocol ||
      !vault.policy.allowedProtocols.includes(targetProtocol)
    ) {
      return {
        actionType: "monitor_only",
        status: "proposed",
        amountUsd: 0,
        token: "USDC",
        targetProtocol: null,
        reasoning: aiDecision.reasoning || "Model returned no executable action.",
        snapshot,
        inference: aiDecision.inference,
      };
    }

    return {
      actionType: "deploy_to_yield",
      status: "proposed",
      amountUsd: Number(amountUsd.toFixed(2)),
      token,
      targetProtocol,
      reasoning: aiDecision.reasoning,
      snapshot,
      inference: aiDecision.inference,
    };
  }
}
