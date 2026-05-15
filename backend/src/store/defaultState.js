export const DEFAULT_STATE = {
  vaults: [],
  proposals: [],
  executions: [],
  auditEvents: [],
  agents: [],
  runs: [],
};

export function normalizeState(state) {
  return {
    ...structuredClone(DEFAULT_STATE),
    ...(state || {}),
  };
}
