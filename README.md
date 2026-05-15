# Private Agent Studio

Private Agent Studio turns a private workflow into an ownable, permissioned, and executable AI agent on 0G.

It is built for teams that want agents to become real product assets, not just prompts saved inside a SaaS account. A user can build an agent from a guided workspace, publish the package to 0G Storage, anchor ownership and usage rights on 0G Chain, run the workflow through 0G Private Computer, and hand the agent to an MCP-compatible runtime such as OpenClaw.

## Live Product

| Surface | Link |
| --- | --- |
| Product app | https://private-agent-studio.vercel.app |
| Studio workspace | https://private-agent-studio.vercel.app/studio |
| Backend API | https://private-agent-studio-backend-1064261519338.europe-west1.run.app |
| 0G registry contract | `0xd06ea0b9AD8935df0e823555F0433604B880711D` |
| Registry explorer | https://chainscan.0g.ai/address/0xd06ea0b9AD8935df0e823555F0433604B880711D |
| Contract deployment tx | https://chainscan.0g.ai/tx/0xb0aefbd872d057f80c09c4d80b7e47ab96211b2c51f4c015d1d232d5c7464e62 |

Production is configured for 0G mainnet (`chainId=16661`) and 0G Router / Private Computer using `0GM-1.0-35B-A3B`.

## The Product

Private Agent Studio is a control plane for private agent ownership.

The user starts with a guided builder, selects a workflow template, and produces a private agent package. The package can then be published, registered, authorized, executed, and exported as a ready-made MCP server. Each stage has a clear product purpose:

| Stage | Product Job |
| --- | --- |
| Build | Shape a private multi-agent workflow without exposing raw technical configuration. |
| Publish | Produce a durable package artifact and storage root on 0G Storage. |
| Register | Anchor ownership, package hash, storage root, and policy hashes on 0G Chain. |
| Authorize | Grant scoped usage rights to a wallet, app, or runtime. |
| Run | Execute the workflow through 0G Private Computer with TEE verification requested. |
| Handoff | Export the agent as hosted API and agent-specific MCP tools. |

The result is a private agent that can be owned, licensed, verified, and used outside the Studio.

## Why It Matters

Agent builders today are strong at prototyping but weak at ownership, privacy, and transferability. A serious team needs to answer harder questions:

- Who owns this agent package?
- Which version was published?
- Where is the agent state stored?
- Who is allowed to run it?
- Can another runtime use it without bypassing policy?
- Can a judge or customer verify that the 0G integration is real?

Private Agent Studio answers those questions with 0G-native rails instead of treating blockchain as a decorative proof badge.

## 0G Integration

| 0G Component | How Private Agent Studio Uses It |
| --- | --- |
| 0G Storage | Published agent packages, run traces, audit artifacts, and encrypted Studio state snapshots. |
| 0G Chain | Mainnet `PrivateAgentRegistry` for agent ownership, package roots, usage grants, and the encrypted state snapshot pointer. |
| 0G Private Computer | Runtime inference path for planner, specialist, and executor calls with TEE verification requested. |
| 0G Router API | OpenAI-compatible production endpoint used by the backend runtime. |

The backend no longer relies on container-local state for production continuity. Studio state is encrypted, uploaded as a 0G Storage snapshot, and referenced through the 0G registry pointer record `private-agent-studio-state`.

## MCP Handoff

Each created agent exposes an agent-specific MCP server over Streamable HTTP using the official Model Context Protocol TypeScript SDK.

For a `Board Research Capsule` agent, the generated tools look like:

```txt
board_research_capsule.run
board_research_capsule.summarize
board_research_capsule.evidence
```

The MCP surface also exposes resources for the manifest, 0G proof, and runbook. This means OpenClaw or another MCP runtime can attach to the created agent directly instead of calling a generic Studio wrapper.

## Current Live Proof

- Vercel frontend is live.
- Cloud Run backend is live.
- 0G mainnet registry contract is deployed.
- Agent package publish flow supports 0G Storage.
- Studio state persists through encrypted 0G Storage snapshots.
- A fresh Cloud Run revision was deployed and the backend recovered the agent list from the 0G-backed state pointer.
- Per-agent MCP endpoints initialize through the official MCP SDK and expose agent-specific tools.

## Repository Map

| Path | Purpose |
| --- | --- |
| [`frontend/`](frontend) | Studio UI, lifecycle workspace, handoff screen, and production Vercel app. |
| [`backend/`](backend) | API server, 0G adapters, encrypted state persistence, runtime orchestration, and MCP endpoints. |
| [`contracts/`](contracts) | `PrivateAgentRegistry` contract used for ownership, roots, and usage grants. |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Technical topology and trust boundaries. |
| [`docs/PRODUCT_DESCRIPTION.md`](docs/PRODUCT_DESCRIPTION.md) | HackQuest-ready product description and deployment copy. |
| [`docs/PITCH_DECK.md`](docs/PITCH_DECK.md) | Slide-by-slide pitch deck content. |
| [`docs/DEMO_SCRIPTS.md`](docs/DEMO_SCRIPTS.md) | Product demo and technical video scripts. |

## Local Development

Backend:

```bash
cd backend
npm install
npm start
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Environment templates:

- [`backend/.env.example`](backend/.env.example)
- [`frontend/.env.example`](frontend/.env.example)

Secrets are not committed. Production reads the 0G private key and 0G Compute API key from managed deployment secrets.
