import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Indexer, ZgFile } from "@0gfoundation/0g-ts-sdk";
import { JsonRpcProvider, Wallet } from "ethers";
import { AppError } from "../lib/errors.js";

export class ZeroGStorageAdapter {
  constructor(config) {
    this.config = config;
  }

  canWriteDocuments() {
    return Boolean(this.config.zeroG.privateKey);
  }

  getSigner() {
    if (!this.config.zeroG.privateKey) {
      throw new AppError("Missing PRIVATE_KEY for 0G Storage writes", {
        code: "zerog_config_missing",
        statusCode: 503,
      });
    }

    if (!this.signer) {
      const provider = new JsonRpcProvider(this.config.zeroG.rpcUrl);
      this.signer = new Wallet(this.config.zeroG.privateKey, provider);
    }

    return this.signer;
  }

  getIndexer() {
    if (!this.indexer) {
      this.indexer = new Indexer(this.config.zeroG.storageIndexerRpc);
    }

    return this.indexer;
  }

  async writeDocument(kind, payload) {
    const tempPath = path.join(os.tmpdir(), `agentvault-${kind}-${randomUUID()}.json`);
    const body = JSON.stringify(
      {
        kind,
        timestamp: new Date().toISOString(),
        payload,
      },
      null,
      2,
    );

    await fs.writeFile(tempPath, body);

    let fileHandle;

    try {
      fileHandle = await ZgFile.fromFilePath(tempPath);
      const [tree, treeError] = await fileHandle.merkleTree();

      if (treeError) {
        throw new AppError(`0G Storage merkle tree generation failed for ${kind}`, {
          code: "zerog_storage_failed",
          statusCode: 502,
          details: { kind, cause: treeError.message },
        });
      }

      const [tx, uploadError] = await this.getIndexer().upload(
        fileHandle,
        this.config.zeroG.rpcUrl,
        this.getSigner(),
      );

      if (uploadError) {
        throw new AppError(`0G Storage upload failed for ${kind}`, {
          code: "zerog_storage_failed",
          statusCode: 502,
          details: { kind, cause: uploadError.message },
        });
      }

      return {
        rootHash: tx?.rootHash || tree.rootHash(),
        txHash: tx?.txHash || tx?.hash || tx?.transactionHash || null,
      };
    } finally {
      if (fileHandle) {
        await fileHandle.close();
      }

      await fs.rm(tempPath, { force: true });
    }
  }
}
