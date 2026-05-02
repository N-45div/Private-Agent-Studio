# Private Agent Studio Backend

Docs-grounded MVP backend for the Private Agent Studio hackathon project.

## Run

```bash
cd /home/divij/vincent/agentvault/backend
npm install
npm start
```

This backend is wired for real 0G integration:

- 0G Chain via `ethers`
- 0G Storage via `@0gfoundation/0g-ts-sdk`
- 0G Compute via `@0glabs/0g-serving-broker`
- optional direct 0G Compute API mode via `app-sk-...`

Agent drafts do not require a signer. Publish and run operations only require the specific 0G capability they use.

Current backend focus:

- template catalog
- draft-first private agent package creation
- user-owned publish lifecycle
- onchain registration intent and confirmation
- onchain usage authorization intent and confirmation
- multi-agent workflow runs
- storage-backed audit trail
- MCP bridge for OpenClaw and other MCP clients

The earlier treasury-oriented routes remain in the codebase while the backend is being generalized into a reusable workflow studio runtime.

## Environment

Copy values from [`/home/divij/vincent/agentvault/.env.example`](/home/divij/vincent/agentvault/.env.example).

## API

- `GET /health`
- `GET /api/diagnostics/compute`
- `GET /api/templates`
- `GET /api/agents`
- `POST /api/agents`
- `GET /api/agents/:agentId`
- `GET /api/agents/:agentId/export-manifest`
- `GET /api/agents/:agentId/publish-intent`
- `POST /api/agents/:agentId/publish`
- `GET /api/agents/:agentId/onchain-registration-intent`
- `POST /api/agents/:agentId/onchain-registration`
- `GET /api/agents/:agentId/authorizations`
- `POST /api/agents/:agentId/authorizations/intents`
- `POST /api/agents/:agentId/authorizations/:authorizationId/confirm`
- `GET /api/agents/:agentId/authorizations/:authorizationId/revoke-intent`
- `POST /api/agents/:agentId/authorizations/:authorizationId/revoke`
- `GET /api/agents/:agentId/runs`
- `POST /api/agents/:agentId/runs`
- `GET /api/runs/:runId`
- `GET /api/vaults`
- `POST /api/vaults`
- `GET /api/vaults/:vaultId`
- `POST /api/vaults/:vaultId/policies`
- `POST /api/vaults/:vaultId/proposals/generate`
- `POST /api/proposals/:proposalId/approve`
- `POST /api/proposals/:proposalId/execute`
- `GET /api/vaults/:vaultId/audit`

## Required Deployment Order

1. Decide whether the backend is draft-only or also performs server-side 0G actions.
2. For draft-only mode, you can start with no `PRIVATE_KEY`.
3. For user-wallet publication, the frontend should publish to `0G Storage` and then call `POST /api/agents/:agentId/publish`.
4. For published agents, use `GET /api/agents/:agentId/onchain-registration-intent`, execute the call with the owner wallet, then confirm through `POST /api/agents/:agentId/onchain-registration`.
5. For usage grants, create an authorization intent, execute `authorizeUsage(...)` with the owner wallet, then confirm it through the API.
6. For server-side compute, configure either broker mode or direct API mode.
7. Use `GET /api/diagnostics/compute` before live runs if inference is failing. Without compute credentials it returns a non-fatal readiness payload; actual runs still fail explicitly until broker wallet or direct API credentials are configured. Add `?ack=true` to force provider acknowledgement checks when broker mode is configured.
8. In direct API mode, add `?probe=true` to verify the configured `app-sk-...` key and list available models.

Execution-mode behavior:

- `auto` prefers `zerog_direct_api` only when direct API credentials are fully usable
  direct API requires `ZEROG_COMPUTE_API_KEY`, `ZEROG_COMPUTE_API_BASE`, `ZEROG_COMPUTE_MODEL`, and `ZEROG_COMPUTE_REQUIRE_TEE=false`
- otherwise `auto` falls back to `zerog_broker`
- if a run explicitly requests `zerog_direct_api` and those requirements are not met, the backend fails clearly with `zerog_config_missing`

Current testnet fallback providers default to the official Galileo starter-kit addresses for:

- `llama-3.3-70b-instruct`
- `deepseek-r1-70b`
- `qwen2.5-vl-72b-instruct`

