# Private Agent Studio

Private Agent Studio is a private agent builder and lifecycle control plane on 0G. It helps a non-technical user create a multi-agent workflow, publish the agent package, prove ownership on 0G Chain, grant scoped access, and run TEE-verified inference through 0G Private Computer.

The product is not another prompt playground. It is a studio for turning a private workflow into an ownable, verifiable agent asset.

## Live Product

- App: https://private-agent-studio.vercel.app
- Studio: https://private-agent-studio.vercel.app/studio
- Backend: https://private-agent-studio-backend-1064261519338.europe-west1.run.app
- 0G mainnet registry: `0xd06ea0b9AD8935df0e823555F0433604B880711D`
- Registry explorer: https://chainscan.0g.ai/address/0xd06ea0b9AD8935df0e823555F0433604B880711D
- Deployment transaction: https://chainscan.0g.ai/tx/0xb0aefbd872d057f80c09c4d80b7e47ab96211b2c51f4c015d1d232d5c7464e62
- 0G Compute model: `0GM-1.0-35B-A3B`

## Product Intro

Most agent builders make it easy to test an idea, but hard to own it.

Private Agent Studio is built around the full lifecycle of a real private agent:

1. Build a workflow from a guided canvas.
2. Publish the agent package through the owner-controlled flow.
3. Register package proof and ownership on 0G Chain.
4. Authorize another wallet, app, or runtime to use it.
5. Run the workflow with TEE-verified 0G inference.

That makes the agent more than a saved prompt. It becomes a private, portable workflow with verifiable ownership and controlled usage.

## Why This Matters

AI agents are becoming reusable assets, but most builders do not solve the hard parts around privacy, provenance, and permissioning.

Private Agent Studio focuses on that gap:

- A founder can package a private operating workflow without exposing the full prompt stack.
- A team can prove which wallet owns an agent package.
- A reviewer can inspect the lifecycle: build, publish, register, authorize, run.
- A runtime can execute through the same backend control plane instead of bypassing product policy.
- 0G gives the product storage, chain, and compute rails that fit the agent lifecycle directly.

## Product Flow

### 1. Build

The studio starts with a clean builder flow instead of a technical settings dump. The user chooses a template, edits the agent roles, reviews the package shape, and keeps the draft private until they are ready to publish.

### 2. Publish

Publishing turns the draft into a package with a stable hash and storage proof path. This separates the private build step from the public proof step.

### 3. Register

The `PrivateAgentRegistry` contract anchors ownership and package metadata on 0G mainnet. The registered address becomes the judge-visible proof that the product is deployed on the ecosystem, not just simulated locally.

### 4. Authorize

Owners can create scoped usage grants. This is the foundation for private agent licensing, delegated execution, and future MCP/OpenClaw-style runtime access.

### 5. Run

The runtime executes a planner, specialist, and executor workflow through 0G Router. Requests are sent with TEE verification enabled, and the backend records trace metadata so the product can show which run used verified 0G inference.

## 0G Integration

Private Agent Studio uses 0G as the product backbone:

| 0G Component | Product Role |
| --- | --- |
| 0G Chain | Mainnet `PrivateAgentRegistry` for agent ownership, package hashes, storage roots, and usage grants. |
| 0G Storage | Package and proof layer for published agent assets and long-term run artifacts. |
| 0G Private Computer | TEE-verified inference for the planner, specialist, and executor workflow. |
| 0G Router API | OpenAI-compatible runtime endpoint used by the backend execution path. |

This positions the project strongest for the 0G APAC Hackathon agent infrastructure track, with a clear secondary fit for privacy/sovereign infrastructure and agent economy flows.

## Current Proof

- The frontend is live on Vercel.
- The backend is live on Google Cloud Run.
- The registry contract is deployed on 0G mainnet.
- Backend health reports 0G mainnet `chainId=16661` with the registry configured.
- 0G Compute diagnostics confirm the router API is reachable.
- A live workflow run completed through the planner, specialist, and executor path with TEE verification reported by the 0G response trace.

## Repository Map

- [`ARCHITECTURE.md`](ARCHITECTURE.md): production topology, lifecycle diagrams, and proof boundaries
- [`backend/`](backend): API server, 0G adapters, lifecycle services, runtime orchestration, MCP bridge
- [`contracts/`](contracts): `PrivateAgentRegistry` smart contract package
- [`frontend/`](frontend): Vercel-hosted Studio UI and lifecycle console

## Environment

Use the example files as templates:

- [`backend/.env.example`](backend/.env.example)
- [`frontend/.env.example`](frontend/.env.example)

Secrets are intentionally not committed. The production backend reads the 0G Compute key from Google Secret Manager, and the frontend only needs the public backend URL.
