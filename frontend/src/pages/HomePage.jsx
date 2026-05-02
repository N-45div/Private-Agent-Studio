import { NavLink } from "react-router-dom";
import {
  ArrowRight,
  BracketsCurly,
  CubeFocus,
  Fingerprint,
  Lock,
  Radio,
  ShieldCheck,
  Sparkle,
  TerminalWindow,
} from "@phosphor-icons/react";

function StoryBlock({ eyebrow, title, body, tone = "default", children, className = "" }) {
  const toneClass =
    tone === "accent"
      ? "section-core section-core-accent text-ink"
      : tone === "strong"
        ? "section-core section-core-strong text-ink"
        : "section-core text-ink";

  return (
    <div className={`section-shell ${className}`}>
      <section className={`${toneClass} h-full`}>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-3 max-w-[15ch] text-3xl font-semibold tracking-[-0.06em] md:text-4xl">{title}</h2>
        <p className="mt-4 max-w-[62ch] copy-muted">{body}</p>
        {children}
      </section>
    </div>
  );
}

function MiniNode({ step, title, body }) {
  return (
    <div className="metric-card">
      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-soft">{step}</div>
      <div className="mt-4 text-xl font-semibold tracking-[-0.04em] text-ink">{title}</div>
      <p className="mt-3 copy-subtle">{body}</p>
    </div>
  );
}

