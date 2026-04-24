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
      <section className="section-shell">
        <div className="section-core overflow-hidden bg-[#121212] px-6 py-8 text-white md:px-8 md:py-10">
          <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/45">Architecture / Core split</div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.07em] md:text-6xl md:leading-[0.92]">
                The product has three distinct surfaces: narrative, wallet publish, and private runtime orchestration.
              </h1>
              <p className="max-w-[64ch] text-sm leading-8 text-white/62 md:text-base">
                That split is intentional. The site should explain the system clearly, the studio should feel operational,
                and the runtime should protect the boundary between private execution context and verifiable state.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Builder UI", "Drafts, policy, role graph, and secret declarations stay editable until wallet publish."],
                ["0G Storage", "Holds package payloads, knowledge references, traces, and audit artifacts."],
                ["0G Chain", "Anchors ownership, package hash, storage root, and usage rights."],
                ["0G Compute", "Runs planner, specialist, and executor roles inside the A2A workflow."],
              ].map(([title, body], index) => (
                <div
                  key={title}
                  className={`rounded-[1.5rem] border p-5 ${index % 2 === 0 ? "border-white/10 bg-white/[0.06]" : "border-[#c94b2c]/20 bg-[#c94b2c]/10"}`}
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">System node</div>
                  <div className="mt-4 text-xl font-semibold tracking-[-0.04em] text-white">{title}</div>
                  <p className="mt-3 text-sm leading-7 text-white/62">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel
          eyebrow="Boundary model"
          title="What stays private vs what becomes verifiable is explicit."
          body="The product should never blur this line. Private prompts and memory are not the same thing as public proof of ownership and usage authorization."
        >
          <div className="mt-8 grid gap-4">
            {[
              [Lock, "Private execution context", "Prompts, memory, uploaded files, and intermediate A2A reasoning stay in the private path."],
              [Fingerprint, "Verifiable registry state", "Package hash anchors, storage roots, usage grants, and registry ownership become public proofs."],
              [Radio, "Runtime delivery boundary", "API and MCP clients consume the same control plane without owning the registry or storage lifecycle."],
            ].map(([Icon, title, body], index) => (
              <div
                key={title}
                className={`grid gap-4 rounded-[1.45rem] border p-4 md:grid-cols-[56px_1fr] ${index === 1 ? "border-accent/20 bg-accent/10" : "border-black/10 bg-white/75"}`}
              >
                <div className={`grid h-14 w-14 place-items-center rounded-[1.1rem] ${index === 1 ? "bg-accent text-white" : "bg-ink text-white"}`}>
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

        <div className="section-shell">
          <div className="section-core overflow-hidden bg-[#151515] px-6 py-8 text-white md:px-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">A2A workflow map</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] md:text-4xl">Planner, specialist, executor.</h2>
            <p className="mt-4 max-w-[58ch] text-sm leading-7 text-white/62 md:text-base">
              The runtime should show role separation visually. One prompt pretending to be an entire operating system is not a serious agent product.
            </p>

            <div className="mt-8 grid gap-4">
              {[
                ["01", "Planner", "Breaks the objective into bounded tasks and identifies risk or approval boundaries."],
                ["02", "Specialist", "Works against the package context and returns structured intermediate output."],
                ["03", "Executor", "Shapes the final response, suggested actions, and trace payload for persistence."],
              ].map(([step, title, body], index) => (
                <div key={step} className={`rounded-[1.45rem] border p-5 ${index === 1 ? "border-white/10 bg-white/[0.05] md:translate-x-10" : "border-white/10 bg-black/20"}`}>
                  <div className="grid gap-3 md:grid-cols-[72px_1fr] md:items-start">
                    <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/45">{step}</div>
                    <div>
                      <div className="text-xl font-semibold tracking-[-0.04em] text-white">{title}</div>
                      <p className="mt-2 text-sm leading-7 text-white/62">{body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
