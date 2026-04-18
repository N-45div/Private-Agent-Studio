import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { keccakJson } from "../lib/hash.js";
import { agentVaultRegistryAbi } from "../contracts/agentVaultRegistryAbi.js";
import { AppError } from "../lib/errors.js";

export class ZeroGChainAdapter {
  constructor(config) {
    this.config = config;
  }

  getContract() {
    if (!this.config.zeroG.privateKey) {
      throw new AppError("Missing PRIVATE_KEY for onchain writes", {
        code: "zerog_config_missing",
        statusCode: 503,
      });
    }

    if (!this.config.zeroG.registryAddress) {
      throw new AppError("Missing AGENTVAULT_REGISTRY_ADDRESS for onchain writes", {
        code: "zerog_config_missing",
        statusCode: 503,
      });
    }

    if (!this.contract) {
      const provider = new JsonRpcProvider(this.config.zeroG.rpcUrl);
      const signer = new Wallet(this.config.zeroG.privateKey, provider);
      this.contract = new Contract(
        this.config.zeroG.registryAddress,
        agentVaultRegistryAbi,
        signer,
      );
    }

    return this.contract;
  }

  async createVault({ vaultId, owner, agentId, policy, metadataRoot }) {
    const policyHash = keccakJson(policy);
    const tx = await this.getContract().createVault(
      vaultId,
      owner,
      agentId,
      policyHash,
      metadataRoot,
    );
    const receipt = await tx.wait();

    return {
      txHash: receipt?.hash || tx.hash,
      explorerUrl: `${this.config.zeroG.explorerBaseUrl}${receipt?.hash || tx.hash}`,
      policyHash,
    };
  }

  async updatePolicy({ vaultId, policy, metadataRoot }) {
    const policyHash = keccakJson(policy);
    const tx = await this.getContract().updatePolicy(vaultId, policyHash, metadataRoot);
    const receipt = await tx.wait();

    return {
      txHash: receipt?.hash || tx.hash,
      explorerUrl: `${this.config.zeroG.explorerBaseUrl}${receipt?.hash || tx.hash}`,
      policyHash,
    };
  }

  async recordProposal({ vaultId, proposalId, proposal, storageRoot }) {
    const proposalHash = keccakJson(proposal);
    const tx = await this.getContract().recordProposal(
      vaultId,
      proposalId,
      proposalHash,
      storageRoot,
    );
    const receipt = await tx.wait();

    return {
      txHash: receipt?.hash || tx.hash,
      explorerUrl: `${this.config.zeroG.explorerBaseUrl}${receipt?.hash || tx.hash}`,
      proposalHash,
    };
  }

  async recordExecution({ vaultId, proposalId, execution, storageRoot }) {
    const executionHash = keccakJson(execution);
    const tx = await this.getContract().recordExecution(
      vaultId,
      proposalId,
      executionHash,
      storageRoot,
    );
    const receipt = await tx.wait();

    return {
      txHash: receipt?.hash || tx.hash,
      explorerUrl: `${this.config.zeroG.explorerBaseUrl}${receipt?.hash || tx.hash}`,
      executionHash,
    };
  }
}
