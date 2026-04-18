export class RiskService {
  evaluate(vault, proposal) {
    const issues = [];

    if (
      proposal.token &&
      !vault.policy.allowedTokens.includes(proposal.token) &&
      proposal.actionType !== "monitor_only"
    ) {
      issues.push(`Token ${proposal.token} is not allowed by policy.`);
    }

    if (
      proposal.targetProtocol &&
      !vault.policy.allowedProtocols.includes(proposal.targetProtocol)
    ) {
      issues.push(`Protocol ${proposal.targetProtocol} is not approved.`);
    }

    if (proposal.amountUsd > vault.policy.maxTradeUsd) {
      issues.push(
        `Proposal amount ${proposal.amountUsd} exceeds max trade ${vault.policy.maxTradeUsd}.`,
      );
    }

    if (proposal.amountUsd > vault.policy.dailySpendLimitUsd) {
      issues.push(
        `Proposal amount ${proposal.amountUsd} exceeds daily spend limit ${vault.policy.dailySpendLimitUsd}.`,
      );
    }

    const requiresApproval =
      proposal.amountUsd > vault.policy.autoExecuteThresholdUsd ||
      proposal.actionType === "monitor_only";

    return {
      issues,
      riskScore: Math.min(100, 20 + issues.length * 30 + proposal.amountUsd / 250),
      decision:
        issues.length > 0
          ? "blocked"
          : requiresApproval
            ? "needs_approval"
            : "auto_executable",
      requiresApproval,
    };
  }
}
