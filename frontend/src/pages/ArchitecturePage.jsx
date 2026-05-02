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

function Panel({ eyebrow, title, body, tone = "default", children }) {
  const toneClass =
    tone === "accent"
      ? "section-core section-core-accent"
      : tone === "strong"
        ? "section-core section-core-strong"
        : "section-core";

  return (
    <div className="section-shell">
      <section className={`${toneClass} h-full`}>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-3 max-w-[16ch] text-3xl font-semibold tracking-[-0.06em] text-ink md:text-4xl">{title}</h2>
        <p className="mt-4 max-w-[64ch] copy-muted">{body}</p>
        {children}
      </section>
    </div>
  );
}

export function ArchitecturePage() {
  return (
    <div className="space-y-24 pb-24 pt-4">
      <section className="section-shell">
        <div className="section-core section-core-strong overflow-hidden">
          <div className="grid gap-8 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="space-y-6">
              <div className="eyebrow">Architecture / system split</div>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.08em] text-ink md:text-6xl md:leading-[0.92]">
                Narrative, wallet-mediated publish, and private runtime orchestration are separate surfaces by design.
              </h1>
              <p className="max-w-[64ch] text-base leading-8 text-muted">
                The product only becomes credible when those boundaries stay clear. The site explains the product. The
                owner wallet publishes. The runtime executes private workflows. The chain anchors proof.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Builder UI", "Drafts, role graphs, package metadata, and policy state stay editable until publish."],
                ["0G Storage", "Holds encrypted packages, knowledge references, traces, and audit payloads."],
                ["0G Chain", "Anchors ownership, package roots, usage rights, and registry state."],
                ["0G Compute", "Executes planner, specialist, and executor roles inside the A2A runtime."],
              ].map(([title, body], index) => (
                <div
                  key={title}
                  className={`rounded-[1.5rem] border p-5 ${index === 1 || index === 2 ? "border-accent/20 bg-accent/10" : "border-white/10 bg-white/[0.05]"}`}
                >
                  <div className="eyebrow">{index < 2 ? "Control plane" : "Execution rail"}</div>
                  <div className="mt-4 text-xl font-semibold tracking-[-0.04em] text-ink">{title}</div>
                  <p className="mt-3 copy-subtle">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
        <Panel
          eyebrow="Boundary model"
          title="Private context and public proof are not the same thing."
          body="The product should state this explicitly instead of pretending the whole stack is confidential. Private execution context lives offchain. Ownership and permission anchors become public proof."
        >
          <div className="mt-8 grid gap-4">
            {[
              [Lock, "Private execution context", "Prompts, uploaded files, role-to-role messages, and memory references stay inside the private path."],
              [Fingerprint, "Verifiable registry state", "Package hash anchors, storage roots, registry ownership, and usage grants become public rails."],
              [Radio, "Runtime delivery boundary", "API clients and OpenClaw-style runtimes invoke the same backend without owning the registry lifecycle."],
            ].map(([Icon, title, body], index) => (
              <div
                key={title}
                className={`grid gap-4 rounded-[1.4rem] border p-4 md:grid-cols-[56px_1fr] ${index === 1 ? "border-accent/20 bg-accent/10" : "border-white/10 bg-white/[0.04]"}`}
              >
                <div className={`grid h-14 w-14 place-items-center rounded-[1.1rem] ${index === 1 ? "bg-accent text-[#120e0b]" : "bg-white/[0.06] text-accent"}`}>
                  <Icon size={18} weight="light" />
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-[-0.04em] text-ink">{title}</div>
                  <p className="mt-2 copy-subtle">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="section-shell">
          <div className="section-core section-core-accent overflow-hidden">
            <div className="eyebrow">A2A workflow map</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-ink md:text-4xl">Planner, specialist, executor.</h2>
            <p className="mt-4 max-w-[60ch] copy-muted">
              The workflow should make role separation legible. One catch-all prompt is not an agent operating model.
            </p>

            <div className="mt-8 grid gap-4">
              {[
                ["01", "Planner", "Breaks the objective into bounded tasks, identifies approval boundaries, and shapes the specialist request."],
                ["02", "Specialist", "Works against the package context and returns structured intermediate output rather than final prose."],
                ["03", "Executor", "Builds the final artifact, result payload, and trace persistence package for the backend."],
              ].map(([step, title, body], index) => (
                <div
                  key={step}
                  className={`rounded-[1.45rem] border p-5 ${index === 1 ? "border-accent/25 bg-black/20 md:translate-x-10" : "border-white/10 bg-white/[0.04]"}`}
                >
                  <div className="grid gap-3 md:grid-cols-[72px_1fr]">
                    <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-soft">{step}</div>
                    <div>
                      <div className="text-xl font-semibold tracking-[-0.04em] text-ink">{title}</div>
                      <p className="mt-2 copy-subtle">{body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel
          eyebrow="Lifecycle"
          title="Publish, register, and authorize are separate for a reason."
          body="The frontend should not collapse different proof boundaries into one fake success state. Storage publish, chain registration, and grants each need distinct confirmation."
          tone="strong"
        >
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-5">
              <div className="flex items-center gap-3">
                <FileArrowUp size={18} weight="light" className="text-accent" />
                <div className="text-lg font-semibold tracking-[-0.04em] text-ink">Publish flow</div>
              </div>
              <div className="mt-4 space-y-3 copy-subtle">
                <p>1. Builder shapes the package payload and policy state.</p>
                <p>2. Owner wallet uploads encrypted payloads to 0G Storage.</p>
                <p>3. Frontend records the resulting root and transaction hash.</p>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-accent/20 bg-accent/10 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} weight="light" className="text-[#120e0b]" />
                <div className="text-lg font-semibold tracking-[-0.04em] text-ink">Registry flow</div>
              </div>
              <div className="mt-4 space-y-3 copy-subtle">
                <p>1. Backend shapes `registerAgent(...)` calldata.</p>
                <p>2. Owner wallet submits the registry transaction.</p>
                <p>3. Backend confirms the chain transaction and active state.</p>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          eyebrow="Delivery surface"
          title="API and MCP are two views into the same control plane."
          body="That keeps the product consistent. Apps, internal tools, and OpenClaw-style runtimes all operate against the same backend model."
        >
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
              <div className="eyebrow">API</div>
              <p className="mt-3 copy-subtle">
                For product integrations, dashboards, and backend services that want structured lifecycle and run endpoints.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
              <div className="eyebrow">MCP</div>
              <p className="mt-3 copy-subtle">
                For OpenClaw-style local runtimes that need the same lifecycle, publish, and runtime controls over stdio.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <NavLink to="/studio" className="pill-primary group">
              Open studio
              <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 transition-transform duration-700 ease-premium group-hover:translate-x-1">
                <ArrowRight size={16} weight="light" />
              </span>
            </NavLink>
            <NavLink to="/" className="pill-secondary">
              Back to home
            </NavLink>
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel
          eyebrow="Operator studio"
          title="The studio should feel like software, not a hero section wearing form fields."
          body="That is why the route split exists. The architecture page explains the model. The studio handles diagnostics, drafts, publish, registry, grants, and runs."
          tone="accent"
        >
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              [CubeFocus, "Drafts"],
              [BracketsCurly, "Lifecycle"],
              [TerminalWindow, "Run console"],
            ].map(([Icon, label]) => (
              <div key={label} className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                <Icon size={18} weight="light" className="text-accent" />
                <div className="mt-4 text-base font-semibold tracking-[-0.03em] text-ink">{label}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          eyebrow="Onchain consequence"
          title="The contract layer still matters because published agents need durable ownership state."
          body="Drafts can stay offchain. Published agents need a contract registry for ownership, storage roots, package hashes, and grants that survive any single frontend deployment."
          tone="strong"
        >
          <div className="mt-8 rounded-[1.45rem] border border-white/10 bg-black/20 p-5">
            <div className="flex items-center gap-3">
              <Fingerprint size={18} weight="light" className="text-accent" />
              <div className="text-lg font-semibold tracking-[-0.04em] text-ink">Registry guarantees</div>
            </div>
            <p className="mt-4 copy-subtle">
              Package roots, owner identity, and active grants should not disappear because a hosted builder changes state
              shape or goes offline. The registry is what turns the agent from a draft into a durable product asset.
            </p>
          </div>
        </Panel>
      </section>
    </div>
  );
}
