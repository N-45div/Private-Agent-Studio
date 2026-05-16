export class AuditService {
  constructor(store, storageAdapter) {
    this.store = store;
    this.storageAdapter = storageAdapter;
    this.auditSyncLock = Promise.resolve();
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

    const event = await this.store.transaction((state) => {
      const event = {
        id: this.store.createId("audit"),
        type,
        vaultId,
        payload,
        storageRoot: null,
        storageTxHash: null,
        storageStatus: "queued",
        createdAt: new Date().toISOString(),
      };

      state.auditEvents.push(event);
      return event;
    });

    this.queueAuditStorage(event.id, type, vaultId, payload);
    return event;
  }

  queueAuditStorage(eventId, type, vaultId, payload) {
    this.auditSyncLock = this.auditSyncLock
      .then(async () => {
        const document = await this.storageAdapter.writeDocument(
          "audit-event",
          {
            type,
            vaultId,
            payload,
          },
          {
            finalityRequired: false,
          },
        );

        await this.store.transaction((state) => {
          const event = state.auditEvents.find((item) => item.id === eventId);
          if (!event) {
            return null;
          }

          event.storageRoot = document.rootHash;
          event.storageTxHash = document.txHash;
          event.storageStatus = "stored";
          return event;
        });
      })
      .catch((error) => {
        console.error("Audit event background storage failed", error);
        return this.store.transaction((state) => {
          const event = state.auditEvents.find((item) => item.id === eventId);
          if (!event) {
            return null;
          }

          event.storageStatus = "failed";
          event.storageError = error.message;
          return event;
        });
      });
  }

  async listByVault(vaultId) {
    const state = await this.store.readState();
    return state.auditEvents.filter((event) => event.vaultId === vaultId);
  }
}
