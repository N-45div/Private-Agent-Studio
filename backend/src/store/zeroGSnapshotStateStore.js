import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { Wallet } from "ethers";
import { AppError } from "../lib/errors.js";
import { keccakJson } from "../lib/hash.js";
import { normalizeState } from "./defaultState.js";

const ZERO_BYTES32 = `0x${"0".repeat(64)}`;

function deriveKey(secret) {
  if (!secret) {
    throw new AppError("Missing state encryption key", {
      code: "state_encryption_missing",
      statusCode: 503,
    });
  }

  return createHash("sha256").update(secret).digest();
}

function bytes32(value) {
  if (typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value)) {
    return value;
  }

  return ZERO_BYTES32;
}

export class ZeroGSnapshotStateStore {
  constructor(config, fallbackStore, storageAdapter, registryAdapter) {
    this.config = config;
    this.fallbackStore = fallbackStore;
    this.storageAdapter = storageAdapter;
    this.registryAdapter = registryAdapter;
    this.lock = Promise.resolve();
    this.lastStateSyncAt = null;
    this.lastStateRoot = null;
    this.lastStateTxHash = null;
    this.lastReadSource = "uninitialized";
  }

  describe() {
    return {
      kind: "zerog_snapshot",
      durable: true,
      encrypted: true,
      pointerAgentId: this.config.statePointerAgentId,
      lastStateSyncAt: this.lastStateSyncAt,
      lastStateRoot: this.lastStateRoot,
      lastStateTxHash: this.lastStateTxHash,
      lastReadSource: this.lastReadSource,
      fallback: this.fallbackStore?.describe?.() || null,
    };
  }

  canUseZeroG() {
    return Boolean(
      this.config.zeroG.privateKey &&
        this.config.zeroG.storageIndexerRpc &&
        this.config.zeroG.rpcUrl &&
        this.config.zeroG.agentRegistryAddress,
    );
  }

  getOwner() {
    return new Wallet(this.config.zeroG.privateKey).address;
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
    const payload = envelope?.payload || envelope;
    if (payload?.encoding !== "aes-256-gcm") {
      return normalizeState(payload?.state || payload);
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      deriveKey(this.config.stateEncryptionKey),
      Buffer.from(payload.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64")),
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
      const pointer = await this.registryAdapter.getAgent(this.config.statePointerAgentId);
      if (!pointer.exists || bytes32(pointer.storageRoot) === ZERO_BYTES32) {
        this.lastReadSource = "zerog_snapshot_empty";
        return this.fallbackStore.readState();
      }

      const document = await this.storageAdapter.readDocument(pointer.storageRoot);
      this.lastStateRoot = pointer.storageRoot;
      this.lastReadSource = "zerog_snapshot";
      return this.decryptState(document);
    } catch (error) {
      if (process.env.NODE_ENV === "production") {
        throw new AppError("0G snapshot state read failed", {
          code: "zerog_state_read_failed",
          statusCode: 503,
          details: { cause: error.message },
        });
      }

      this.lastReadSource = "file_fallback_after_zerog_error";
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

    const encryptedState = this.encryptState(normalized);
    const upload = await this.storageAdapter.writeDocument("studio-state", encryptedState);
    const stateHash = keccakJson({
      rootHash: upload.rootHash,
      createdAt: encryptedState.createdAt,
    });

    const pointer = await this.registryAdapter.getAgent(this.config.statePointerAgentId);
    const tx = pointer.exists
      ? await this.registryAdapter.updateAgent({
          agentId: this.config.statePointerAgentId,
          packageHash: stateHash,
          storageRoot: upload.rootHash,
          policyHash: stateHash,
          metadataHash: stateHash,
          workflowHash: stateHash,
        })
      : await this.registryAdapter.registerAgent({
          agentId: this.config.statePointerAgentId,
          owner: this.getOwner(),
          packageHash: stateHash,
          storageRoot: upload.rootHash,
          policyHash: stateHash,
          metadataHash: stateHash,
          workflowHash: stateHash,
        });

    await this.fallbackStore.writeState(normalized);
    this.lastStateRoot = upload.rootHash;
    this.lastStateTxHash = tx.txHash;
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
