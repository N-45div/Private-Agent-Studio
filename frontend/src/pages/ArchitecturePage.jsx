import {
  ArrowRight,
  BracketsCurly,
  CubeFocus,
  FileArrowUp,
  Fingerprint,
  Lock,
  Radio,
  ShieldCheck,
  TerminalWindow,
} from "@phosphor-icons/react";
import { NavLink } from "react-router-dom";

function Panel({ eyebrow, title, body, children, dark = false }) {
  return (
    <div className="section-shell">
      <section className={`section-core h-full p-6 md:p-8 ${dark ? "bg-[#151515] text-white shadow-none" : ""}`}>
        <div className={`font-mono text-[10px] uppercase tracking-[0.24em] ${dark ? "text-white/45" : "text-black/40"}`}>
          {eyebrow}
        </div>
        <h2 className={`mt-3 text-3xl font-semibold tracking-[-0.05em] md:text-4xl ${dark ? "text-white" : "text-ink"}`}>
          {title}
        </h2>
        <p className={`mt-4 max-w-[64ch] text-sm leading-7 md:text-base ${dark ? "text-white/65" : "text-black/60"}`}>
          {body}
        </p>
        {children}
      </section>
    </div>
  );
}

export function ArchitecturePage() {
  return (
    <div className="space-y-24 pb-24 pt-4">
      <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <Panel
          eyebrow="Architecture"
          title="The system is split into a marketing control plane, a wallet-mediated publish path, and a private A2A runtime."
          body="That separation is intentional. Users need a readable product story, operators need a usable control surface, and the runtime needs a clear boundary between private data and verifiable state."
        >
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["Builder UI", "Creates drafts, shapes policy, and hands off publish actions to the wallet."],
              ["0G Storage", "Stores the package, knowledge references, traces, and audit payloads."],
              ["0G Chain", "Anchors ownership, package hash, usage rights, and registry state."],
              ["0G Compute", "Executes planner, specialist, and executor roles inside the workflow runtime."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[1.35rem] border border-black/10 bg-white/75 p-4">
                <div className="text-lg font-semibold tracking-[-0.04em] text-ink">{title}</div>
                <p className="mt-3 text-sm leading-7 text-black/60">{body}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          eyebrow="Boundary model"
          title="Reasoning stays private. Ownership and permissions become public proofs."
          body="The product should never pretend that everything is confidential onchain. The correct split is private execution context plus public verification rails."
          dark
        >
          <div className="mt-8 grid gap-4">
            {[
              [Lock, "Private inputs", "Prompts, memory, uploaded documents, intermediate role messages, and run traces."],
              [Fingerprint, "Verifiable outputs", "Package hash anchors, storage roots, registration state, and authorization scope hashes."],
              [Radio, "Runtime integration", "OpenClaw or API clients provide execution context and credential references without owning the registry state."],
            ].map(([Icon, title, body]) => (
              <div key={title} className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-3">
                  <Icon size={18} weight="light" className="text-white/70" />
                  <div className="text-lg font-semibold tracking-[-0.04em] text-white">{title}</div>
                </div>
                <p className="mt-3 text-sm leading-7 text-white/62">{body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <Panel
          eyebrow="Workflow runtime"
          title="The A2A model is explicit: planner, specialist, executor."
          body="This avoids the common builder mistake of stuffing every task into one agent prompt. The product should make delegation legible at the workflow level."
        >
          <div className="mt-8 grid gap-4">
            {[
              [CubeFocus, "Planner", "Breaks the objective into bounded tasks and risk notes."],
              [BracketsCurly, "Specialist", "Handles the domain-specific analysis using private package context."],
              [TerminalWindow, "Executor", "Shapes the final output and records the run result."],
            ].map(([Icon, title, body]) => (
              <div key={title} className="grid gap-4 rounded-[1.35rem] border border-black/10 bg-white/75 p-4 md:grid-cols-[56px_1fr]">
                <div className="grid h-14 w-14 place-items-center rounded-[1.1rem] bg-ink text-white">
                  <Icon size={18} weight="light" />
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-[-0.04em] text-ink">{title}</div>
                  <p className="mt-2 text-sm leading-7 text-black/60">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          eyebrow="Lifecycle"
          title="Publish and authorization are separate steps because they should be."
          body="The UI should not blur storage publish, registry anchoring, and usage grants into one fake success action. Each step has a different signer and proof boundary."
        >
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-black/10 bg-[#151515] p-5 text-white">
              <div className="flex items-center gap-3">
                <FileArrowUp size={18} weight="light" className="text-white/70" />
                <div className="text-lg font-semibold tracking-[-0.04em]">Publish flow</div>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/62">
                <p>1. Draft package shaped in the builder.</p>
                <p>2. Owner wallet uploads encrypted package to 0G Storage.</p>
                <p>3. Frontend records storage root and tx hash back into the backend.</p>
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-black/10 bg-white/75 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} weight="light" className="text-black/70" />
                <div className="text-lg font-semibold tracking-[-0.04em] text-ink">Registry flow</div>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-black/60">
                <p>1. Backend shapes `registerAgent(...)` calldata.</p>
                <p>2. Owner wallet submits the registry transaction.</p>
                <p>3. Backend confirms the tx hash and marks the agent registered.</p>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel
          eyebrow="Delivery surface"
          title="The same control plane serves API clients and MCP runtimes."
          body="That keeps the product coherent. Apps, OpenClaw-style runtimes, and internal operators should not need different system models."
        >
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.35rem] border border-black/10 bg-white/75 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">API</div>
              <p className="mt-3 text-sm leading-7 text-black/60">
                For product integrations, dashboards, and backend services that want structured lifecycle and run endpoints.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-black/10 bg-white/75 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">MCP</div>
              <p className="mt-3 text-sm leading-7 text-black/60">
                For OpenClaw-style local runtimes and tool-driven agents that need the same control plane over stdio.
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          eyebrow="Next step"
          title="The operator console should feel like an engineering workspace, not a marketing hero pretending to be a dashboard."
          body="The site now separates narrative pages from the studio route, so the product pitch and the operator surface stop interfering with each other."
          dark
        >
          <div className="mt-8 flex flex-wrap gap-4">
            <NavLink
              to="/studio"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-ink transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
            >
              Open studio
              <ArrowRight size={16} weight="light" />
            </NavLink>
            <NavLink
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
            >
              Back to home
            </NavLink>
          </div>
        </Panel>
      </section>
    </div>
  );
}
