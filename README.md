# Private Agent Studio

`Private Agent Studio` is a privacy-first, no-code platform for building private, ownable, and exportable multi-agent workflows on 0G.

This repo started as `AgentVault`; the current product direction is broader:

- visual workflow and template-based agent creation
- private memory and knowledge on `0G Storage`
- TEE-verified role execution on `0G Compute`
- onchain export / authorization rails on `0G Chain`
- portable ownership and licensing paths designed around `ERC-7857`
- API + MCP access so apps and agent runtimes can invoke the same control plane

## Why This Product

Generic no-code agent builders already exist. The differentiator here is:

- **Track 1:** multi-agent orchestration and private long-context state
- **Track 5:** confidential prompts, memory, and execution context
- **Track 3:** agent ownership, licensing, and agent-as-a-service workflows

The thesis:

> Teams should be able to build workflow agents without code, keep their memory and prompts private, and still export, authorize, and monetize those agents with verifiable onchain rails.

Operationally, that also means:

> The platform should define what secrets an agent needs, but the connected runtime should usually own and inject those secrets.

## Product Scope

Current MVP direction:

- template catalog for private workflow agents
- signer-free local draft creation
- explicit user-wallet publish flow for `0G Storage`
- multi-agent runs with planner / specialist / executor roles on `0G Compute`
- run traces and audit events persisted to `0G Storage`
- dedicated `PrivateAgentRegistry` contract for ownership and usage authorization on `0G Chain`
- MCP bridge for OpenClaw-style runtime access
- runtime-owned secret injection for model and tool credentials

Planned next layer:

- ERC-7857 export / clone / authorization flow
- pricing and usage rights
- wallet-native `.0g` and `.robot` identity integration
- onchain policy and licensing state

## Track Mapping

- **Primary:** Track 1 `Agentic Infrastructure & OpenClaw Lab`
- **Secondary:** Track 5 `Privacy & Sovereign Infrastructure`
- **Commercialization layer:** Track 3 `Agentic Economy & Autonomous Applications`

Why this maps cleanly:

- Track 1: private multi-agent orchestration, state persistence, and workflow runtime
- Track 5: encrypted storage, TEE-backed inference verification, and scoped agent permissions
- Track 3: exportable agents, licensing, paid usage, and agent-as-a-service

## Repo Layout

- [`ARCHITECTURE.md`](/home/divij/vincent/agentvault/ARCHITECTURE.md): product and system diagrams
- [`backend/`](/home/divij/vincent/agentvault/backend): backend runtime and API
- [`contracts/`](/home/divij/vincent/agentvault/contracts): onchain registry / anchoring package
- [`/.env.example`](/home/divij/vincent/agentvault/.env.example): runtime configuration

## What Is Real Today

- `0G Storage` writes are wired through `@0gfoundation/0g-ts-sdk`
- `0G Compute` calls are wired through `@0glabs/0g-serving-broker`
- direct compute API mode is supported via `app-sk-...` credentials when configured
- TEE verification is enforced when enabled through `processResponse`
- the contract package compiles successfully for the onchain registry path using `solc 0.8.26` and `evmVersion: cancun`
- the backend no longer requires a signer to create agent drafts
- publish and run paths fail explicitly when the needed 0G capabilities are not configured
- the backend now exposes compute diagnostics and tries the documented Galileo fallback providers when broker discovery is empty
- the backend now exposes agent export manifests for API and MCP consumers

## Verified 0G Building Blocks

These product assumptions were cross-checked against current 0G docs and ecosystem material:

