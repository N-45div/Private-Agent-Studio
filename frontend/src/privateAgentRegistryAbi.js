export const privateAgentRegistryAbi = [
  "function registerAgent(string agentId, address agentOwner, bytes32 packageHash, bytes32 storageRoot, bytes32 policyHash, bytes32 metadataHash, bytes32 workflowHash) external",
  "function authorizeUsage(string agentId, address grantee, bytes32 scopeHash, uint64 expiresAt) external",
  "function revokeUsage(string agentId, address grantee) external",
];
