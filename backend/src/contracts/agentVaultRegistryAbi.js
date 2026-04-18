export const agentVaultRegistryAbi = [
  "function createVault(string vaultId, address vaultOwner, string agentId, bytes32 policyHash, bytes32 metadataRoot) external",
  "function updatePolicy(string vaultId, bytes32 policyHash, bytes32 metadataRoot) external",
  "function recordProposal(string vaultId, string proposalId, bytes32 proposalHash, bytes32 storageRoot) external",
  "function recordExecution(string vaultId, string proposalId, bytes32 executionHash, bytes32 storageRoot) external",
  "function getVault(string vaultId) external view returns (tuple(address vaultOwner, bytes32 latestPolicyHash, bytes32 latestMetadataRoot, string agentId, uint64 createdAt, uint64 updatedAt, bool exists))",
];
