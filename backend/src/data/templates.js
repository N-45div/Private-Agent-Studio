export const studioTemplates = [
  {
    id: "private-research-copilot",
    name: "Private Research Copilot",
    category: "research",
    tracks: ["track_1", "track_5", "track_3"],
    summary:
      "A private research workflow that ingests confidential documents, delegates analysis, and returns structured answers.",
    roles: [
      {
        id: "planner",
        roleType: "planner",
        purpose: "Breaks an objective into a secure execution plan.",
      },
      {
        id: "researcher",
        roleType: "specialist",
        purpose: "Analyzes private knowledge sources and drafts findings.",
      },
      {
        id: "executor",
        roleType: "executor",
        purpose: "Formats the final answer and enforces output policy.",
      },
    ],
    tools: ["knowledge_search", "summarization", "structured_output"],
    requiredSecrets: [
      {
        key: "ZEROG_COMPUTE_API_KEY",
        label: "0G Compute API Key",
        purpose: "Runs private inference through 0G Compute direct API mode when broker mode is unavailable.",
        requiredFor: ["zerog_direct_api"],
        recommendedSource: "user_runtime",
      },
    ],
    runtimeTargets: ["openclaw_mcp", "api_client", "hosted_backend"],
  },
  {
    id: "treasury-ops-copilot",
    name: "Treasury Ops Copilot",
    category: "finance",
    tracks: ["track_1", "track_5", "track_3"],
    summary:
      "A private treasury workflow that analyzes balances and drafts policy-aware recommendations for operators.",
    roles: [
      {
        id: "planner",
        roleType: "planner",
        purpose: "Converts treasury goals into bounded tasks.",
      },
      {
        id: "analyst",
        roleType: "specialist",
        purpose: "Reviews balances, policy, and risk context.",
      },
      {
        id: "executor",
        roleType: "executor",
        purpose: "Returns a final recommendation or action summary.",
      },
    ],
    tools: ["policy_check", "balance_analysis", "structured_output"],
    requiredSecrets: [
      {
        key: "ZEROG_COMPUTE_API_KEY",
        label: "0G Compute API Key",
        purpose: "Runs private treasury analysis through 0G Compute direct API mode.",
        requiredFor: ["zerog_direct_api"],
        recommendedSource: "user_runtime",
      },
      {
        key: "WALLET_RPC_URL",
        label: "Wallet or RPC Endpoint",
        purpose: "Lets an external runtime inspect balances or prepare onchain actions with the user's own connectivity.",
        requiredFor: ["external_runtime_tools"],
        recommendedSource: "user_runtime",
      },
    ],
    runtimeTargets: ["openclaw_mcp", "api_client", "hosted_backend"],
  },
  {
    id: "dao-ops-copilot",
    name: "DAO Ops Copilot",
    category: "operations",
    tracks: ["track_1", "track_5", "track_3"],
    summary:
      "A private workflow for governance summaries, contributor updates, and policy-gated operational tasks.",
    roles: [
      {
        id: "planner",
        roleType: "planner",
        purpose: "Plans a governance or ops workflow.",
      },
      {
        id: "operator",
        roleType: "specialist",
        purpose: "Produces the working draft or summary.",
      },
      {
        id: "executor",
        roleType: "executor",
        purpose: "Prepares the final output for the user.",
      },
    ],
    tools: ["document_review", "task_planning", "structured_output"],
    requiredSecrets: [
      {
        key: "ZEROG_COMPUTE_API_KEY",
        label: "0G Compute API Key",
        purpose: "Runs private planning and drafting through 0G Compute direct API mode.",
        requiredFor: ["zerog_direct_api"],
        recommendedSource: "user_runtime",
      },
    ],
    runtimeTargets: ["openclaw_mcp", "api_client", "hosted_backend"],
  },
];