## MCP

Start the MCP stdio server:

```bash
cd /home/divij/vincent/agentvault/backend
npm run mcp
```

Current MCP tools:

- `studio.health`
- `studio.list_templates`
- `studio.list_agents`
- `studio.get_compute_diagnostics`
- `studio.create_agent`
- `studio.get_agent`
- `studio.get_agent_export_manifest`
- `studio.get_publish_intent`
- `studio.confirm_publish`
- `studio.get_onchain_registration_intent`
- `studio.confirm_onchain_registration`
- `studio.list_authorizations`
- `studio.create_authorization_intent`
- `studio.confirm_authorization`
- `studio.start_run`
- `studio.get_run`
- `studio.list_agent_runs`

This bridge is intended for OpenClaw-style runtimes and other MCP-compatible clients. The MCP server exposes the same backend control plane used by the HTTP API.

OpenClaw cross-check:

- saved MCP server definitions use `command`, `args`, optional `env`, and `cwd`
- stdio is the expected local transport for a spawned MCP server
- `openclaw mcp set <name> <json>` stores the definition in OpenClaw's `mcp.servers` config

The export manifest now includes an `openclaw` block with a ready-to-adapt stdio server definition and direct-API vs broker-mode runtime profiles.

## Example Export Manifest

`GET /api/agents/:agentId/export-manifest`

Returns:

- published/onchain status
- API endpoints for runtime invocation
- MCP tool call templates keyed to the agent id
- OpenClaw-ready stdio MCP server definition
- active authorization summary

## Example Create Agent Draft

```json
{
  "name": "Board Research Assistant",
  "owner": "0x123",
  "templateId": "private-research-copilot",
  "description": "Private board and investor research copilot.",
  "collaborators": ["0x456"],
  "privacy": {
    "visibility": "private",
    "dataSensitivity": "restricted",
    "exportability": "owner_authorized"
  },
  "knowledge": {
    "sources": ["board_notes_q1", "investor_memos"]
  },
  "policy": {
    "approvalMode": "human_for_external_actions",
    "allowDelegation": true,
    "maxStepsPerRun": 5
  }
}
```

## Example Publish Confirmation

```json
{
  "publisher": "0x123",
  "packageHash": "0xPACKAGE_HASH_FROM_PUBLISH_INTENT",
  "publishMode": "user_wallet_storage",
  "storageRoot": "0xROOT_FROM_0G_STORAGE",
  "storageTxHash": "0xOPTIONAL_STORAGE_TX"
}
```

## Example Onchain Registration Confirmation

```json
{
  "registrant": "0x123",
  "packageHash": "0xPACKAGE_HASH_FROM_PUBLISH_INTENT",
  "storageRoot": "0xROOT_FROM_0G_STORAGE",
  "chainTxHash": "0xCHAIN_TX_HASH",
  "registryAddress": "0xPRIVATE_AGENT_REGISTRY_ADDRESS",
  "registrationMode": "user_wallet_registry"
}
```

## Example Authorization Intent

```json
{
  "grantee": "0x456",
  "label": "OpenClaw runtime",
  "accessMode": "licensed_mcp",
  "capabilities": ["run.workflow", "read.summary"],
  "expiresAt": 1893456000
}
```

## Example Start Workflow Run

```json
{
  "objective": "Summarize board updates and draft the top three investor follow-ups.",
  "input": {
    "audience": "investors",
    "tone": "concise"
  },
  "runtime": {
    "credentialSource": "user_runtime",
    "executionMode": "auto",
    "providedSecretKeys": ["ZEROG_COMPUTE_API_KEY"]
  }
}
```

Allowed `runtime.executionMode` values:

- `auto`
- `zerog_broker`
- `zerog_direct_api`

## Secret Ownership Model

The backend is designed for runtime-owned secrets by default:

- templates declare `requiredSecrets`
- export manifests tell runtimes which secret classes they need
- runs record `credentialSource`, `executionMode`, and `providedSecretKeys`
- raw secret values should stay in the connected runtime or user environment unless you explicitly choose a hosted-runtime mode
- completed runs still succeed without a backend signer; run traces and audit events fall back to local persistence when 0G Storage writes are unavailable
