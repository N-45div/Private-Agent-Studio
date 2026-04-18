import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DEFAULT_STATE = {
  vaults: [],
  proposals: [],
  executions: [],
  auditEvents: [],
  agents: [],
  runs: [],
};

export class FileStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.lock = Promise.resolve();
  }

  async readState() {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_STATE),
        ...parsed,
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        await this.writeState(DEFAULT_STATE);
        return structuredClone(DEFAULT_STATE);
      }

      throw error;
    }
  }

  async writeState(state) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(state, null, 2));
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
