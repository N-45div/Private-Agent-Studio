# Private Agent Studio

Private Agent Studio is a privacy-first builder for creating, publishing, authorizing, and running private multi-agent workflows on 0G.

- the user starts from a guided agent template
- the draft stays editable and private until the owner wallet publishes it
- publish, registration, authorization, and runtime are separate proof steps
- the same control plane serves both the browser UI and MCP/OpenClaw-style runtimes

## Product Story

Most agent builders stop at “prompt in, output out.”

Private Agent Studio is built for the full lifecycle of a real agent asset:

1. build the workflow visually
2. publish the package through the owner wallet
3. register ownership and package proof onchain
4. authorize scoped usage for other wallets or runtimes
5. run the private workflow through the same control plane

The interface is designed like a workspace, not a settings dump. Build is the first screen, the phase rail stays navigation-only, and the canvas stays readable while the lifecycle moves forward in visible steps.

## Why It Matters

The product solves a simple but important gap: teams need private agent tooling that still has ownership, proof, and permission rails.

This is the reason the product is split into distinct steps instead of one fake “complete” button:

- draft creation
- `0G Storage` publish
- `0G Chain` registration
- scoped authorization
- private runtime execution

That makes the flow understandable for non-technical users and defensible for judges.

## 0G Fit

Private Agent Studio maps directly to the 0G stack:

- `0G Storage`: encrypted package publish, draft payload anchoring, run trace persistence
- `0G Compute`: planner / specialist / executor workflow execution
- `0G Chain`: published-agent ownership and usage rights
- `Agent ID` and privacy rails: future portable ownership and confidential agent assets

This is a strong fit for:

- `Track 1` for orchestration and agent infrastructure
- `Track 5` for privacy and sovereign execution
- `Track 3` for agent ownership and agent economy flows

## What Judges Should See

The strongest demo story is:

1. choose a template
2. shape the workflow
3. publish the package to `0G Storage`
4. anchor ownership on `0G Chain`
5. authorize usage
6. run the private workflow

That sequence shows product value, 0G integration depth, and a clean user journey in one pass.

## What Is Real

- draft creation is backed by the backend
- publish and chain registration are separate confirmation steps
- authorization and revocation are exposed as real lifecycle actions
- workflow runs are orchestrated through the backend
- compute diagnostics fail closed instead of pretending execution exists

## Repo Map

- [`ARCHITECTURE.md`](ARCHITECTURE.md): lifecycle diagrams and system model
- [`backend/`](backend): API, adapters, lifecycle services, MCP bridge
- [`contracts/`](contracts): registry contract package
- [`frontend/`](frontend): builder UI and workflow console