- `0G Storage` supports browser wallet signer flows through `BrowserProvider(...).getSigner()` and `indexer.upload(..., signer)`: [Storage SDK](https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk)
- `0G Compute` supports inference with TEE response verification: [Compute Inference](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/inference)
- `0G Compute` also supports direct API access via `app-sk-<SECRET>` tokens: [Compute Inference](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/inference)
- `ERC-7857` supports encrypted metadata, authorization, and cloning semantics for intelligent NFTs: [ERC-7857 Standard](https://docs.0g.ai/developer-hub/building-on-0g/inft/erc7857)
- `AI Context` frames private agent ownership and encrypted agent payloads as a first-class 0G theme: [AI Context](https://docs.0g.ai/ai-context)
- `.0g` and `.robot` are positioned as identity rails for users and agents: [Introducing .0g](https://0g.ai/blog/introducing-0g-domain), [0G x Unstoppable Domains](https://0g.ai/blog/0g-unstoppable-domains-launch-agi-and-robot)
- `0G Chain` deployment uses standard EVM tooling, and the current docs recommend compiling with `evmVersion: cancun`: [Deploy Contracts on 0G Chain](https://docs.0g.ai/developer-hub/building-on-0g/contracts-on-0g/deploy-contracts)
- MCP tool semantics are standardized through `tools/list` and `tools/call`: [MCP Tools Spec](https://modelcontextprotocol.io/specification/2025-03-26/server/tools)

## Why The Contract Exists

The builder does **not** need a contract for local drafts.

It **does** need an onchain contract once an agent becomes a published asset, because the product needs verifiable state for:

- wallet ownership of published agents
- package hash and storage root anchoring
- usage authorization for other wallets, apps, or MCP runtimes
- future licensing and export flows

That is why the repo now includes `PrivateAgentRegistry` instead of trying to force all builder state into the old treasury-oriented registry.

## End-to-End Order

1. Copy [`/home/divij/vincent/agentvault/.env.example`](/home/divij/vincent/agentvault/.env.example) into your runtime environment.
2. Re-verify the current `ZEROG_RPC_URL`, `ZEROG_CHAIN_ID`, and storage indexer endpoint from the latest 0G docs before deployment.
3. Install and compile the contract package:

```bash
cd /home/divij/vincent/agentvault/contracts
npm install
npm run compile
```

4. Deploy the onchain registry:

```bash
cd /home/divij/vincent/agentvault/contracts
npm run deploy:testnet
```

5. Set `PRIVATE_AGENT_REGISTRY_ADDRESS` to the deployed registry address.
6. Decide your runtime model:
   - user-wallet publication for agent packages
   - broker-wallet compute on the server
   - or direct compute API via `app-sk-...`
7. Install and start the backend:

```bash
cd /home/divij/vincent/agentvault/backend
npm install
npm start
```

8. Optionally start the MCP bridge for OpenClaw and other MCP clients:

```bash
cd /home/divij/vincent/agentvault/backend
npm run mcp
```

9. Check `GET /health` or the MCP tool `studio.health` for runtime readiness.
10. Create agent drafts without a signer.
11. Use `publish-intent` to get the package payload, then publish with the user wallet.
12. Confirm publish through the API or MCP before treating the agent as a published asset.
13. Use `onchain-registration-intent` to get the owner-wallet call data for `PrivateAgentRegistry.registerAgent(...)`.
14. Confirm the onchain registration after the transaction lands.
15. Use authorization intents to grant API or MCP usage rights to other wallets or runtimes.

## Current Verification

- Contract package compiles successfully with Hardhat.
- Backend imports successfully with the real 0G SDK dependencies installed.
- MCP server imports and responds to protocol initialization and tool listing.
- Backend readiness shows signer, registry, and direct-compute capability separately.
- Draft creation no longer depends on a backend private key.
- The builder lifecycle now supports draft -> publish -> onchain registration -> onchain authorization.
- The backend is being expanded from a treasury-specific prototype into a reusable multi-agent workflow runtime.

## Remaining External Requirements

- user wallet publishing flow in the frontend
- funded signer only if you want broker-mode compute or backend relays
- current 0G network values verified from official docs
- deployed registry contract
- reachable `0G Compute` provider or direct API credentials
- reachable `0G Storage` indexer

## Current Galileo Compute Status

As of `2026-04-18`, the backend publish and onchain registration flow works live on Galileo, but broker-mode compute is still constrained by the currently published provider metadata:

- broker `listService()` can still return no providers in a backend node process
- the starter-kit source itself still uses the official provider set `llama-3.3-70b-instruct`, `deepseek-r1-70b`, and `qwen2.5-vl-72b-instruct`
- two of those providers currently publish malformed relative endpoints, and one publishes an absolute endpoint that times out from this environment

Because of that, the backend now exposes `GET /api/diagnostics/compute` and uses the official starter-kit source provider addresses as fallbacks instead of assuming SDK discovery will succeed.

For direct API mode, the backend also supports OpenAI-compatible probing through `GET /api/diagnostics/compute?probe=true` when `ZEROG_COMPUTE_API_KEY`, `ZEROG_COMPUTE_API_BASE`, and `ZEROG_COMPUTE_MODEL` are configured.
