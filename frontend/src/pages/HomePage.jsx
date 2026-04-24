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
} from "@phosphor-icons/react";

function Block({ eyebrow, title, body, children, dark = false, className = "" }) {
  return (
    <div className={`section-shell ${className}`}>
      <div className={`section-core h-full p-6 md:p-8 ${dark ? "bg-[#151515] text-white shadow-none" : ""}`}>
        <div className={`font-mono text-[10px] uppercase tracking-[0.24em] ${dark ? "text-white/45" : "text-black/40"}`}>
          {eyebrow}
        </div>
        <h2 className={`mt-3 text-3xl font-semibold tracking-[-0.05em] md:text-4xl ${dark ? "text-white" : "text-ink"}`}>
          {title}
        </h2>
        <p className={`mt-4 max-w-[62ch] text-sm leading-7 md:text-base ${dark ? "text-white/65" : "text-black/60"}`}>
          {body}
        </p>
        {children}
      </div>
    </div>
  );
}

export function HomePage() {
  return (
    <div className="space-y-24 pb-24 pt-4">
      <section className="grid min-h-[100dvh] items-center gap-8 pb-10 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/65 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-black/45">
            <Sparkle size={14} weight="light" />
            Private Agent Studio on 0G
          </div>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.08em] text-ink md:text-7xl md:leading-[0.9]">
              Build private, ownable multi-agent products without reducing them to generic prompt wrappers.
            </h1>
            <p className="max-w-[62ch] text-base leading-8 text-black/62 md:text-lg">
              Private Agent Studio is a no-code control plane for encrypted agent packages, 0G-native execution,
              wallet-owned publishing, and API or MCP runtime handoff. It is designed to hit Track 1, Track 5, and Track 3 together.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <NavLink
              to="/studio"
              className="group inline-flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
            >
              Open operator console
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                <ArrowRight size={16} weight="light" />
              </span>
            </NavLink>
            <NavLink
              to="/architecture"
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-5 py-3 text-sm font-medium text-ink transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
            >
              View system architecture
            </NavLink>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="section-shell md:translate-y-8">
            <div className="section-core h-full bg-[#151515] p-6 text-white">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">Layer / 01</div>
              <div className="mt-8 text-2xl font-semibold tracking-[-0.05em]">Private package memory</div>
              <p className="mt-3 text-sm leading-7 text-white/62">
                Agent packages, uploaded knowledge, and run traces stay rooted in 0G Storage rather than getting trapped inside a hosted builder.
              </p>
            </div>
          </div>
          <div className="section-shell">
            <div className="section-core h-full p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Layer / 02</div>
              <div className="mt-8 text-2xl font-semibold tracking-[-0.05em] text-ink">Wallet-owned publishing</div>
              <p className="mt-3 text-sm leading-7 text-black/60">
                The browser wallet publishes the package, then the owner confirms package hash and storage root onchain through the registry flow.
              </p>
            </div>
          </div>
          <div className="section-shell">
            <div className="section-core h-full p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Layer / 03</div>
              <div className="mt-8 text-2xl font-semibold tracking-[-0.05em] text-ink">A2A runtime</div>
              <p className="mt-3 text-sm leading-7 text-black/60">
                Planner, specialist, and executor roles form a multi-agent workflow instead of a single assistant pretending to do everything.
              </p>
            </div>
          </div>
          <div className="section-shell md:-translate-y-8">
            <div className="section-core h-full bg-[#151515] p-6 text-white">
              <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">Layer / 04</div>
              <div className="mt-8 text-2xl font-semibold tracking-[-0.05em]">API and MCP delivery</div>
              <p className="mt-3 text-sm leading-7 text-white/62">
                The product can serve apps and OpenClaw-style runtimes through the same backend control plane instead of separate integration stacks.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Block
          eyebrow="Why this product"
          title="It is not another agent builder. It is a private shipping surface for agent products."
          body="Generic builders stop at prompt editing. This system handles the lifecycle that matters for the 0G ecosystem: private memory, verifiable ownership, usage authorization, and runtime portability."
        >
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["Track 1", "Multi-agent orchestration, workflow state, and runtime handoff."],
              ["Track 5", "Private prompts, encrypted storage, and wallet-scoped publishing."],
              ["Track 3", "Agent-as-a-service, export rights, authorization, and monetizable usage."],
              ["Runtime", "API plus MCP delivery instead of a closed interface silo."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[1.35rem] border border-black/10 bg-white/75 p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">{title}</div>
                <p className="mt-3 text-sm leading-7 text-black/60">{body}</p>
              </div>
            ))}
          </div>
        </Block>

        <Block
          eyebrow="Trust model"
          title="What remains private vs what becomes verifiable is explicit."
          body="The product keeps reasoning and memory private while surfacing ownership and permission rails onchain. That boundary is one of the main design advantages."
          dark
        >
          <div className="mt-8 grid gap-4">
            {[
              { icon: Lock, title: "Private by default", body: "Prompts, memory, uploaded files, intermediate A2A messages, and secret references." },
              { icon: Fingerprint, title: "Verifiable onchain", body: "Package hash, storage root anchor, authorization scope hashes, and registry ownership state." },
              { icon: Radio, title: "Runtime-scoped", body: "Connected runtimes provide credentials and execute within explicit workflow and permission boundaries." },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-3">
                  <item.icon size={18} weight="light" className="text-white/70" />
                  <div className="text-lg font-semibold tracking-[-0.04em] text-white">{item.title}</div>
                </div>
                <p className="mt-3 text-sm leading-7 text-white/62">{item.body}</p>
              </div>
            ))}
          </div>
        </Block>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Block
          eyebrow="0G-native flow"
          title="The product flow follows the actual docs-backed 0G capability split."
          body="Storage publish, chain registration, compute execution, and runtime invocation each live in the correct place. That gives the demo credibility and keeps the product story coherent."
        >
          <div className="mt-8 space-y-3">
            {[
              ["01", "Draft locally", "Shape the package, policy, roles, and secret requirements without a backend signer."],
              ["02", "Publish from wallet", "Use the browser wallet to upload the package to 0G Storage."],
              ["03", "Anchor onchain", "Confirm package hash and storage root with the owner wallet through the registry."],
              ["04", "Authorize usage", "Grant wallets or runtimes controlled access through explicit scope hashes."],
              ["05", "Run A2A workflows", "Invoke planner, specialist, and executor through API or MCP."],
            ].map(([step, title, body]) => (
              <div key={step} className="grid gap-4 rounded-[1.35rem] border border-black/10 bg-white/75 p-4 md:grid-cols-[64px_1fr]">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-black/40">{step}</div>
                <div>
                  <div className="text-lg font-semibold tracking-[-0.04em] text-ink">{title}</div>
                  <p className="mt-2 text-sm leading-7 text-black/60">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </Block>

        <div className="grid gap-6">
          <Block
            eyebrow="Capabilities"
            title="The current build already covers the core backend rails."
            body="The frontend should surface those capabilities with clarity, not bury them under one oversized hero."
            dark
          >
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                [CubeFocus, "Draft creation"],
                [ShieldCheck, "Compute diagnostics"],
                [BracketsCurly, "Export manifest"],
                [Fingerprint, "Registry confirmation"],
              ].map(([Icon, label]) => (
                <div key={label} className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                  <Icon size={18} weight="light" className="text-white/70" />
                  <div className="mt-4 text-base font-semibold tracking-[-0.03em] text-white">{label}</div>
                </div>
              ))}
            </div>
          </Block>

          <Block
            eyebrow="Call to action"
            title="Use the studio when you want the live backend; use the architecture route when you need the system story."
            body="That split is deliberate. It keeps the product site readable and the workspace usable."
          >
            <div className="mt-8 flex flex-wrap gap-4">
              <NavLink
                to="/studio"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
              >
                Launch studio
                <ArrowRight size={16} weight="light" />
              </NavLink>
              <NavLink
                to="/architecture"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-5 py-3 text-sm font-medium text-ink transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
              >
                Review architecture
              </NavLink>
            </div>
          </Block>
        </div>
      </section>
    </div>
  );
}
