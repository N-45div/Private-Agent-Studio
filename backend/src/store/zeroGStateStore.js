import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { Batcher, Indexer, KvClient, getFlowContract } from "@0gfoundation/0g-ts-sdk";
import { JsonRpcProvider, Wallet } from "ethers";
import { AppError } from "../lib/errors.js";
import { normalizeState } from "./defaultState.js";

function keyToHex(key) {
  return `0x${Buffer.from(key, "utf8").toString("hex")}`;
}

function deriveKey(secret) {
  if (!secret) {
    throw new AppError("Missing state encryption key", {
      code: "state_encryption_missing",
      statusCode: 503,
    });
  }

  return createHash("sha256").update(secret).digest();
}

export class ZeroGStateStore {
  constructor(config, fallbackStore) {
    this.config = config;
    this.fallbackStore = fallbackStore;
    this.lock = Promise.resolve();
    this.lastStateSyncAt = null;
    this.lastStateRoot = null;
    this.lastReadSource = "uninitialized";
  }

  describe() {
    return {
      kind: "zerog_kv",
      durable: true,
      encrypted: true,
      streamId: this.config.stateStreamId || "signer_address",
      key: this.config.stateKey,
      lastStateSyncAt: this.lastStateSyncAt,
      lastStateRoot: this.lastStateRoot,
      lastReadSource: this.lastReadSource,
      fallback: this.fallbackStore?.describe?.() || null,
    };
  }

  canUseZeroG() {
    return Boolean(this.config.zeroG.privateKey && this.config.zeroG.storageIndexerRpc && this.config.zeroG.rpcUrl);
  }

  getSigner() {
    if (!this.canUseZeroG()) {
      throw new AppError("0G KV state store is not configured", {
        code: "zerog_state_config_missing",
        statusCode: 503,
      });
    }

    if (!this.signer) {
      const provider = new JsonRpcProvider(this.config.zeroG.rpcUrl);
      this.signer = new Wallet(this.config.zeroG.privateKey, provider);
    }

    return this.signer;
  }

  getStreamId() {
    return this.config.stateStreamId || this.getSigner().address;
  }

  getIndexer() {
    if (!this.indexer) {
      this.indexer = new Indexer(this.config.zeroG.storageIndexerRpc);
    }

    return this.indexer;
  }

  getKvClient() {
    if (!this.kvClient) {
      this.kvClient = new KvClient(this.config.zeroG.storageIndexerRpc);
    }

    return this.kvClient;
  }

  encryptState(state) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", deriveKey(this.config.stateEncryptionKey), iv);
    const plaintext = Buffer.from(JSON.stringify(normalizeState(state)), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      version: 1,
      encoding: "aes-256-gcm",
      createdAt: new Date().toISOString(),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };
  }

  decryptState(envelope) {
    if (envelope?.encoding !== "aes-256-gcm") {
      return normalizeState(envelope?.state || envelope);
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveKey(this.config.stateEncryptionKey),
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, "base64")),
      decipher.final(),
    ]);

    return normalizeState(JSON.parse(plaintext.toString("utf8")));
  }

  async readState() {
    if (!this.canUseZeroG()) {
      this.lastReadSource = "file_fallback";
      return this.fallbackStore.readState();
    }

    try {
      const value = await this.getKvClient().getValue(
        this.getStreamId(),
        keyToHex(this.config.stateKey),
      );

      if (!value?.data) {
        this.lastReadSource = "zerog_kv_empty";
        return this.fallbackStore.readState();
      }

      const envelope = JSON.parse(Buffer.from(value.data, "base64").toString("utf8"));
      this.lastReadSource = "zerog_kv";
      return this.decryptState(envelope);
    } catch (error) {
      this.lastReadSource = "file_fallback_after_zerog_error";
      if (process.env.NODE_ENV === "production") {
        throw new AppError("0G KV state read failed", {
          code: "zerog_state_read_failed",
          statusCode: 503,
          details: { cause: error.message },
        });
      }

      return this.fallbackStore.readState();
    }
  }

  async writeState(state) {
    const normalized = normalizeState(state);

    if (!this.canUseZeroG()) {
      await this.fallbackStore.writeState(normalized);
      this.lastStateSyncAt = new Date().toISOString();
      return;
    }

    const signer = this.getSigner();
    const indexer = this.getIndexer();
    const [nodes, selectError] = await indexer.selectNodes(1);
    if (selectError) {
      throw new AppError("0G KV node selection failed", {
        code: "zerog_state_write_failed",
        statusCode: 502,
        details: { cause: selectError.message },
      });
    }

    const status = await nodes[0].getStatus();
    if (!status?.networkIdentity?.flowAddress) {
      throw new AppError("0G KV selected node did not report a flow contract", {
        code: "zerog_state_write_failed",
        statusCode: 502,
      });
    }

    const flowContract = getFlowContract(status.networkIdentity.flowAddress, signer);
    const batcher = new Batcher(1, nodes, flowContract, this.config.zeroG.rpcUrl);
    const envelope = this.encryptState(normalized);
    const encoded = Buffer.from(JSON.stringify(envelope), "utf8");
    batcher.streamDataBuilder.set(
      this.getStreamId(),
      Buffer.from(this.config.stateKey, "utf8"),
      encoded,
    );

    const [tx, writeError] = await batcher.exec();
    if (writeError) {
      throw new AppError("0G KV state write failed", {
        code: "zerog_state_write_failed",
        statusCode: 502,
        details: { cause: writeError.message },
      });
    }

    await this.fallbackStore.writeState(normalized);
    this.lastStateRoot = tx?.rootHash || tx?.hash || tx?.txHash || null;
    this.lastStateSyncAt = new Date().toISOString();
  }

  async transaction(mutator) {
    const run = async () => {
      const state = await this.readState();
      const result = await mutator(state);
      await this.writeState(state);
      return result;
    };

    const next = this.lock.then(run, run);
    this.lock = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  createId(prefix) {
    return `${prefix}_${randomUUID()}`;
  }
}
