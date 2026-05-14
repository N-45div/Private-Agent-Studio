import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { JsonRpcProvider, Wallet } from "ethers";
import { extractJsonObject } from "../lib/hash.js";
import { AppError } from "../lib/errors.js";

function isAbsoluteHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function trimTrailingSlash(value) {
  return typeof value === "string" ? value.replace(/\/+$/, "") : value;
}

export class ZeroGComputeAdapter {
  constructor(config) {
    this.config = config;
  }

  hasDirectApiCredentials() {
    return Boolean(this.config.zeroG.computeApiKey && this.config.zeroG.computeApiBase);
  }

  isDirectApiReady() {
    return Boolean(
      this.hasDirectApiCredentials() &&
        this.config.zeroG.computeModel,
    );
  }

  resolveExecutionMode(requestedExecutionMode = "auto") {
    if (requestedExecutionMode === "auto") {
      return this.isDirectApiReady() ? "zerog_direct_api" : "zerog_broker";
    }

    return requestedExecutionMode;
  }

  hasDirectApiMode() {
    return this.hasDirectApiCredentials();
  }

  getDirectApiBaseUrl() {
    return trimTrailingSlash(this.config.zeroG.computeApiBase || "");
  }

  getDirectApiUrl(pathname) {
    return `${this.getDirectApiBaseUrl()}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  }

  async getBroker() {
    if (!this.config.zeroG.privateKey) {
      throw new AppError("Missing PRIVATE_KEY for 0G Compute requests", {
        code: "zerog_config_missing",
        statusCode: 503,
      });
    }

    if (!this.broker) {
      const provider = new JsonRpcProvider(this.config.zeroG.rpcUrl);
      const signer = new Wallet(this.config.zeroG.privateKey, provider);
      this.broker = await createZGComputeNetworkBroker(signer);
    }

    return this.broker;
  }

  async listProviderCandidates() {
    const candidates = [];
    const pushCandidate = (providerAddress, source) => {
      if (!providerAddress || candidates.some((candidate) => candidate.providerAddress === providerAddress)) {
        return;
      }

      candidates.push({ providerAddress, source });
    };

    if (this.config.zeroG.computeProvider) {
      pushCandidate(this.config.zeroG.computeProvider, "configured");
    }

    const broker = await this.getBroker();
    const services = await broker.inference.listService();
    if (Array.isArray(services)) {
      for (const service of services) {
        pushCandidate(
          service.providerAddress ||
            service.provider ||
            service.address ||
            service.provider_address,
          "broker_discovery",
        );
      }
    }

    for (const providerAddress of this.config.zeroG.computeFallbackProviders || []) {
      pushCandidate(providerAddress, "docs_fallback");
    }

    return candidates;
  }

  async inspectProvider(providerAddress, options = {}) {
    const broker = await this.getBroker();
    const inspection = {
      providerAddress,
      endpoint: null,
      model: null,
      metadataValid: false,
      acknowledged: false,
      error: null,
    };

    try {
      const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);
      inspection.endpoint = endpoint || null;
      inspection.model = model || null;

      if (!isAbsoluteHttpUrl(endpoint)) {
        inspection.error = `invalid_provider_endpoint:${endpoint || "missing"}`;
        return inspection;
      }

      if (!model || typeof model !== "string" || !model.trim()) {
        inspection.error = "invalid_provider_model";
        return inspection;
      }

      inspection.metadataValid = true;

      if (options.acknowledge !== false) {
        await broker.inference.acknowledgeProviderSigner(providerAddress);
        inspection.acknowledged = true;
      }

      return inspection;
    } catch (error) {
      inspection.error = error.message || String(error);
      return inspection;
    }
  }

  async resolveProvider() {
    const candidates = await this.listProviderCandidates();

    if (candidates.length === 0) {
      throw new AppError("No 0G Compute providers configured or discovered", {
        code: "zerog_compute_unavailable",
        statusCode: 503,
      });
    }

    const diagnostics = [];
    for (const candidate of candidates) {
      const inspection = await this.inspectProvider(candidate.providerAddress, { acknowledge: true });
      diagnostics.push({
        source: candidate.source,
        ...inspection,
      });

      if (inspection.metadataValid && inspection.acknowledged) {
        return {
          providerAddress: candidate.providerAddress,
          endpoint: inspection.endpoint,
          model: inspection.model,
          source: candidate.source,
        };
      }
    }

    throw new AppError("No usable 0G Compute providers available", {
      code: "zerog_compute_unavailable",
      statusCode: 503,
      details: {
        diagnostics,
      },
    });
  }

  async getDirectApiModels() {
    const response = await fetch(this.getDirectApiUrl("/models"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.config.zeroG.computeApiKey}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AppError(`0G Compute direct API model listing failed with status ${response.status}`, {
        code: "zerog_compute_failed",
        statusCode: 502,
        details: {
          status: response.status,
          body: body.slice(0, 500),
        },
      });
    }

    const data = await response.json();
    return Array.isArray(data?.data) ? data.data : [];
  }

  async getDiagnostics({ acknowledgeProviders = false, probeDirectApi = false } = {}) {
    if (this.hasDirectApiMode()) {
      const diagnostics = {
        mode: "direct_api",
        configuredProvider: this.config.zeroG.computeProvider || null,
        apiBase: this.getDirectApiBaseUrl(),
        model: this.config.zeroG.computeModel,
        teeRequired: this.config.zeroG.computeRequireTee,
        credentialsPresent: this.hasDirectApiCredentials(),
        ready: this.isDirectApiReady(),
      };

      if (probeDirectApi) {
        try {
          const models = await this.getDirectApiModels();
          diagnostics.probe = {
            ok: true,
            modelCount: models.length,
            configuredModelAvailable: models.some(
              (model) => model?.id === this.config.zeroG.computeModel,
            ),
            models: models.slice(0, 20).map((model) => ({
              id: model?.id || null,
              ownedBy: model?.owned_by || null,
            })),
          };
        } catch (error) {
          diagnostics.probe = {
            ok: false,
            error: error.message || String(error),
            details: error.details || null,
          };
        }
      }

      return {
        ...diagnostics,
      };
    }

    if (!this.config.zeroG.privateKey) {
      return {
        mode: "broker",
        configuredProvider: this.config.zeroG.computeProvider || null,
        fallbackProviders: this.config.zeroG.computeFallbackProviders || [],
        credentialsPresent: false,
        ready: false,
        error: "Missing PRIVATE_KEY for broker-mode 0G Compute diagnostics.",
        diagnostics: (this.config.zeroG.computeFallbackProviders || []).map((providerAddress) => ({
          source: "docs_fallback",
          providerAddress,
          endpoint: null,
          model: null,
          metadataValid: false,
          acknowledged: false,
          error: "broker_wallet_not_configured",
        })),
      };
    }

    const candidates = await this.listProviderCandidates();
    const diagnostics = [];
    for (const candidate of candidates) {
      diagnostics.push({
        source: candidate.source,
        ...(await this.inspectProvider(candidate.providerAddress, {
          acknowledge: acknowledgeProviders,
        })),
      });
    }

    return {
      mode: "broker",
      configuredProvider: this.config.zeroG.computeProvider || null,
      fallbackProviders: this.config.zeroG.computeFallbackProviders || [],
      diagnostics,
    };
  }

  async runStructuredJsonPrompt({ systemPrompt, payload, temperature = 0.1, executionMode = "auto" }) {
    const resolvedExecutionMode = this.resolveExecutionMode(executionMode);
    const requestContent = JSON.stringify({
      systemPrompt,
      payload,
    });

    if (resolvedExecutionMode === "zerog_direct_api") {
      if (!this.hasDirectApiMode()) {
        throw new AppError(
          "Run requested zerog_direct_api mode, but direct 0G Compute API credentials are not configured",
          {
            code: "zerog_config_missing",
            statusCode: 503,
            details: {
              requestedExecutionMode: resolvedExecutionMode,
            },
          },
        );
      }

      return this.runStructuredJsonPromptViaDirectApi({
        systemPrompt,
        payload,
        temperature,
        requestedExecutionMode: executionMode,
      });
    }

    if (resolvedExecutionMode !== "zerog_broker") {
      throw new AppError(`Unsupported 0G execution mode: ${resolvedExecutionMode}`, {
        code: "validation_error",
        statusCode: 400,
        details: {
          executionMode: resolvedExecutionMode,
        },
      });
    }

    const broker = await this.getBroker();
    const provider = await this.resolveProvider();
    const headers = await broker.inference.getRequestHeaders(provider.providerAddress, requestContent);

    const response = await fetch(`${provider.endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({
        model: provider.model,
        temperature,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify(payload),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new AppError(`0G Compute request failed with status ${response.status}`, {
        code: "zerog_compute_failed",
        statusCode: 502,
      });
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content;
    const parsed = extractJsonObject(message);

    const chatId =
      response.headers.get("ZG-Res-Key") ||
      response.headers.get("zg-res-key") ||
      data?.id ||
      data?.chatID;

    let teeVerified = null;
    if (chatId) {
      teeVerified = await broker.inference.processResponse(
        provider.providerAddress,
        message || "",
        chatId,
      );
      if (this.config.zeroG.computeRequireTee && teeVerified !== true) {
        throw new AppError("0G Compute TEE verification failed", {
          code: "zerog_tee_verification_failed",
          statusCode: 502,
        });
      }
    }

    return {
      ...parsed,
      inference: {
        mode: "broker",
        requestedExecutionMode: executionMode,
        resolvedExecutionMode,
        providerAddress: provider.providerAddress,
        model: provider.model,
        chatId,
        teeVerified,
        providerSource: provider.source,
      },
    };
  }

  async runStructuredJsonPromptViaDirectApi({
    systemPrompt,
    payload,
    temperature = 0.1,
    requestedExecutionMode = "auto",
  }) {
    if (!this.config.zeroG.computeModel) {
      throw new AppError("Missing ZEROG_COMPUTE_MODEL for direct 0G Compute API access", {
        code: "zerog_config_missing",
        statusCode: 503,
      });
    }

    const response = await fetch(this.getDirectApiUrl("/chat/completions"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.zeroG.computeApiKey}`,
      },
      body: JSON.stringify({
        model: this.config.zeroG.computeModel,
        temperature,
        verify_tee: this.config.zeroG.computeRequireTee,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify(payload),
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AppError(`0G Compute direct API failed with status ${response.status}`, {
        code: "zerog_compute_failed",
        statusCode: 502,
        details: {
          status: response.status,
          body: body.slice(0, 500),
        },
      });
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content;
    const parsed = extractJsonObject(message);
    const teeVerified =
      data?.trace?.tee_verified ??
      data?.trace?.teeVerified ??
      data?.tee_verified ??
      data?.teeVerified ??
      null;

    if (this.config.zeroG.computeRequireTee && teeVerified !== true) {
      throw new AppError("0G Compute direct API TEE verification failed", {
        code: "zerog_tee_verification_failed",
        statusCode: 502,
        details: {
          trace: data?.trace || null,
        },
      });
    }

    return {
      ...parsed,
      inference: {
        mode: "direct_api",
        requestedExecutionMode,
        resolvedExecutionMode: "zerog_direct_api",
        providerAddress: this.config.zeroG.computeProvider || "direct-api",
        model: this.config.zeroG.computeModel,
        chatId: data?.id || null,
        teeVerified,
      },
    };
  }

  async generateTreasuryDecision({ vault, marketContext }) {
    return this.runStructuredJsonPrompt({
      systemPrompt:
        "You are AgentVault, a treasury execution planner. Return only one JSON object with keys actionType, amountUsd, token, targetProtocol, reasoning. Respect policy limits and prefer no action over risky action.",
      payload: {
        vault: {
          id: vault.id,
          balances: vault.treasury.balances,
          deployedCapitalUsd: vault.treasury.deployedCapitalUsd,
          policy: vault.policy,
        },
        marketContext,
      },
    });
  }
}
