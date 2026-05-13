import { NavLink } from "react-router-dom";
import {
  ArrowRight,
  BracketsCurly,
  Fingerprint,
  Lock,
  Radio,
  ShieldCheck,
  Sparkle,
  TerminalWindow,
} from "@phosphor-icons/react";

const lifecycle = [
  ["01", "Build", "Start from a private agent template and shape the planner, specialist, and executor workflow."],
  ["02", "Publish", "Use the owner wallet to publish the encrypted package to 0G Storage."],
  ["03", "Register", "Anchor ownership, package hash, and storage root on 0G Chain."],
  ["04", "Authorize", "Grant scoped access to wallets, apps, or MCP runtimes."],
  ["05", "Run", "Execute the private workflow through the same control plane."],
];

const stack = [
  [Lock, "0G Storage", "Encrypted packages, memory references, and run traces."],
  [TerminalWindow, "0G Compute", "Planner, specialist, and executor role execution."],
  [Fingerprint, "0G Chain", "Ownership, package proof, and usage rights."],
  [Radio, "API + MCP", "One lifecycle for browser users and external runtimes."],
];

function FlowStep({ step, title, body }) {
  return (
    <div className="flow-step">
      <div className="flow-index">{step}</div>
      <div>
        <div className="text-base font-semibold tracking-[-0.03em] text-ink">{title}</div>
        <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      </div>
    </div>
  );
}

function StackRow({ icon: Icon, title, body }) {
  return (
    <div className="stack-row">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-accent">
        <Icon size={18} weight="light" />
      </div>
      <div>
        <div className="text-base font-semibold tracking-[-0.03em] text-ink">{title}</div>
        <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
      </div>
    </div>
  );
}

function StudioPreview() {
  return (
    <div className="studio-preview">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="eyebrow">Studio flow</div>
          <div className="mt-1 text-lg font-semibold tracking-[-0.04em] text-ink">Private Research Copilot</div>
        </div>
        <div className="signal-dot" />
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          {["Build", "Publish", "Register", "Authorize", "Run"].map((item, index) => (
            <div key={item} className={index === 0 ? "preview-phase preview-phase-active" : "preview-phase"}>
              <span className="font-mono text-[10px] text-soft">{String(index + 1).padStart(2, "0")}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="rounded-[1.25rem] border border-white/10 bg-black/20 p-5">
          <div className="eyebrow">Workflow canvas</div>
          <div className="mt-5 grid gap-3">
            {["Planner", "Specialist", "Executor"].map((role) => (
              <div key={role} className="rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{role}</span>
                  <span className="node-port" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
            Wallet-published package
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <div className="pb-20 pt-3">
      <section className="grid min-h-[calc(100dvh-8rem)] items-center gap-10 py-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <div className="max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-soft">
            <Sparkle size={14} weight="light" />
            Private agent lifecycle on 0G
          </div>

          <div className="space-y-6">
            <h1 className="max-w-[12ch] text-5xl font-semibold tracking-[-0.08em] text-ink md:text-7xl md:leading-[0.92]">
              Private Agent Studio
            </h1>
            <p className="max-w-[66ch] text-lg leading-8 text-muted">
              Build private multi-agent workflows visually, publish encrypted packages through the owner wallet,
              register proof onchain, authorize usage, and run the workflow through one control plane.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <NavLink to="/studio" className="pill-primary group">
              Open Studio
              <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 transition-transform duration-700 ease-premium group-hover:translate-x-1">
                <ArrowRight size={16} weight="light" />
              </span>
            </NavLink>
            <NavLink to="/architecture" className="pill-secondary">
              Architecture
            </NavLink>
          </div>

          <div className="grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
            <div>
              <div className="text-2xl font-semibold tracking-[-0.04em] text-ink">Track 1</div>
              <div className="mt-1 text-sm text-muted">Agent infrastructure</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-[-0.04em] text-ink">Track 5</div>
              <div className="mt-1 text-sm text-muted">Privacy rails</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tracking-[-0.04em] text-ink">Track 3</div>
              <div className="mt-1 text-sm text-muted">Agent economy</div>
            </div>
          </div>
        </div>

        <StudioPreview />
      </section>

      <section className="landing-band">
        <div className="max-w-3xl">
          <div className="eyebrow">Product flow</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-ink md:text-5xl">
            One lifecycle instead of scattered agent tools.
          </h2>
        </div>
        <div className="mt-10 grid gap-3 lg:grid-cols-5">
          {lifecycle.map(([step, title, body]) => (
            <FlowStep key={step} step={step} title={title} body={body} />
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-8 py-8 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
        <div className="max-w-2xl space-y-5">
          <div className="eyebrow">Why it matters</div>
          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-ink md:text-5xl">
            Private creation with public proof.
          </h2>
          <p className="text-base leading-8 text-muted">
            Private Agent Studio keeps prompts, memory, uploaded knowledge, and intermediate role messages in the private path.
            Ownership, package roots, and usage grants become verifiable rails on 0G.
          </p>
          <NavLink to="/studio" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
            Start in the builder
            <ArrowRight size={15} weight="light" />
          </NavLink>
        </div>

        <div className="stack-list">
          {stack.map(([Icon, title, body]) => (
            <StackRow key={title} icon={Icon} title={title} body={body} />
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <div className="eyebrow">Hackathon position</div>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-ink md:text-5xl">
            A private agent builder and lifecycle control plane on 0G.
          </h2>
          <p className="mt-4 max-w-[70ch] text-base leading-8 text-muted">
            The demo should show the product in one pass: choose a template, shape the workflow, publish to 0G Storage,
            register on 0G Chain, authorize usage, and run the private workflow.
          </p>
        </div>
        <NavLink to="/studio" className="pill-primary shrink-0">
          Launch Studio
          <BracketsCurly size={16} weight="light" />
        </NavLink>
      </section>
    </div>
  );
}
