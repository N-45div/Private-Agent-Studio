export const privateAgentRegistryAbi = [
  "function registerAgent(string agentId, address agentOwner, bytes32 packageHash, bytes32 storageRoot, bytes32 policyHash, bytes32 metadataHash, bytes32 workflowHash) external",
  "function updateAgent(string agentId, bytes32 packageHash, bytes32 storageRoot, bytes32 policyHash, bytes32 metadataHash, bytes32 workflowHash) external",
  "function authorizeUsage(string agentId, address grantee, bytes32 scopeHash, uint64 expiresAt) external",
  "function revokeUsage(string agentId, address grantee) external",
  "function getAgent(string agentId) external view returns (tuple(address agentOwner, bytes32 latestPackageHash, bytes32 latestStorageRoot, bytes32 latestPolicyHash, bytes32 latestMetadataHash, bytes32 latestWorkflowHash, uint64 createdAt, uint64 updatedAt, bool exists))",
  "function getAuthorization(string agentId, address grantee) external view returns (tuple(address grantee, bytes32 scopeHash, uint64 expiresAt, uint64 updatedAt, bool active))",
];
