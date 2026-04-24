const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:4000"
).replace(/\/+$/, "");

async function request(pathname, options = {}) {
  const response = await fetch(`${API_BASE_URL}${pathname}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    const error = new Error(payload.message || payload.error || "Request failed");
    error.code = payload.error || "request_failed";
    error.details = payload.details || null;
    throw error;
  }

  return payload;
}

export const api = {
  baseUrl: API_BASE_URL,
  getHealth() {
    return request("/health");
  },
  getComputeDiagnostics() {
    return request("/api/diagnostics/compute");
  },
  listTemplates() {
    return request("/api/templates");
  },
  listAgents() {
    return request("/api/agents");
  },
  createAgent(payload) {
    return request("/api/agents", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getAgent(agentId) {
    return request(`/api/agents/${agentId}`);
  },
  getExportManifest(agentId) {
    return request(`/api/agents/${agentId}/export-manifest`);
  },
  getPublishIntent(agentId) {
    return request(`/api/agents/${agentId}/publish-intent`);
  },
  confirmPublish(agentId, payload) {
    return request(`/api/agents/${agentId}/publish`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getOnchainRegistrationIntent(agentId) {
    return request(`/api/agents/${agentId}/onchain-registration-intent`);
  },
  confirmOnchainRegistration(agentId, payload) {
    return request(`/api/agents/${agentId}/onchain-registration`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listAuthorizations(agentId) {
    return request(`/api/agents/${agentId}/authorizations`);
  },
  createAuthorizationIntent(agentId, payload) {
    return request(`/api/agents/${agentId}/authorizations/intents`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  confirmAuthorization(agentId, authorizationId, payload) {
    return request(`/api/agents/${agentId}/authorizations/${authorizationId}/confirm`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listRuns(agentId) {
    return request(`/api/agents/${agentId}/runs`);
  },
  startRun(agentId, payload) {
    return request(`/api/agents/${agentId}/runs`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
