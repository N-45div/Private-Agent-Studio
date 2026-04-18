// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PrivateAgentRegistry {
    address public owner;
    mapping(address => bool) public operators;

    struct AgentRecord {
        address agentOwner;
        bytes32 latestPackageHash;
        bytes32 latestStorageRoot;
        bytes32 latestPolicyHash;
        bytes32 latestMetadataHash;
        bytes32 latestWorkflowHash;
        uint64 createdAt;
        uint64 updatedAt;
        bool exists;
    }

    struct AuthorizationRecord {
        address grantee;
        bytes32 scopeHash;
        uint64 expiresAt;
        uint64 updatedAt;
        bool active;
    }

    mapping(bytes32 => AgentRecord) private agents;
    mapping(bytes32 => AuthorizationRecord) private authorizations;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OperatorUpdated(address indexed operator, bool allowed);
    event AgentRegistered(
        bytes32 indexed agentKey,
        string agentId,
        address indexed agentOwner,
        bytes32 packageHash,
        bytes32 storageRoot,
        bytes32 policyHash,
        bytes32 metadataHash,
        bytes32 workflowHash
    );
    event AgentUpdated(
        bytes32 indexed agentKey,
        string agentId,
        bytes32 packageHash,
        bytes32 storageRoot,
        bytes32 policyHash,
        bytes32 metadataHash,
        bytes32 workflowHash
    );
    event UsageAuthorized(
        bytes32 indexed agentKey,
        string agentId,
        bytes32 indexed authorizationKey,
        address indexed grantee,
        bytes32 scopeHash,
        uint64 expiresAt
    );
    event UsageRevoked(
        bytes32 indexed agentKey,
        string agentId,
        bytes32 indexed authorizationKey,
        address indexed grantee
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAuthorizedWriter(address agentOwner) {
        require(msg.sender == agentOwner || operators[msg.sender], "Not authorized");
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

    function agentKey(string memory agentId) public pure returns (bytes32) {
        return keccak256(bytes(agentId));
    }

    function authorizationKey(
        string memory agentId,
        address grantee
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(agentId, ":", grantee));
    }

    function getAgent(string calldata agentId) external view returns (AgentRecord memory) {
        return agents[agentKey(agentId)];
    }

    function getAuthorization(
        string calldata agentId,
        address grantee
    ) external view returns (AuthorizationRecord memory) {
        return authorizations[authorizationKey(agentId, grantee)];
    }

    function registerAgent(
        string calldata agentId,
        address agentOwner,
        bytes32 packageHash,
        bytes32 storageRoot,
        bytes32 policyHash,
        bytes32 metadataHash,
        bytes32 workflowHash
    ) external onlyAuthorizedWriter(agentOwner) {
        require(agentOwner != address(0), "Invalid owner");

        bytes32 key = agentKey(agentId);
        require(!agents[key].exists, "Agent exists");

        agents[key] = AgentRecord({
            agentOwner: agentOwner,
            latestPackageHash: packageHash,
            latestStorageRoot: storageRoot,
            latestPolicyHash: policyHash,
            latestMetadataHash: metadataHash,
            latestWorkflowHash: workflowHash,
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp),
            exists: true
        });

        emit AgentRegistered(
            key,
            agentId,
            agentOwner,
            packageHash,
            storageRoot,
            policyHash,
            metadataHash,
            workflowHash
        );
    }

    function updateAgent(
        string calldata agentId,
        bytes32 packageHash,
        bytes32 storageRoot,
        bytes32 policyHash,
        bytes32 metadataHash,
        bytes32 workflowHash
    ) external {
        bytes32 key = agentKey(agentId);
        AgentRecord storage record = agents[key];

        require(record.exists, "Agent missing");
        require(msg.sender == record.agentOwner || operators[msg.sender], "Not authorized");

        record.latestPackageHash = packageHash;
        record.latestStorageRoot = storageRoot;
        record.latestPolicyHash = policyHash;
        record.latestMetadataHash = metadataHash;
        record.latestWorkflowHash = workflowHash;
        record.updatedAt = uint64(block.timestamp);

        emit AgentUpdated(
            key,
            agentId,
            packageHash,
            storageRoot,
            policyHash,
            metadataHash,
            workflowHash
        );
    }

    function authorizeUsage(
        string calldata agentId,
        address grantee,
        bytes32 scopeHash,
        uint64 expiresAt
    ) external {
        require(grantee != address(0), "Invalid grantee");

        bytes32 key = agentKey(agentId);
        AgentRecord storage record = agents[key];
        require(record.exists, "Agent missing");
        require(msg.sender == record.agentOwner || operators[msg.sender], "Not authorized");

        bytes32 authKey = authorizationKey(agentId, grantee);
        authorizations[authKey] = AuthorizationRecord({
            grantee: grantee,
            scopeHash: scopeHash,
            expiresAt: expiresAt,
            updatedAt: uint64(block.timestamp),
            active: true
        });

        emit UsageAuthorized(key, agentId, authKey, grantee, scopeHash, expiresAt);
    }

    function revokeUsage(string calldata agentId, address grantee) external {
        require(grantee != address(0), "Invalid grantee");

        bytes32 key = agentKey(agentId);
        AgentRecord storage record = agents[key];
        require(record.exists, "Agent missing");
        require(msg.sender == record.agentOwner || operators[msg.sender], "Not authorized");

        bytes32 authKey = authorizationKey(agentId, grantee);
        AuthorizationRecord storage authorization = authorizations[authKey];
        require(authorization.active, "Authorization missing");

        authorization.active = false;
        authorization.updatedAt = uint64(block.timestamp);

        emit UsageRevoked(key, agentId, authKey, grantee);
    }
}
