export class AuditService {
  constructor(store, storageAdapter) {
    this.store = store;
    this.storageAdapter = storageAdapter;
  }

  async recordLocal(type, entityId, payload) {
    return this.store.transaction((state) => {
      const event = {
        id: this.store.createId("audit"),
        type,
        vaultId: entityId,
        payload,
        storageRoot: null,
        storageTxHash: null,
        createdAt: new Date().toISOString(),
      };

      state.auditEvents.push(event);
      return event;
    });
  }

  async record(type, vaultId, payload) {
    if (!this.storageAdapter.canWriteDocuments()) {
      return this.recordLocal(type, vaultId, payload);
    }

    const document = await this.storageAdapter.writeDocument("audit-event", {
      type,
      vaultId,
      payload,
    });

    return this.store.transaction((state) => {
      const event = {
        id: this.store.createId("audit"),
        type,
        vaultId,
        payload,
        storageRoot: document.rootHash,
        storageTxHash: document.txHash,
        createdAt: new Date().toISOString(),
      };

      state.auditEvents.push(event);
      return event;
    });
  }

  async listByVault(vaultId) {
    const state = await this.store.readState();
    return state.auditEvents.filter((event) => event.vaultId === vaultId);
  }
}