export function HomePage() {
  return (
    <div className="space-y-24 pb-24 pt-4">
      <section className="grid min-h-[100dvh] items-center gap-8 pb-12 xl:grid-cols-[1.06fr_0.94fr]">
        <div className="space-y-8">
          <div className="glass-pill inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-soft">
            <Sparkle size={14} weight="light" />
            Track 1 + Track 5 + Track 3
          </div>

          <div className="space-y-6">
            <h1 className="max-w-5xl text-5xl font-semibold tracking-[-0.09em] text-ink md:text-7xl md:leading-[0.9]">
              Build private multi-agent products on 0G with a control plane that looks engineered, not improvised.
            </h1>
            <p className="max-w-[62ch] text-base leading-8 text-muted md:text-lg">
              Private Agent Studio is a wallet-mediated builder for encrypted agent packages, onchain ownership rails,
              and A2A workflow delivery through API and MCP. The product is shaped around the real 0G split: storage,
              chain, compute, and private runtime execution.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <NavLink to="/studio" className="pill-primary group">
              Open operator console
              <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 transition-transform duration-700 ease-premium group-hover:translate-x-1">
                <ArrowRight size={16} weight="light" />
              </span>
            </NavLink>
            <NavLink to="/architecture" className="pill-secondary">
              Review architecture
            </NavLink>
          </div>
        </div>

        <div className="section-shell md:translate-y-10">
          <div className="section-core section-core-strong grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="eyebrow">System posture</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">Control plane / runtime split</div>
              </div>
              <div className="signal-dot" />
            </div>

            <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
                <div className="eyebrow">Builder side</div>
                <div className="mt-4 space-y-3">
                  {[
                    "Draft packages stay editable until wallet publish.",
                    "Owner wallet writes package payloads to 0G Storage.",
                    "Registry state is anchored separately from private memory.",
                  ].map((line) => (
                    <div key={line} className="rounded-[1.2rem] border border-white/8 bg-white/[0.035] px-4 py-3 text-sm leading-7 text-muted">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[1.5rem] border border-accent/25 bg-accent/10 p-5">
                  <div className="eyebrow text-[#d8a786]">Runtime side</div>
                  <div className="mt-3 text-xl font-semibold tracking-[-0.04em] text-ink">Planner, specialist, executor</div>
                  <p className="mt-3 copy-subtle">
                    A2A roles stay explicit. One prompt pretending to be the whole system is not the product.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                  <div className="eyebrow">Delivery</div>
                  <div className="mt-3 text-xl font-semibold tracking-[-0.04em] text-ink">API + MCP</div>
                  <p className="mt-3 copy-subtle">
                    Apps and OpenClaw-style runtimes consume the same control plane instead of parallel integration stacks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.06fr_0.94fr]">
        <StoryBlock
          eyebrow="Product thesis"
          title="This is not a generic agent builder."
          body="The product matters because it handles the part other builders skip: private storage, owner-controlled publish, usage rights, and runtime portability."
          tone="strong"
        >
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <MiniNode step="Track 1" title="Agentic infrastructure" body="Multi-agent orchestration, role graphs, runtime handoff, and backend lifecycle flows." />
            <MiniNode step="Track 5" title="Privacy rails" body="Encrypted package publish, private memory, controlled execution context, and explicit proof boundaries." />
            <MiniNode step="Track 3" title="Agent economy" body="Owned agent assets, grants, licensable delivery, and export manifests for external runtimes." />
            <MiniNode step="Runtime" title="Operational surface" body="One studio for builders and operators instead of a marketing page pretending to be software." />
          </div>
        </StoryBlock>

        <StoryBlock
          eyebrow="Trust boundary"
          title="Private reasoning stays private. Ownership becomes public proof."
          body="The system is strongest when it is honest about the split. Prompts, memory, uploads, and intermediate role messages stay in the private path. Ownership, package roots, and grants become verifiable rails."
          tone="accent"
        >
          <div className="mt-8 grid gap-4">
            {[
              { icon: Lock, title: "Private inputs", body: "Prompt payloads, uploaded documents, memory references, and A2A intermediate state." },
              { icon: Fingerprint, title: "Verifiable outputs", body: "Package hashes, storage roots, registration state, and authorization scope anchors." },
              { icon: Radio, title: "Runtime boundary", body: "API clients and OpenClaw-style runtimes invoke the same product surface without owning state." },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-3">
                  <item.icon size={18} weight="light" className="text-accent" />
                  <div className="text-lg font-semibold tracking-[-0.04em] text-ink">{item.title}</div>
                </div>
                <p className="mt-3 copy-subtle">{item.body}</p>
              </div>
            ))}
          </div>
        </StoryBlock>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <StoryBlock
          eyebrow="Lifecycle"
          title="The publish path follows the actual 0G capability split."
          body="Draft locally, publish with the owner wallet, register state onchain, authorize use, then run A2A workflows through API or MCP."
        >
          <div className="mt-8 space-y-3">
            {[
              ["01", "Draft package", "Workflow graph, policy, roles, and secret declarations stay local until publish."],
              ["02", "Publish from wallet", "The browser wallet pushes the package payload to 0G Storage and returns root and transaction hash."],
              ["03", "Anchor registry state", "The owner confirms package hash and storage root through the chain registry."],
              ["04", "Authorize usage", "Wallets or runtimes receive explicit grants with scoped capabilities."],
              ["05", "Run on 0G", "Planner, specialist, and executor execute through the same backend control plane."],
            ].map(([step, title, body]) => (
              <div key={step} className="metric-card grid gap-4 md:grid-cols-[64px_1fr]">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-soft">{step}</div>
                <div>
                  <div className="text-lg font-semibold tracking-[-0.04em] text-ink">{title}</div>
                  <p className="mt-2 copy-subtle">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </StoryBlock>

        <div className="grid gap-6">
          <StoryBlock
            eyebrow="Current build"
            title="The backend already exposes the real rails."
            body="Draft creation, publish intents, owner confirmation, registry anchoring, usage grants, export manifests, diagnostics, and run orchestration are live parts of the product."
            tone="strong"
          >
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                [CubeFocus, "Draft creation"],
                [ShieldCheck, "Compute diagnostics"],
                [BracketsCurly, "Export manifest"],
                [TerminalWindow, "A2A runtime"],
              ].map(([Icon, label]) => (
                <div key={label} className="rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4">
                  <Icon size={18} weight="light" className="text-accent" />
                  <div className="mt-4 text-base font-semibold tracking-[-0.03em] text-ink">{label}</div>
                </div>
              ))}
            </div>
          </StoryBlock>

          <StoryBlock
            eyebrow="Routes"
            title="Read the system here. Operate the product in the studio."
            body="The site is split on purpose. Home sells the thesis. Architecture explains the system. Studio handles the actual backend lifecycle."
            tone="accent"
          >
            <div className="mt-8 flex flex-wrap gap-4">
              <NavLink to="/studio" className="pill-primary group">
                Launch studio
                <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 transition-transform duration-700 ease-premium group-hover:translate-x-1">
                  <ArrowRight size={16} weight="light" />
                </span>
              </NavLink>
              <NavLink to="/architecture" className="pill-secondary">
                Inspect architecture
              </NavLink>
            </div>
          </StoryBlock>
        </div>
      </section>
    </div>
  );
}
