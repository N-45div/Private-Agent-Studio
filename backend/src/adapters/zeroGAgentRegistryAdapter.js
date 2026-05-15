import { Contract, Interface, JsonRpcProvider, Wallet } from "ethers";
import { privateAgentRegistryAbi } from "../contracts/privateAgentRegistryAbi.js";
import { AppError } from "../lib/errors.js";

export class ZeroGAgentRegistryAdapter {
  constructor(config) {
    this.config = config;
    this.interface = new Interface(privateAgentRegistryAbi);
  }

  getContractAddress() {
    if (!this.config.zeroG.agentRegistryAddress) {
      throw new AppError("Missing PRIVATE_AGENT_REGISTRY_ADDRESS for onchain agent registration", {
        code: "zerog_config_missing",
        statusCode: 503,
      });
    }

    return this.config.zeroG.agentRegistryAddress;
  }

  getContract() {
    if (!this.config.zeroG.privateKey) {
      throw new AppError("Missing PRIVATE_KEY for backend onchain writes", {
        code: "zerog_config_missing",
        statusCode: 503,
      });
    }

    if (!this.contract) {
      const provider = new JsonRpcProvider(this.config.zeroG.rpcUrl);
      const signer = new Wallet(this.config.zeroG.privateKey, provider);
      this.contract = new Contract(
        this.getContractAddress(),
        privateAgentRegistryAbi,
        signer,
      );
    }

    return this.contract;
  }

  buildRegisterAgentCall({
    agentId,
    owner,
    packageHash,
    storageRoot,
    policyHash,
    metadataHash,
    workflowHash,
  }) {
    const args = [agentId, owner, packageHash, storageRoot, policyHash, metadataHash, workflowHash];
    return {
      contractAddress: this.getContractAddress(),
      functionName: "registerAgent",
      args,
      calldata: this.interface.encodeFunctionData("registerAgent", args),
      chainId: this.config.zeroG.chainId,
    };
  }

  async registerAgent(payload) {
    const tx = await this.getContract().registerAgent(
      payload.agentId,
      payload.owner,
      payload.packageHash,
      payload.storageRoot,
      payload.policyHash,
      payload.metadataHash,
      payload.workflowHash,
    );
    const receipt = await tx.wait();

    return {
      txHash: receipt?.hash || tx.hash,
      explorerUrl: `${this.config.zeroG.explorerBaseUrl}${receipt?.hash || tx.hash}`,
    };
  }

  async updateAgent(payload) {
    const tx = await this.getContract().updateAgent(
      payload.agentId,
      payload.packageHash,
      payload.storageRoot,
      payload.policyHash,
      payload.metadataHash,
      payload.workflowHash,
    );
    const receipt = await tx.wait();

    return {
      txHash: receipt?.hash || tx.hash,
      explorerUrl: `${this.config.zeroG.explorerBaseUrl}${receipt?.hash || tx.hash}`,
    };
  }

  async getAgent(agentId) {
    const record = await this.getContract().getAgent(agentId);
    return {
      owner: record.agentOwner,
      packageHash: record.latestPackageHash,
      storageRoot: record.latestStorageRoot,
      policyHash: record.latestPolicyHash,
      metadataHash: record.latestMetadataHash,
      workflowHash: record.latestWorkflowHash,
      createdAt: Number(record.createdAt || 0),
      updatedAt: Number(record.updatedAt || 0),
      exists: Boolean(record.exists),
    };
  }

  buildAuthorizeUsageCall({ agentId, grantee, scopeHash, expiresAt }) {
    const args = [agentId, grantee, scopeHash, expiresAt];
    return {
      contractAddress: this.getContractAddress(),
      functionName: "authorizeUsage",
      args,
      calldata: this.interface.encodeFunctionData("authorizeUsage", args),
      chainId: this.config.zeroG.chainId,
    };
  }

  async authorizeUsage(payload) {
    const tx = await this.getContract().authorizeUsage(
      payload.agentId,
      payload.grantee,
      payload.scopeHash,
      payload.expiresAt,
    );
    const receipt = await tx.wait();

    return {
      txHash: receipt?.hash || tx.hash,
      explorerUrl: `${this.config.zeroG.explorerBaseUrl}${receipt?.hash || tx.hash}`,
    };
  }

  buildRevokeUsageCall({ agentId, grantee }) {
    const args = [agentId, grantee];
    return {
      contractAddress: this.getContractAddress(),
      functionName: "revokeUsage",
      args,
      calldata: this.interface.encodeFunctionData("revokeUsage", args),
      chainId: this.config.zeroG.chainId,
    };
  }

  async revokeUsage(payload) {
    const tx = await this.getContract().revokeUsage(payload.agentId, payload.grantee);
    const receipt = await tx.wait();

    return {
      txHash: receipt?.hash || tx.hash,
      explorerUrl: `${this.config.zeroG.explorerBaseUrl}${receipt?.hash || tx.hash}`,
    };
  }
}
