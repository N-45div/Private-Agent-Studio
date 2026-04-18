// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AgentVaultRegistry {
    address public owner;
    mapping(address => bool) public operators;

    struct VaultRecord {
        address vaultOwner;
        bytes32 latestPolicyHash;
        bytes32 latestMetadataRoot;
        string agentId;
        uint64 createdAt;
        uint64 updatedAt;
        bool exists;
    }

    mapping(bytes32 => VaultRecord) private vaults;
    mapping(bytes32 => bytes32) public latestProposalHashes;
    mapping(bytes32 => bytes32) public latestExecutionHashes;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OperatorUpdated(address indexed operator, bool allowed);
    event VaultCreated(
        bytes32 indexed vaultKey,
        string vaultId,
        address indexed vaultOwner,
        string agentId,
        bytes32 policyHash,
        bytes32 metadataRoot
    );
    event PolicyUpdated(
        bytes32 indexed vaultKey,
        string vaultId,
        bytes32 policyHash,
        bytes32 metadataRoot
    );
    event ProposalRecorded(
        bytes32 indexed vaultKey,
        string vaultId,
        bytes32 indexed proposalKey,
        string proposalId,
        bytes32 proposalHash,
        bytes32 storageRoot
    );
    event ExecutionRecorded(
        bytes32 indexed vaultKey,
        string vaultId,
        bytes32 indexed proposalKey,
        string proposalId,
        bytes32 executionHash,
        bytes32 storageRoot
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyOperator() {
        require(operators[msg.sender], "Only operator");
        _;
    }

    modifier onlyAuthorizedVaultWriter(address vaultOwner) {
        require(msg.sender == vaultOwner || operators[msg.sender], "Not authorized");
        _;
    }

    constructor(address initialOperator) {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), owner);

        if (initialOperator != address(0)) {
            operators[initialOperator] = true;
            emit OperatorUpdated(initialOperator, true);
        }
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setOperator(address operator, bool allowed) external onlyOwner {
        operators[operator] = allowed;
        emit OperatorUpdated(operator, allowed);
    }

    function vaultKey(string memory vaultId) public pure returns (bytes32) {
        return keccak256(bytes(vaultId));
    }

    function proposalKey(
        string memory vaultId,
        string memory proposalId
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(vaultId, ":", proposalId));
    }

    function getVault(string calldata vaultId) external view returns (VaultRecord memory) {
        return vaults[vaultKey(vaultId)];
    }

    function createVault(
        string calldata vaultId,
        address vaultOwner,
        string calldata agentId,
        bytes32 policyHash,
        bytes32 metadataRoot
    ) external onlyAuthorizedVaultWriter(vaultOwner) {
        bytes32 key = vaultKey(vaultId);
        require(!vaults[key].exists, "Vault exists");

        vaults[key] = VaultRecord({
            vaultOwner: vaultOwner,
            latestPolicyHash: policyHash,
            latestMetadataRoot: metadataRoot,
            agentId: agentId,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp),
            exists: true
        });

        emit VaultCreated(key, vaultId, vaultOwner, agentId, policyHash, metadataRoot);
    }

    function updatePolicy(
        string calldata vaultId,
        bytes32 policyHash,
        bytes32 metadataRoot
    ) external {
        bytes32 key = vaultKey(vaultId);
        VaultRecord storage record = vaults[key];
        require(record.exists, "Vault missing");
        require(msg.sender == record.vaultOwner || operators[msg.sender], "Not authorized");

        record.latestPolicyHash = policyHash;
        record.latestMetadataRoot = metadataRoot;
        record.updatedAt = uint64(block.timestamp);

        emit PolicyUpdated(key, vaultId, policyHash, metadataRoot);
    }

    function recordProposal(
        string calldata vaultId,
        string calldata proposalId,
        bytes32 proposalHash,
        bytes32 storageRoot
    ) external onlyOperator {
        bytes32 key = vaultKey(vaultId);
        require(vaults[key].exists, "Vault missing");

        bytes32 pKey = proposalKey(vaultId, proposalId);
        latestProposalHashes[pKey] = proposalHash;

        emit ProposalRecorded(key, vaultId, pKey, proposalId, proposalHash, storageRoot);
    }

    function recordExecution(
        string calldata vaultId,
        string calldata proposalId,
        bytes32 executionHash,
        bytes32 storageRoot
    ) external onlyOperator {
        bytes32 key = vaultKey(vaultId);
        require(vaults[key].exists, "Vault missing");

        bytes32 pKey = proposalKey(vaultId, proposalId);
        latestExecutionHashes[pKey] = executionHash;
        vaults[key].updatedAt = uint64(block.timestamp);

        emit ExecutionRecorded(key, vaultId, pKey, proposalId, executionHash, storageRoot);
    }
}
