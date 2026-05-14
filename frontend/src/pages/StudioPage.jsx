import { useDeferredValue, useEffect, useMemo, useState, startTransition } from "react";
import {
  ArrowUpRight,
  BracketsCurly,
  CirclesThreePlus,
  ClockCounterClockwise,
  Command,
  CubeFocus,
  CursorClick,
  FileArrowUp,
  Fingerprint,
  Key,
  Lightning,
  LinkSimple,
  LockKeyOpen,
  Radio,
  Rows,
  ShareNetwork,
  ShieldCheck,
  TerminalWindow,
} from "@phosphor-icons/react";
import { api } from "../api.js";
import {
  connectWallet,
  ensureWallet,
  switchOrAddNetwork,
  uploadJsonPackage,
  writePrivateAgentRegistry,
} from "../zerog.js";

const defaultOwner = "";

const initialCreateState = {
  name: "Board Research Capsule",
  owner: defaultOwner,
  description: "Private investor and board operations agent.",
  templateId: "private-research-copilot",
  collaborators: "",
  visibility: "private",
  dataSensitivity: "restricted",
  exportability: "owner_authorized",
  approvalMode: "human_for_external_actions",
  allowDelegation: true,
  maxStepsPerRun: 5,
  knowledgeSources: "board_notes_q1, investor_memos",
};

const initialPublishState = {
  publisher: defaultOwner,
  storageRoot: "",
  storageTxHash: "",
  publishMode: "user_wallet_storage",
};

const initialRegistrationState = {
  registrant: defaultOwner,
  chainTxHash: "",
  registryAddress: "",
  registrationMode: "user_wallet_registry",
};

const initialAuthorizationState = {
  grantee: "",
  label: "OpenClaw runtime",
  accessMode: "licensed_mcp",
  capabilities: "run.workflow, read.summary",
  expiresAt: "",
};

const initialAuthorizationConfirmState = {
  authorizer: defaultOwner,
  chainTxHash: "",
  registryAddress: "",
};

const initialRunState = {
  objective: "Summarize board updates and draft the top three investor follow-ups.",
  audience: "investors",
  tone: "concise",
  executionMode: "auto",
  credentialSource: "user_runtime",
  providedSecretKeys: "ZEROG_COMPUTE_API_KEY",
};

const studioPhases = [
  { id: "build", label: "Build", icon: BracketsCurly },
  { id: "publish", label: "Publish", icon: FileArrowUp },
  { id: "permissions", label: "Permissions", icon: LockKeyOpen },
  { id: "runtime", label: "Runtime", icon: TerminalWindow },
  { id: "handoff", label: "Handoff", icon: Lightning },
];

const builderNodePalette = [
  { id: "prompt", label: "Prompt", icon: Command },
  { id: "memory", label: "Memory", icon: Rows },
  { id: "policy", label: "Policy", icon: ShieldCheck },
  { id: "trigger", label: "Trigger", icon: Radio },
  { id: "registry", label: "Registry", icon: Fingerprint },
  { id: "wallet", label: "Wallet", icon: Key },
];

const roleToneMap = {
  planner: "border-accent/20 bg-accent/10 text-ink",
  specialist: "border-white/10 bg-white/[0.04] text-ink",
  executor: "border-white/10 bg-black/20 text-ink",
};

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortAddress(value) {
  if (!value) {
    return "Not connected";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function prettifyJson(value) {
  if (!value) {
    return "Unavailable";
  }

  return JSON.stringify(value, null, 2);
}

function splitCommaSeparated(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function computeSummary(health) {
  if (!health?.readiness) {
    return "Unavailable";
  }

  if (health.readiness.hasComputeApiKey) {
    return "direct api";
  }

  return "broker";
}

function getExplorerBaseUrl(health) {
  return health?.network === "testnet"
    ? "https://chainscan-galileo.0g.ai"
    : "https://chainscan.0g.ai";
}

function buildExplorerUrl(health, type, value) {
  if (!value) {
    return "";
  }

  const baseUrl = getExplorerBaseUrl(health).replace(/\/+$/, "");
  if (type === "address") {
    return `${baseUrl}/address/${value}`;
  }

  return `${baseUrl}/tx/${value}`;
}

function reorderItems(items, fromIndex, toIndex) {
  const next = items.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function sortAgentsNewestFirst(items = []) {
  return items.slice().sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
}

function buildCreatePayload(form) {
  return {
    name: form.name,
    owner: form.owner,
    templateId: form.templateId,
    description: form.description,
    collaborators: splitCommaSeparated(form.collaborators),
    privacy: {
      visibility: form.visibility,
      dataSensitivity: form.dataSensitivity,
      exportability: form.exportability,
    },
    knowledge: {
      sources: splitCommaSeparated(form.knowledgeSources),
    },
    policy: {
      approvalMode: form.approvalMode,
      allowDelegation: Boolean(form.allowDelegation),
      maxStepsPerRun: Number(form.maxStepsPerRun),
    },
  };
}

function buildRunPayload(form) {
  return {
    objective: form.objective,
    input: {
      audience: form.audience,
      tone: form.tone,
    },
    runtime: {
      credentialSource: form.credentialSource,
      executionMode: form.executionMode,
      providedSecretKeys: splitCommaSeparated(form.providedSecretKeys),
    },
  };
}

function DataTag({ label, value }) {
  return (
    <div className="metric-card">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">{label}</div>
      <div className="mt-2 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function InlineStat({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function InlineNotice({ tone = "info", message }) {
  if (!message) {
    return null;
  }

  const palette = {
    info: "border-accent/20 bg-accent/10 text-accent",
    success: "border-accent/20 bg-accent/10 text-accent",
    error: "border-[#8e4330]/25 bg-[#8e4330]/20 text-[#efb197]",
  };

  return (
    <div className={classNames("rounded-[1.05rem] border px-4 py-3 text-sm", palette[tone] || palette.info)}>
      {message}
    </div>
  );
}

function ProgressStep({ index, label, status, detail, href, active = false, onClick }) {
  const palette = {
    complete: "border-accent/30 bg-accent/10 text-accent",
    active: "border-white/20 bg-white/[0.06] text-ink",
    pending: "border-white/10 bg-transparent text-soft",
  };

  return (
    <div
      className={classNames(
        "rounded-[1.15rem] border border-white/10 bg-black/15 px-4 py-4 transition-all duration-500",
        active ? "border-accent/30 bg-accent/8 shadow-[0_24px_48px_-32px_rgba(197,122,74,0.4)]" : "hover:border-white/20 hover:bg-white/[0.04]",
      )}
    >
      <button type="button" onClick={onClick} className="flex w-full items-start gap-3 text-left">
        <div className={classNames("grid h-9 w-9 place-items-center rounded-xl border font-mono text-[10px] uppercase tracking-[0.18em]", palette[status] || palette.pending)}>
          {String(index).padStart(2, "0")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold text-ink">{label}</div>
            <StatusBadge value={status} />
          </div>
          {detail ? <div className="mt-2 text-sm text-muted">{detail}</div> : null}
        </div>
      </button>
      {href ? (
        <div className="pl-12 pt-3">
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-medium text-accent transition-colors hover:text-[#f2d0b6]"
          >
            Open explorer
            <ArrowUpRight size={14} weight="light" />
          </a>
        </div>
      ) : null}
    </div>
  );
}

function SectionShell({ title, eyebrow, icon: Icon, children, className = "" }) {
  return (
    <div className={classNames("rounded-[1.6rem] border border-white/10 bg-[#101413] shadow-[0_24px_60px_-36px_rgba(0,0,0,0.72)]", className)}>
      <section className="h-full rounded-[calc(1.6rem-1px)] border border-white/[0.04] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent_24%),linear-gradient(180deg,rgba(16,20,19,1),rgba(13,17,16,1))] p-6 md:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-soft">{eyebrow}</div>
            <h2 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.05em] text-ink">{title}</h2>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
            <Icon size={17} weight="light" className="text-accent" />
          </div>
        </div>
        {children}
      </section>
    </div>
  );
}

function FormField({ label, helper, children }) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">{label}</span>
      {children}
      {helper ? <span className="text-xs text-soft">{helper}</span> : null}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={classNames("field-input", props.className)}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={classNames("field-input", props.className)}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className={classNames("field-input min-h-[132px]", props.className)}
    />
  );
}

function StatusBadge({ value }) {
  const palette = {
    draft: "border border-white/10 bg-white/[0.05] text-soft",
    published: "border border-accent/20 bg-accent/10 text-accent",
    registered: "border border-accent/20 bg-accent/10 text-accent",
    active: "border border-accent/20 bg-accent/10 text-accent",
    failed: "border border-[#8e4330]/25 bg-[#8e4330]/20 text-[#efb197]",
    completed: "border border-accent/20 bg-accent/10 text-accent",
    running: "border border-accent/20 bg-accent/10 text-accent",
    local_only: "border border-white/10 bg-white/[0.05] text-soft",
  };

  return (
    <span
      className={classNames(
        "inline-flex rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]",
        palette[value] || "border border-white/10 bg-white/[0.05] text-soft",
      )}
    >
      {value}
    </span>
  );
}

function JsonPanel({ label, value }) {
  return (
    <details className="overflow-hidden rounded-[1.2rem] border border-white/10 bg-black/15">
      <summary className="cursor-pointer list-none border-b border-white/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.24em] text-soft marker:content-none">
        {label}
      </summary>
      <pre className="thin-scrollbar max-h-[20rem] overflow-auto px-4 py-4 font-mono text-xs leading-6 text-[#e9e6de]">
        {value}
      </pre>
    </details>
  );
}

function EmptyPanel({ title, body }) {
  return (
    <div className="grid min-h-[140px] place-items-center rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
      <div className="max-w-sm space-y-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-soft">Awaiting state</div>
        <h3 className="text-xl font-semibold tracking-[-0.04em] text-ink">{title}</h3>
        <p className="text-sm leading-7 text-muted">{body}</p>
      </div>
    </div>
  );
}

function PhaseButton({ phase, active, onClick }) {
  const Icon = phase.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "group flex w-full items-center gap-3 rounded-[1rem] border px-3 py-3 text-left transition-all duration-500 ease-premium active:scale-[0.98]",
        active
          ? "border-accent/30 bg-accent/10 shadow-[0_20px_40px_-28px_rgba(197,122,74,0.4)]"
          : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.04]",
      )}
    >
      <span className={classNames(
        "grid h-10 w-10 shrink-0 place-items-center rounded-[0.9rem] border",
        active ? "border-accent/30 bg-accent text-[#120e0b]" : "border-white/10 bg-black/20 text-accent",
      )}>
        <Icon size={17} weight="light" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{phase.label}</span>
        <span className="mt-1 block truncate text-xs text-soft">{phase.description}</span>
      </span>
      <ArrowUpRight
        size={15}
        weight="light"
        className={classNames("shrink-0 transition-transform duration-500 group-hover:translate-x-0.5", active ? "text-accent" : "text-soft")}
      />
    </button>
  );
}

function ContextStrip({
  agents,
  selectedAgent,
  selectedAgentId,
  selectedTemplate,
  walletState,
  health,
  activeAuthorizations,
  totalRuns,
  pendingConnectWallet,
  onConnectWallet,
  onSyncOwner,
  onSelectAgent,
}) {
  const title = selectedAgent?.name || selectedTemplate?.name || "No agent selected";
  const subtitle =
    selectedAgent?.description ||
    selectedTemplate?.summary ||
    "Choose a template or agent package to start using the workspace.";

  return (
    <div className="space-y-4">
      <div className="workspace-card px-5 py-5 md:px-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0 space-y-1">
          <div className="eyebrow">Builder workspace</div>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-[-0.05em] text-ink md:text-3xl">{title}</h1>
            <StatusBadge value={selectedAgent?.status || "draft"} />
          </div>
          <p className="max-w-[82ch] text-sm leading-7 text-muted">{subtitle}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(15rem,1fr)_auto_auto] sm:items-end xl:min-w-[34rem]">
          <div className="min-w-0">
            <label className="grid gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">Active package</span>
              <select
                value={selectedAgentId}
                onChange={(event) => onSelectAgent(event.target.value)}
                className="field-input min-h-[44px] rounded-[0.9rem] bg-black/20 py-2"
              >
                <option value="">No agent selected</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="button" onClick={onConnectWallet} className="pill-secondary">
            <Key size={15} weight="light" />
            {pendingConnectWallet ? "Connecting..." : walletState.connected ? "Reconnect wallet" : "Connect wallet"}
          </button>
          <button type="button" onClick={onSyncOwner} className="pill-primary">
            <LinkSimple size={15} weight="light" />
            Use wallet
          </button>
        </div>
      </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <div className="status-tile"><InlineStat label="Wallet" value={walletState.connected ? formatShortAddress(walletState.address) : "Not connected"} /></div>
        <div className="status-tile"><InlineStat label="Network" value={health?.network || "Unavailable"} /></div>
        <div className="status-tile"><InlineStat label="Active grants" value={String(activeAuthorizations)} /></div>
        <div className="status-tile"><InlineStat label="Runs" value={String(totalRuns)} /></div>
        <div className="status-tile"><InlineStat label="Compute" value={computeSummary(health)} /></div>
        <div className="status-tile"><InlineStat label="Package" value={selectedAgent?.templateId || selectedTemplate?.id || "Unselected"} /></div>
      </div>
    </div>
  );
}

function BuilderLifecycleMap({ selectedAgent }) {
  const lifecycle = [
    ["01", "Template", selectedAgent?.templateId || "Select workflow"],
    ["02", "Policy", selectedAgent?.privacy?.dataSensitivity || "restricted"],
    ["03", "Package", selectedAgent?.packageHash ? `${selectedAgent.packageHash.slice(0, 10)}...` : "draft hash"],
    ["04", "Publish", selectedAgent?.storageRoot ? "storage rooted" : "wallet upload"],
    ["05", "Rights", selectedAgent?.onchainStatus || "not_registered"],
  ];

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {lifecycle.map(([step, label, value], index) => (
        <div key={label} className="control-card relative">
          {index < lifecycle.length - 1 ? (
            <div className="absolute left-[calc(100%-0.25rem)] top-1/2 hidden h-px w-6 bg-gradient-to-r from-accent/60 to-transparent md:block" />
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">{step}</span>
            <span className="node-port" />
          </div>
          <div className="mt-3 text-sm font-semibold text-ink">{label}</div>
          <div className="mt-1 truncate text-xs text-muted">{value}</div>
        </div>
      ))}
    </div>
  );
}

function WorkflowGraph({
  workflow,
  requiredSecrets = [],
  runtimeTargets = [],
  editable = false,
  onRoleOrderChange,
  saveState = "idle",
  notice,
}) {
  const roles = workflow?.roles || [];
  const tools = workflow?.tools || [];
  const [selectedRoleId, setSelectedRoleId] = useState(() => roles[0]?.id || "");
  const [orderedRoles, setOrderedRoles] = useState(roles);
  const [draggedRoleId, setDraggedRoleId] = useState("");

  useEffect(() => {
    setSelectedRoleId(roles[0]?.id || "");
    setOrderedRoles(roles);
    setDraggedRoleId("");
  }, [workflow?.executionModel, roles]);

  if (!orderedRoles.length) {
    return (
      <EmptyPanel
        title="Workflow graph unavailable."
        body="Select a template or agent package to inspect its planner, specialist, and executor wiring."
      />
    );
  }

  const selectedRole = orderedRoles.find((role) => role.id === selectedRoleId) || orderedRoles[0];

  async function commitRoleOrder(nextRoles) {
    if (!editable || !onRoleOrderChange) {
      return;
    }

    await onRoleOrderChange(nextRoles.map((role) => role.id));
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0b0f0e]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-soft">Execution model</div>
            <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-ink">
              {workflow.executionModel || "multi_agent_a2a"}
            </div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03]">
            <ShareNetwork size={18} weight="light" className="text-accent" />
          </div>
        </div>

        <div className="relative grid gap-5 bg-[linear-gradient(rgba(243,242,236,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(243,242,236,0.03)_1px,transparent_1px)] bg-[size:34px_34px] p-5 md:p-6 lg:grid-cols-3">
          {orderedRoles.map((role, index) => (
            <div key={role.id} className="relative">
              {index < orderedRoles.length - 1 ? (
                <div className="absolute left-[calc(100%-0.4rem)] top-1/2 hidden h-px w-10 -translate-y-1/2 bg-gradient-to-r from-accent/60 to-white/0 lg:block" />
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                draggable={editable}
                onDragStart={() => setDraggedRoleId(role.id)}
                onDragOver={(event) => {
                  if (editable) {
                    event.preventDefault();
                  }
                }}
                onDrop={async () => {
                  if (!editable || !draggedRoleId || draggedRoleId === role.id) {
                    return;
                  }

                  const fromIndex = orderedRoles.findIndex((item) => item.id === draggedRoleId);
                  const toIndex = orderedRoles.findIndex((item) => item.id === role.id);
                  if (fromIndex === -1 || toIndex === -1) {
                    return;
                  }

                  const nextRoles = reorderItems(orderedRoles, fromIndex, toIndex);
                  setOrderedRoles(nextRoles);
                  setDraggedRoleId("");
                  await commitRoleOrder(nextRoles);
                }}
                onDragEnd={() => setDraggedRoleId("")}
                className={classNames(
                  "h-full w-full rounded-[1.25rem] border p-5 text-left backdrop-blur-sm transition-all duration-500",
                  roleToneMap[role.roleType] || "border-white/10 bg-white/[0.04] text-ink",
                  selectedRole?.id === role.id ? "ring-1 ring-accent/40" : "hover:border-white/20",
                  draggedRoleId === role.id ? "opacity-70" : "",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">{role.roleType}</div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-soft">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-4 text-xl font-semibold tracking-[-0.04em]">{role.id}</div>
                <p className="mt-3 text-sm leading-7 text-muted">{role.purpose}</p>
                <div className="mt-5 flex items-center gap-2 text-xs text-soft">
                  <span className="signal-dot h-2 w-2" />
                  {editable ? "drag to reorder" : "layout locked"}
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
        <div className="metric-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">Node inspector</div>
            <BracketsCurly size={16} weight="light" className="text-accent" />
          </div>
          <div className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">{selectedRole?.roleType || "role"}</div>
            <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-ink">{selectedRole?.id || "Unselected"}</div>
            <p className="mt-3 text-sm leading-7 text-muted">{selectedRole?.purpose || "Choose a workflow node to inspect its responsibility."}</p>
            <div className="mt-4 text-xs text-soft">
              {editable
                ? "Reordering updates the draft package and regenerates the package hash before publish."
                : "Published or registered agents keep their workflow order locked in the workspace."}
            </div>
            <div className="mt-4">
              <StatusBadge value={saveState === "saving" ? "running" : editable ? "draft" : "published"} />
            </div>
            <div className="mt-4">
              <InlineNotice tone={notice?.tone} message={notice?.message} />
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">Tool rail</div>
            <Command size={16} weight="light" className="text-accent" />
          </div>
          <div className="flex flex-wrap gap-2">
            {tools.length ? (
              tools.map((tool) => (
                <span key={tool} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-soft">
                  {tool.replaceAll("_", " ")}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted">No tools declared.</span>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">Secret contract</div>
          <div className="mt-4 grid gap-3">
            {requiredSecrets.length ? (
              requiredSecrets.map((secret) => (
                <div key={secret.key} className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-sm font-semibold text-ink">{secret.label}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-soft">{secret.key}</div>
                  <p className="mt-2 text-sm leading-6 text-muted">{secret.purpose}</p>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted">No runtime secrets declared.</div>
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">Runtime targets</div>
          <div className="mt-4 flex flex-wrap gap-2">
            {runtimeTargets.length ? (
              runtimeTargets.map((target) => (
                <span key={target} className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
                  {target.replaceAll("_", " ")}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted">No runtime targets declared.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudioPage() {
  const [health, setHealth] = useState(null);
  const [computeDiagnostics, setComputeDiagnostics] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [agents, setAgents] = useState([]);
  const [activePhase, setActivePhase] = useState("build");
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialCreateState.templateId);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [createForm, setCreateForm] = useState(initialCreateState);
  const [publishForm, setPublishForm] = useState(initialPublishState);
  const [registrationForm, setRegistrationForm] = useState(initialRegistrationState);
  const [authorizationForm, setAuthorizationForm] = useState(initialAuthorizationState);
  const [authorizationConfirmForm, setAuthorizationConfirmForm] = useState(initialAuthorizationConfirmState);
  const [runForm, setRunForm] = useState(initialRunState);
  const [search, setSearch] = useState("");
  const [selectedPublishStepId, setSelectedPublishStepId] = useState("storage");
  const [publishNotices, setPublishNotices] = useState({
    storage: null,
    registry: null,
  });
  const [workflowNotice, setWorkflowNotice] = useState(null);
  const [screenError, setScreenError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [walletState, setWalletState] = useState({
    address: "",
    chainId: 0,
    connected: false,
  });
  const [pending, setPending] = useState({
    bootstrap: true,
    create: false,
    connectWallet: false,
    uploadPackage: false,
    walletRegister: false,
    publish: false,
    register: false,
    authorize: false,
    walletAuthorize: false,
    confirmAuthorization: false,
    walletRevoke: false,
    workflowSave: false,
    run: false,
  });
  const [selectedAgentState, setSelectedAgentState] = useState({
    agent: null,
    publishIntent: null,
    registrationIntent: null,
    exportManifest: null,
    authorizations: [],
    runs: [],
  });

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let isActive = true;

    async function bootstrap() {
      try {
        const [healthResponse, computeResponse, templateResponse, agentResponse] = await Promise.all([
          api.getHealth(),
          api.getComputeDiagnostics().catch(() => ({ compute: null })),
          api.listTemplates(),
          api.listAgents(),
        ]);

        if (!isActive) {
          return;
        }

        setHealth(healthResponse);
        setComputeDiagnostics(computeResponse.compute);
        setTemplates(templateResponse.templates || []);
        const nextAgents = sortAgentsNewestFirst(agentResponse.agents || []);
        setAgents(nextAgents);

        const firstAgentId = nextAgents[0]?.id || "";
        setSelectedAgentId(firstAgentId);
        if (firstAgentId) {
          startTransition(() => {
            loadAgentWorkbench(firstAgentId);
          });
        }
      } catch (error) {
        if (isActive) {
          setScreenError(error.message);
        }
      } finally {
        if (isActive) {
          setPending((current) => ({ ...current, bootstrap: false }));
        }
      }
    }

    bootstrap();

    ensureWallet()
      .then((wallet) => {
        if (wallet && isActive) {
          setWalletState({
            address: wallet.address,
            chainId: wallet.chainId,
            connected: true,
          });
        }
      })
      .catch(() => null);

    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        const address = accounts?.[0] || "";
        setWalletState((current) => ({
          ...current,
          address,
          connected: Boolean(address),
        }));
      };

      const handleChainChanged = (chainIdHex) => {
        setWalletState((current) => ({
          ...current,
          chainId: Number.parseInt(chainIdHex, 16),
        }));
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        isActive = false;
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }

    return () => {
      isActive = false;
    };
  }, []);

  async function refreshAgentList(nextSelectedAgentId = selectedAgentId) {
    const response = await api.listAgents();
    const nextAgents = sortAgentsNewestFirst(response.agents || []);
    setAgents(nextAgents);
    if (nextSelectedAgentId) {
      setSelectedAgentId(nextSelectedAgentId);
    } else if (!selectedAgentId && nextAgents[0]) {
      setSelectedAgentId(nextAgents[0].id);
    }
  }

  async function loadAgentWorkbench(agentId) {
    if (!agentId) {
      setSelectedAgentState({
        agent: null,
        publishIntent: null,
        registrationIntent: null,
        exportManifest: null,
        authorizations: [],
        runs: [],
      });
      return;
    }

    const [agentResponse, exportResponse, authResponse, runResponse, publishResponse, registrationResponse] =
      await Promise.all([
        api.getAgent(agentId),
        api.getExportManifest(agentId).catch(() => ({ manifest: null })),
        api.listAuthorizations(agentId).catch(() => ({ authorizations: [] })),
        api.listRuns(agentId).catch(() => ({ runs: [] })),
        api.getPublishIntent(agentId).catch(() => ({ publishIntent: null })),
        api.getOnchainRegistrationIntent(agentId).catch(() => ({ registrationIntent: null })),
      ]);

    setSelectedAgentState({
      agent: agentResponse.agent,
      publishIntent: publishResponse.publishIntent,
      registrationIntent: registrationResponse.registrationIntent,
      exportManifest: exportResponse.manifest,
      authorizations: authResponse.authorizations || [],
      runs: runResponse.runs || [],
    });

    setPublishForm((current) => ({
      ...current,
      publisher: agentResponse.agent.owner,
    }));
    setRegistrationForm((current) => ({
      ...current,
      registrant: agentResponse.agent.owner,
      registryAddress:
        registrationResponse.registrationIntent?.contractAddress ||
        agentResponse.agent.registryAddress ||
        current.registryAddress,
    }));
    setAuthorizationConfirmForm((current) => ({
      ...current,
      authorizer: agentResponse.agent.owner,
      registryAddress:
        agentResponse.agent.registryAddress ||
        registrationResponse.registrationIntent?.contractAddress ||
        current.registryAddress,
    }));
  }

  const filteredTemplates = useMemo(() => {
    if (!deferredSearch) {
      return templates;
    }

    const token = deferredSearch.toLowerCase();
    return templates.filter((template) =>
      [template.name, template.summary, ...(template.tracks || [])]
        .join(" ")
        .toLowerCase()
        .includes(token),
    );
  }, [deferredSearch, templates]);

  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) || templates[0] || null;
  const selectedAgent = selectedAgentState.agent;
  const activeWorkflow = selectedAgent?.workflow || selectedTemplate
    ? {
        executionModel: selectedAgent?.workflow?.executionModel || "multi_agent_a2a",
        roles: selectedAgent?.workflow?.roles || selectedTemplate?.roles || [],
        tools: selectedAgent?.workflow?.tools || selectedTemplate?.tools || [],
      }
    : null;
  const activeRequiredSecrets =
    selectedAgent?.draftPackage?.requiredSecrets || selectedTemplate?.requiredSecrets || [];
  const activeRuntimeTargets =
    selectedAgent?.draftPackage?.runtimeTargets || selectedTemplate?.runtimeTargets || [];
  const activeAuthorizations = selectedAgentState.authorizations.filter(
    (authorization) => authorization.status === "active",
  );
  const publishSteps = [
    {
      id: "draft",
      label: "Draft package",
      status: selectedAgent ? "complete" : "active",
      detail: selectedAgent
        ? `${selectedAgent.templateId} package prepared locally for ${formatShortAddress(selectedAgent.owner)}`
        : "Choose or create a draft package.",
    },
    {
      id: "storage",
      label: "0G Storage publish",
      status: selectedAgent?.storageRoot ? "complete" : selectedAgent ? "active" : "pending",
      detail: selectedAgent?.storageRoot
        ? `Storage root anchored: ${selectedAgent.storageRoot.slice(0, 14)}...`
        : "Upload the package with the package owner's wallet and confirm the resulting storage root.",
      href: selectedAgent?.storageTxHash ? buildExplorerUrl(health, "tx", selectedAgent.storageTxHash) : "",
    },
    {
      id: "registry",
      label: "Registry anchor",
      status: selectedAgent?.onchainStatus === "registered" ? "complete" : selectedAgent?.storageRoot ? "active" : "pending",
      detail: selectedAgent?.onchainStatus === "registered"
        ? `Registered at ${formatShortAddress(selectedAgent.registryAddress || "")}`
        : "Submit registerAgent from the package owner's wallet and confirm the registration transaction.",
      href: selectedAgent?.registrationTxHash ? buildExplorerUrl(health, "tx", selectedAgent.registrationTxHash) : "",
    },
  ];

  useEffect(() => {
    if (!selectedAgent) {
      setSelectedPublishStepId("draft");
      return;
    }

    if (!selectedAgent.storageRoot) {
      setSelectedPublishStepId("storage");
      return;
    }

    if (selectedAgent.onchainStatus !== "registered") {
      setSelectedPublishStepId("registry");
      return;
    }

    setSelectedPublishStepId("registry");
  }, [selectedAgent?.id, selectedAgent?.storageRoot, selectedAgent?.onchainStatus]);

  function updateCreateForm(key, value) {
    setCreateForm((current) => ({ ...current, [key]: value }));
  }

  function updatePublishForm(key, value) {
    setPublishForm((current) => ({ ...current, [key]: value }));
  }

  function updateRegistrationForm(key, value) {
    setRegistrationForm((current) => ({ ...current, [key]: value }));
  }

  function updateAuthorizationForm(key, value) {
    setAuthorizationForm((current) => ({ ...current, [key]: value }));
  }

  function updateAuthorizationConfirmForm(key, value) {
    setAuthorizationConfirmForm((current) => ({ ...current, [key]: value }));
  }

  function updateRunForm(key, value) {
    setRunForm((current) => ({ ...current, [key]: value }));
  }

  function setPublishNotice(step, tone, message) {
    setPublishNotices((current) => ({
      ...current,
      [step]: message ? { tone, message } : null,
    }));
  }

  function handleSelectAgent(agentId) {
    setSelectedAgentId(agentId);
    setPublishNotices({
      storage: null,
      registry: null,
    });
    setWorkflowNotice(null);
    if (!agentId) {
      setSelectedTemplateId(initialCreateState.templateId);
      setSelectedAgentState({
        agent: null,
        publishIntent: null,
        registrationIntent: null,
        exportManifest: null,
        authorizations: [],
        runs: [],
      });
      setActivePhase("build");
      return;
    }

    const nextAgent = agents.find((agent) => agent.id === agentId);
    if (nextAgent?.templateId) {
      setSelectedTemplateId(nextAgent.templateId);
    }

    setActivePhase(nextAgent?.status === "draft" ? "publish" : "runtime");
    startTransition(() => {
      loadAgentWorkbench(agentId);
    });
  }

  function handleSelectTemplate(templateId) {
    setSelectedTemplateId(templateId);
    setCreateForm((current) => ({ ...current, templateId }));
  }

  async function handleConnectWallet() {
    setPending((current) => ({ ...current, connectWallet: true }));
    setScreenError("");
    setInfoMessage("");

    try {
      const wallet = await connectWallet();
      setWalletState({
        address: wallet.address,
        chainId: wallet.chainId,
        connected: true,
      });
      setCreateForm((current) => ({
        ...current,
        owner: current.owner || wallet.address,
      }));
      setInfoMessage(`Wallet connected: ${wallet.address}`);
    } catch (error) {
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, connectWallet: false }));
    }
  }

  async function handleUseConnectedWallet() {
    if (!walletState.connected || !walletState.address) {
      setScreenError("Connect a wallet before using it as the package owner.");
      return;
    }

    setCreateForm((current) => ({ ...current, owner: walletState.address }));
    setPublishForm((current) => ({ ...current, publisher: walletState.address }));
    setRegistrationForm((current) => ({ ...current, registrant: walletState.address }));
    setAuthorizationConfirmForm((current) => ({ ...current, authorizer: walletState.address }));
    setInfoMessage("This connected wallet will own new packages and sign owner-only lifecycle actions.");
  }

  async function handleWalletUpload() {
    if (!selectedAgentState.publishIntent) {
      return;
    }

    setPending((current) => ({ ...current, uploadPackage: true }));
    setScreenError("");
    setInfoMessage("");
    setPublishNotice("storage", null, "");

    try {
      const publishIntent = selectedAgentState.publishIntent;
      const targetChainId = health?.network === "testnet" ? 16602 : 16600;
      const targetNetwork = await switchOrAddNetwork({
        chainId: targetChainId,
        chainName: health?.network === "testnet" ? "0G-Galileo-Testnet" : "0G-Mainnet",
        rpcUrl: publishIntent.targets.rpcUrl,
        blockExplorerUrl:
          health?.network === "testnet"
            ? "https://chainscan-galileo.0g.ai"
            : "https://chainscan.0g.ai",
        nativeCurrency: {
          name: "0G",
          symbol: "0G",
          decimals: 18,
        },
      });

      if (
        publishIntent.owner &&
        targetNetwork?.address &&
        publishIntent.owner.toLowerCase() !== targetNetwork.address.toLowerCase()
      ) {
        throw new Error("Connected wallet does not match the draft owner. Sync the owner field or switch wallets.");
      }

      const upload = await uploadJsonPackage({
        payload: publishIntent.packagePayload,
        fileName: `${publishIntent.agentId}-package.json`,
        indexerRpc: publishIntent.targets.storageIndexerRpc,
        rpcUrl: publishIntent.targets.rpcUrl,
      });

      setWalletState({
        address: upload.address,
        chainId: upload.chainId,
        connected: true,
      });
      setPublishForm((current) => ({
        ...current,
        publisher: upload.address,
        storageRoot: upload.rootHash || "",
        storageTxHash: upload.txHash || "",
      }));
      setPublishNotice("storage", "success", `Storage upload confirmed. Root ${upload.rootHash}`);
      setInfoMessage(`Package uploaded to 0G Storage. Root: ${upload.rootHash}`);
    } catch (error) {
      setPublishNotice("storage", "error", error.message);
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, uploadPackage: false }));
    }
  }

  async function ensureOwnerWallet({ expectedOwner, rpcUrl, chainId, contractAddress }) {
    const network = await switchOrAddNetwork({
      chainId,
      chainName: chainId === 16602 ? "0G-Galileo-Testnet" : "0G-Mainnet",
      rpcUrl,
      blockExplorerUrl:
        chainId === 16602 ? "https://chainscan-galileo.0g.ai" : "https://chainscan.0g.ai",
      nativeCurrency: {
        name: "0G",
        symbol: "0G",
        decimals: 18,
      },
    });

    if (
      expectedOwner &&
      network?.address &&
      expectedOwner.toLowerCase() !== network.address.toLowerCase()
    ) {
      throw new Error("Connected wallet does not match this package owner. Switch wallets or create a package owned by the connected wallet.");
    }

    return network;
  }

  async function handleCreateAgent(event) {
    event.preventDefault();
    setPending((current) => ({ ...current, create: true }));
    setScreenError("");
    setInfoMessage("");

    try {
      const owner = createForm.owner || walletState.address;
      if (!owner) {
        throw new Error("Connect a wallet or paste the wallet address that should own this package.");
      }

      const nextCreateForm = { ...createForm, owner };
      setCreateForm(nextCreateForm);
      const response = await api.createAgent(buildCreatePayload(nextCreateForm));
      await refreshAgentList(response.agent.id);
      await loadAgentWorkbench(response.agent.id);
      setSelectedAgentId(response.agent.id);
      setActivePhase("publish");
      setInfoMessage(`Draft agent ${response.agent.name} created.`);
    } catch (error) {
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, create: false }));
    }
  }

  async function handleConfirmPublish(event) {
    event.preventDefault();
    if (!selectedAgent || !selectedAgentState.publishIntent) {
      return;
    }

    setPending((current) => ({ ...current, publish: true }));
    setScreenError("");
    setInfoMessage("");
    setPublishNotice("storage", null, "");

    try {
      await api.confirmPublish(selectedAgent.id, {
        ...publishForm,
        packageHash: selectedAgentState.publishIntent.packageHash,
      });
      await loadAgentWorkbench(selectedAgent.id);
      await refreshAgentList(selectedAgent.id);
      setPublishNotice("storage", "success", "Publish confirmation recorded.");
      setInfoMessage("Publish confirmation recorded.");
    } catch (error) {
      setPublishNotice("storage", "error", error.message);
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, publish: false }));
    }
  }

  async function handleConfirmRegistration(event) {
    event.preventDefault();
    if (!selectedAgent || !selectedAgentState.registrationIntent) {
      return;
    }

    setPending((current) => ({ ...current, register: true }));
    setScreenError("");
    setInfoMessage("");
    setPublishNotice("registry", null, "");

    try {
      await api.confirmOnchainRegistration(selectedAgent.id, {
        ...registrationForm,
        packageHash: selectedAgentState.registrationIntent.packageHash,
        storageRoot: selectedAgentState.registrationIntent.storageRoot,
      });
      await loadAgentWorkbench(selectedAgent.id);
      await refreshAgentList(selectedAgent.id);
      setPublishNotice("registry", "success", "Onchain registration confirmed.");
      setInfoMessage("Onchain registration confirmed.");
    } catch (error) {
      setPublishNotice("registry", "error", error.message);
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, register: false }));
    }
  }

  async function handleWalletRegister() {
    if (!selectedAgentState.registrationIntent) {
      return;
    }

    setPending((current) => ({ ...current, walletRegister: true }));
    setScreenError("");
    setInfoMessage("");
    setPublishNotice("registry", null, "");

    try {
      const intent = selectedAgentState.registrationIntent;
      const wallet = await ensureOwnerWallet({
        expectedOwner: intent.owner,
        rpcUrl: health?.rpcUrl || selectedAgentState.publishIntent?.targets?.rpcUrl || "https://evmrpc-testnet.0g.ai",
        chainId: intent.chainId,
        contractAddress: intent.contractAddress,
      });

      const tx = await writePrivateAgentRegistry({
        contractAddress: intent.contractAddress,
        functionName: intent.functionName,
        args: intent.args,
      });

      setWalletState({
        address: tx.address,
        chainId: tx.chainId,
        connected: true,
      });
      setRegistrationForm((current) => ({
        ...current,
        registrant: wallet.address,
        registryAddress: intent.contractAddress,
        chainTxHash: tx.txHash,
      }));
      setPublishNotice("registry", "success", `Registry transaction submitted: ${tx.txHash}`);
      setInfoMessage(`Registry transaction confirmed: ${tx.txHash}`);
    } catch (error) {
      setPublishNotice("registry", "error", error.message);
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, walletRegister: false }));
    }
  }

  async function handleCreateAuthorization(event) {
    event.preventDefault();
    if (!selectedAgent) {
      return;
    }

    setPending((current) => ({ ...current, authorize: true }));
    setScreenError("");
    setInfoMessage("");

    try {
      const response = await api.createAuthorizationIntent(selectedAgent.id, {
        ...authorizationForm,
        capabilities: splitCommaSeparated(authorizationForm.capabilities),
        expiresAt: authorizationForm.expiresAt ? Number(authorizationForm.expiresAt) : 0,
      });
      await loadAgentWorkbench(selectedAgent.id);
      setAuthorizationConfirmForm((current) => ({
        ...current,
        registryAddress:
          response.intent.contractAddress || current.registryAddress,
      }));
      setInfoMessage(`Authorization intent prepared for ${response.authorization.grantee}.`);
    } catch (error) {
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, authorize: false }));
    }
  }

  async function handleConfirmAuthorization(authorizationId, scopeHash) {
    if (!selectedAgent) {
      return;
    }

    setPending((current) => ({ ...current, confirmAuthorization: true }));
    setScreenError("");
    setInfoMessage("");

    try {
      await api.confirmAuthorization(selectedAgent.id, authorizationId, {
        ...authorizationConfirmForm,
        scopeHash,
      });
      await loadAgentWorkbench(selectedAgent.id);
      setInfoMessage("Authorization confirmed.");
    } catch (error) {
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, confirmAuthorization: false }));
    }
  }

  async function handleWalletAuthorize(authorization) {
    if (!selectedAgent) {
      return;
    }

    setPending((current) => ({ ...current, walletAuthorize: true }));
    setScreenError("");
    setInfoMessage("");

    try {
      const intent = {
        contractAddress:
          authorization.contractAddress ||
          authorizationConfirmForm.registryAddress ||
          selectedAgent.registryAddress,
        functionName: "authorizeUsage",
        args: [
          selectedAgent.id,
          authorization.grantee,
          authorization.scopeHash,
          authorization.expiresAt || 0,
        ],
        chainId: health?.network === "testnet" ? 16602 : 16600,
      };

      if (!intent.contractAddress) {
        throw new Error("Missing registry contract address for authorization.");
      }

      const wallet = await ensureOwnerWallet({
        expectedOwner: selectedAgent.owner,
        rpcUrl: health?.rpcUrl || selectedAgentState.publishIntent?.targets?.rpcUrl || "https://evmrpc-testnet.0g.ai",
        chainId: intent.chainId,
        contractAddress: intent.contractAddress,
      });

      const tx = await writePrivateAgentRegistry({
        contractAddress: intent.contractAddress,
        functionName: intent.functionName,
        args: intent.args,
      });

      setWalletState({
        address: tx.address,
        chainId: tx.chainId,
        connected: true,
      });
      setAuthorizationConfirmForm((current) => ({
        ...current,
        authorizer: wallet.address,
        registryAddress: intent.contractAddress,
        chainTxHash: tx.txHash,
      }));
      setInfoMessage(`Authorization transaction confirmed: ${tx.txHash}`);
    } catch (error) {
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, walletAuthorize: false }));
    }
  }

  async function handleWalletRevoke(authorization) {
    if (!selectedAgent) {
      return;
    }

    setPending((current) => ({ ...current, walletRevoke: true }));
    setScreenError("");
    setInfoMessage("");

    try {
      const response = await api.getRevokeIntent(selectedAgent.id, authorization.id);
      const intent = response.revokeIntent;
      const wallet = await ensureOwnerWallet({
        expectedOwner: selectedAgent.owner,
        rpcUrl: health?.rpcUrl || selectedAgentState.publishIntent?.targets?.rpcUrl || "https://evmrpc-testnet.0g.ai",
        chainId: intent.chainId,
        contractAddress: intent.contractAddress,
      });

      const tx = await writePrivateAgentRegistry({
        contractAddress: intent.contractAddress,
        functionName: intent.functionName,
        args: intent.args,
      });

      setWalletState({
        address: tx.address,
        chainId: tx.chainId,
        connected: true,
      });

      await api.confirmRevocation(selectedAgent.id, authorization.id, {
        revoker: wallet.address,
        chainTxHash: tx.txHash,
        registryAddress: intent.contractAddress,
      });

      await loadAgentWorkbench(selectedAgent.id);
      setInfoMessage(`Authorization revoked: ${tx.txHash}`);
    } catch (error) {
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, walletRevoke: false }));
    }
  }

  async function handleStartRun(event) {
    event.preventDefault();
    if (!selectedAgent) {
      return;
    }

    setPending((current) => ({ ...current, run: true }));
    setScreenError("");
    setInfoMessage("");

    try {
      await api.startRun(selectedAgent.id, buildRunPayload(runForm));
      await loadAgentWorkbench(selectedAgent.id);
      setInfoMessage("Workflow run submitted.");
    } catch (error) {
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, run: false }));
    }
  }

  async function handleWorkflowRoleOrderChange(roleOrder) {
    if (!selectedAgent) {
      return;
    }

    setPending((current) => ({ ...current, workflowSave: true }));
    setWorkflowNotice(null);
    setScreenError("");

    try {
      const response = await api.updateAgentWorkflow(selectedAgent.id, { roleOrder });
      setSelectedAgentState((current) => ({
        ...current,
        agent: response.agent,
        publishIntent: current.publishIntent
          ? {
              ...current.publishIntent,
              packageHash: response.agent.packageHash,
              packagePayload: response.agent.draftPackage,
              workflow: response.agent.workflow,
            }
          : current.publishIntent,
      }));
      await refreshAgentList(selectedAgent.id);
      setWorkflowNotice({
        tone: "success",
        message: "Workflow order saved to the draft package.",
      });
      setInfoMessage("Workflow order saved.");
    } catch (error) {
      setWorkflowNotice({
        tone: "error",
        message: error.message,
      });
      setScreenError(error.message);
      await loadAgentWorkbench(selectedAgent.id);
    } finally {
      setPending((current) => ({ ...current, workflowSave: false }));
    }
  }

  const filteredAgentRuns = selectedAgentState.runs.slice().reverse();

  return (
    <div className="space-y-6 pb-20 pt-2">
      <div className="min-w-0">
        <ContextStrip
          agents={agents}
          selectedAgent={selectedAgent}
          selectedAgentId={selectedAgentId}
          selectedTemplate={selectedTemplate}
          walletState={walletState}
          health={health}
          activeAuthorizations={activeAuthorizations.length}
          totalRuns={selectedAgentState.runs.length}
          pendingConnectWallet={pending.connectWallet}
          onConnectWallet={handleConnectWallet}
          onSyncOwner={handleUseConnectedWallet}
          onSelectAgent={handleSelectAgent}
        />

        {screenError ? (
          <div className="rounded-[1.35rem] border border-[#8e4330]/25 bg-[#8e4330]/20 px-4 py-3 text-sm text-[#efb197]">
            {screenError}
          </div>
        ) : null}
        {infoMessage ? (
          <div className="rounded-[1.35rem] border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent">
            {infoMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[15rem_minmax(0,1fr)] 2xl:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-[6.6rem] xl:h-[calc(100dvh-8rem)]">
            <div className="rail-panel">
              <div className="space-y-2">
                {studioPhases.map((phase) => (
                  <PhaseButton
                    key={phase.id}
                    phase={phase}
                    active={activePhase === phase.id}
                    onClick={() => setActivePhase(phase.id)}
                  />
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">

        {activePhase === "build" ? (
          <section className="space-y-6">
            <div className="min-w-0 space-y-6">
              <div className="studio-panel p-5 md:p-6">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.38fr)_minmax(16rem,0.32fr)] xl:items-end">
                  <div>
                    <div className="eyebrow">Choose a starting agent</div>
                    <div className="mt-1 text-lg font-semibold tracking-[-0.04em] text-ink">
                      Pick a template, then tune the package settings
                    </div>
                  </div>
                  <FormField label="Template">
                    <Select
                      value={selectedTemplateId}
                      onChange={(event) => handleSelectTemplate(event.target.value)}
                      className="min-h-[42px] rounded-[0.9rem] bg-black/20 py-2.5"
                      disabled={templates.length === 0}
                    >
                      {templates.length === 0 ? (
                        <option value="">Loading templates...</option>
                      ) : null}
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">Filter</div>
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name or track"
                      className="min-h-[42px] rounded-[0.9rem] bg-black/20 py-2.5"
                    />
                  </div>
                </div>
                {filteredTemplates.length === 0 ? (
                  <div className="mt-5 rounded-[1.1rem] border border-white/10 bg-black/15 p-5 text-sm text-muted">
                    {templates.length === 0
                      ? "Templates are still loading. If this stays empty, the frontend cannot reach the backend template endpoint."
                      : "No templates match this filter. Clear the search to see all templates."}
                  </div>
                ) : (
                  <div className="thin-scrollbar mt-5 grid gap-4 overflow-auto pb-1 lg:grid-cols-3">
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleSelectTemplate(template.id)}
                        className={classNames(
                          "min-h-[11rem] rounded-[1.1rem] border p-4 text-left transition-all duration-500",
                          selectedTemplateId === template.id
                            ? "border-accent/35 bg-accent/10 shadow-[0_22px_48px_-34px_rgba(197,122,74,0.55)]"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-base font-semibold tracking-[-0.03em] text-ink">{template.name}</div>
                          <StatusBadge value={selectedTemplateId === template.id ? "active" : template.category} />
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{template.summary}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(template.tracks || []).slice(0, 3).map((track) => (
                            <span key={track} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-soft">
                              {track.replaceAll("_", " ")}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="studio-panel p-5 md:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <div className="eyebrow">Builder canvas</div>
                    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3">
                      <h2 className="truncate text-2xl font-semibold tracking-[-0.05em] text-ink">
                        {selectedTemplate?.name || "Select a template"}
                      </h2>
                      <StatusBadge value={selectedAgent?.status || "draft"} />
                    </div>
                    <p className="mt-3 max-w-[72ch] text-sm leading-7 text-muted">
                      {selectedTemplate?.summary || "Choose a template from the left rail to shape the workflow graph and draft package."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(selectedTemplate?.tracks || []).map((track) => (
                      <span
                        key={track}
                        className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-accent"
                      >
                        {track.replaceAll("_", " ")}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-5 border-t border-white/10 pt-5">
                  <BuilderLifecycleMap selectedAgent={selectedAgent} />
                </div>
              </div>

              <div className="canvas-shell">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">Workflow canvas</div>
                    <div className="mt-1 text-sm font-semibold text-ink">Planner, specialist, and executor topology</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-soft md:inline-flex">
                      {selectedAgent?.status === "draft" ? "editable draft" : "published lock"}
                    </span>
                    <ShareNetwork size={18} weight="light" className="text-accent" />
                  </div>
                </div>
                <div className="p-5 md:p-6">
                  <WorkflowGraph
                    workflow={activeWorkflow}
                    requiredSecrets={activeRequiredSecrets}
                    runtimeTargets={activeRuntimeTargets}
                    editable={selectedAgent?.status === "draft"}
                    onRoleOrderChange={handleWorkflowRoleOrderChange}
                    saveState={pending.workflowSave ? "saving" : "idle"}
                    notice={workflowNotice}
                  />
                </div>
              </div>
            </div>

            <div>
              <form onSubmit={handleCreateAgent} className="studio-panel overflow-hidden">
                <div className="border-b border-white/10 bg-white/[0.025] px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="eyebrow">Create draft</div>
                      <div className="mt-1 text-lg font-semibold tracking-[-0.04em] text-ink">Ready to package</div>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                      <CirclesThreePlus size={18} weight="light" />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    Use the selected template and choose the wallet that should own this package.
                  </p>
                </div>

                <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,0.7fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.55fr)]">
                  <div className="rounded-[1.1rem] border border-accent/25 bg-accent/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#d8a786]">Template</div>
                        <div className="mt-2 truncate text-base font-semibold text-ink">
                          {selectedTemplate?.name || "No template selected"}
                        </div>
                      </div>
                      <StatusBadge value={selectedTemplate?.category || "draft"} />
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                      {selectedTemplate?.summary || "Choose a template from the canvas library."}
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {(selectedTemplate?.roles || []).map((role, index) => (
                        <div key={role.id} className="rounded-[0.85rem] border border-white/10 bg-black/20 px-3 py-2">
                          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-soft">
                            {String(index + 1).padStart(2, "0")}
                          </div>
                          <div className="mt-1 truncate text-xs font-semibold text-ink">{role.id}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-[1.1rem] border border-white/10 bg-black/15 p-4">
                    <FormField label="Template">
                      <Select
                        value={createForm.templateId}
                        onChange={(event) => handleSelectTemplate(event.target.value)}
                        disabled={templates.length === 0}
                      >
                        {templates.length === 0 ? (
                          <option value="">Loading templates...</option>
                        ) : null}
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="Agent name">
                      <Input value={createForm.name} onChange={(event) => updateCreateForm("name", event.target.value)} />
                    </FormField>
                    <FormField
                      label="Package owner"
                      helper="Any wallet can create a package. The selected owner is the wallet that must sign publish, registry, and grant actions."
                    >
                      <Input
                        value={createForm.owner}
                        placeholder="Connect a wallet or paste any 0G address"
                        onChange={(event) => updateCreateForm("owner", event.target.value)}
                      />
                    </FormField>
                  </div>

                  <details className="rounded-[1.1rem] border border-white/10 bg-black/15 lg:col-span-2">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none">
                      <span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">Optional</span>
                        <span className="mt-1 block text-sm font-semibold text-ink">Advanced settings</span>
                      </span>
                      <ShieldCheck size={16} weight="light" className="text-accent" />
                    </summary>
                    <div className="grid gap-3 border-t border-white/10 p-4">
                      <FormField label="Description">
                        <TextArea
                          value={createForm.description}
                          onChange={(event) => updateCreateForm("description", event.target.value)}
                          className="min-h-[84px]"
                        />
                      </FormField>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <FormField label="Sensitivity">
                          <Select value={createForm.dataSensitivity} onChange={(event) => updateCreateForm("dataSensitivity", event.target.value)}>
                            <option value="restricted">restricted</option>
                            <option value="confidential">confidential</option>
                            <option value="regulated">regulated</option>
                          </Select>
                        </FormField>
                        <FormField label="Export rights">
                          <Select value={createForm.exportability} onChange={(event) => updateCreateForm("exportability", event.target.value)}>
                            <option value="owner_authorized">owner_authorized</option>
                            <option value="non_exportable">non_exportable</option>
                            <option value="licensable">licensable</option>
                          </Select>
                        </FormField>
                      </div>
                      <FormField label="Knowledge sources">
                        <Input value={createForm.knowledgeSources} onChange={(event) => updateCreateForm("knowledgeSources", event.target.value)} />
                      </FormField>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <FormField label="Approval">
                          <Select value={createForm.approvalMode} onChange={(event) => updateCreateForm("approvalMode", event.target.value)}>
                            <option value="human_for_external_actions">human_for_external_actions</option>
                            <option value="manual">manual</option>
                            <option value="policy_gated">policy_gated</option>
                          </Select>
                        </FormField>
                        <FormField label="Max steps">
                          <Input type="number" min="1" max="12" value={createForm.maxStepsPerRun} onChange={(event) => updateCreateForm("maxStepsPerRun", event.target.value)} />
                        </FormField>
                      </div>
                    </div>
                  </details>
                </div>

                <div className="border-t border-white/10 bg-black/20 p-5">
                  <button type="submit" className="pill-primary w-full justify-center gap-4 group sm:w-auto">
                    {pending.create ? "Creating draft..." : "Create draft package"}
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                      <ArrowUpRight size={16} weight="light" />
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </section>
        ) : null}

        {activePhase === "publish" ? (
          <section>
            <SectionShell title="Publish and registry" eyebrow="Publish / Lifecycle" icon={FileArrowUp}>
              <div className="grid gap-8">
                <div className="grid gap-4 xl:grid-cols-3">
                  {publishSteps.map((step, index) => (
                    <ProgressStep
                      key={step.id}
                      index={index + 1}
                      label={step.label}
                      status={step.status}
                      detail={step.detail}
                      href={step.href}
                      active={selectedPublishStepId === step.id}
                      onClick={() => setSelectedPublishStepId(step.id)}
                    />
                  ))}
                </div>

                <div className="grid gap-4 rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
                  <InlineStat label="Owner" value={selectedAgent ? formatShortAddress(selectedAgent.owner) : "Unselected"} />
                  <InlineStat label="Storage root" value={selectedAgent?.storageRoot ? `${selectedAgent.storageRoot.slice(0, 12)}...` : "Missing"} />
                  <InlineStat label="Registry" value={selectedAgent?.registryAddress ? formatShortAddress(selectedAgent.registryAddress) : "Missing"} />
                  <InlineStat label="Onchain status" value={selectedAgent?.onchainStatus || "not_registered"} />
                </div>

                <div className="rounded-[1.45rem] border border-white/10 bg-black/15 p-5">
                  {selectedPublishStepId === "draft" ? (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
                      <div className="space-y-4">
                        <div>
                          <div className="eyebrow">Step 00</div>
                          <div className="mt-1 text-lg font-semibold tracking-[-0.04em] text-ink">Draft package summary</div>
                        </div>
                        {selectedAgent ? (
                          <div className="grid gap-4 md:grid-cols-2">
                            <DataTag label="Agent" value={selectedAgent.name} />
                            <DataTag label="Template" value={selectedAgent.templateId} />
                            <DataTag label="Owner" value={formatShortAddress(selectedAgent.owner)} />
                            <DataTag label="Package hash" value={`${selectedAgent.packageHash?.slice(0, 12) || "missing"}...`} />
                          </div>
                        ) : (
                          <EmptyPanel title="No draft selected." body="Pick an agent package from the selector or create one in the build phase." />
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="eyebrow">Recommended flow</div>
                        <div className="grid gap-3">
                          {(selectedAgentState.publishIntent?.recommendedPublishFlow || []).map((item, index) => (
                            <div key={index} className="rounded-[1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted">
                              <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.2em] text-soft">{String(index + 1).padStart(2, "0")}</span>
                              {item}
                            </div>
                          ))}
                        </div>
                        <JsonPanel label="Package payload" value={prettifyJson(selectedAgentState.publishIntent?.packagePayload)} />
                      </div>
                    </div>
                  ) : null}

                  {selectedPublishStepId === "storage" ? (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                      <div className="space-y-5">
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                          <div>
                            <div className="eyebrow">Step 01</div>
                            <div className="mt-1 text-lg font-semibold tracking-[-0.04em] text-ink">Wallet publish to 0G Storage</div>
                          </div>
                          <StatusBadge value={selectedAgent?.status || "draft"} />
                        </div>
                        {selectedAgentState.publishIntent ? (
                          <>
                            <InlineNotice tone={publishNotices.storage?.tone} message={publishNotices.storage?.message} />
                            <div className="metric-card">
                              <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">Connected wallet</div>
                                  <div className="mt-2 text-sm font-semibold text-ink">
                                    {walletState.connected ? formatShortAddress(walletState.address) : "Not connected"}
                                  </div>
                                  <div className="mt-1 font-mono text-xs text-soft">chain id: {walletState.chainId || "n/a"}</div>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                  <button type="button" onClick={handleConnectWallet} className="pill-secondary">
                                    <Key size={16} weight="light" />
                                    {walletState.connected ? "Reconnect wallet" : "Connect wallet"}
                                  </button>
                                  <button type="button" onClick={handleWalletUpload} className="pill-primary group">
                                    <FileArrowUp size={16} weight="light" />
                                    {pending.uploadPackage ? "Uploading..." : "Upload package to 0G"}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <form onSubmit={handleConfirmPublish} className="grid gap-4">
                              <FormField label="Publisher wallet">
                                <Input value={publishForm.publisher} onChange={(event) => updatePublishForm("publisher", event.target.value)} />
                              </FormField>
                              <FormField label="Storage root">
                                <Input value={publishForm.storageRoot} onChange={(event) => updatePublishForm("storageRoot", event.target.value)} placeholder="0x..." />
                              </FormField>
                              <FormField label="Storage transaction hash">
                                <Input value={publishForm.storageTxHash} onChange={(event) => updatePublishForm("storageTxHash", event.target.value)} placeholder="0x..." />
                              </FormField>
                              <button type="submit" className="pill-primary group justify-between">
                                {pending.publish ? "Recording..." : "Confirm publish"}
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                                  <LinkSimple size={16} weight="light" />
                                </span>
                              </button>
                            </form>
                          </>
                        ) : (
                          <EmptyPanel title="Publish intent unavailable." body="Create or select a draft agent first." />
                        )}
                      </div>

                      <div className="space-y-4">
                        <JsonPanel label="Publish intent" value={prettifyJson(selectedAgentState.publishIntent)} />
                        {publishForm.storageTxHash ? (
                          <a
                            href={buildExplorerUrl(health, "tx", publishForm.storageTxHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-[#f2d0b6]"
                          >
                            Open storage transaction
                            <ArrowUpRight size={15} weight="light" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {selectedPublishStepId === "registry" ? (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                      <div className="space-y-5">
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                          <div>
                            <div className="eyebrow">Step 02</div>
                            <div className="mt-1 text-lg font-semibold tracking-[-0.04em] text-ink">Anchor package onchain</div>
                          </div>
                          <Fingerprint size={18} weight="light" className="text-accent" />
                        </div>
                        {selectedAgentState.registrationIntent ? (
                          <>
                            <InlineNotice tone={publishNotices.registry?.tone} message={publishNotices.registry?.message} />
                            <form onSubmit={handleConfirmRegistration} className="grid gap-4">
                              <FormField label="Registrant wallet">
                                <Input value={registrationForm.registrant} onChange={(event) => updateRegistrationForm("registrant", event.target.value)} />
                              </FormField>
                              <FormField label="Registry address">
                                <Input value={registrationForm.registryAddress} onChange={(event) => updateRegistrationForm("registryAddress", event.target.value)} />
                              </FormField>
                              <FormField label="Chain transaction hash">
                                <Input value={registrationForm.chainTxHash} onChange={(event) => updateRegistrationForm("chainTxHash", event.target.value)} placeholder="0x..." />
                              </FormField>
                              <button type="button" onClick={handleWalletRegister} className="pill-secondary group justify-between">
                                {pending.walletRegister ? "Submitting from wallet..." : "Submit registerAgent from wallet"}
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[#120e0b] transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                                  <Fingerprint size={16} weight="light" />
                                </span>
                              </button>
                              <button type="submit" className="pill-secondary group justify-between">
                                {pending.register ? "Confirming..." : "Confirm onchain registration"}
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[#120e0b] transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                                  <Fingerprint size={16} weight="light" />
                                </span>
                              </button>
                            </form>
                            {registrationForm.chainTxHash ? (
                              <a
                                href={buildExplorerUrl(health, "tx", registrationForm.chainTxHash)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-[#f2d0b6]"
                              >
                                Open registration transaction
                                <ArrowUpRight size={15} weight="light" />
                              </a>
                            ) : null}
                          </>
                        ) : (
                          <EmptyPanel title="Registration intent unavailable." body="Agents need a confirmed storage root before registry calldata can be shaped." />
                        )}
                      </div>

                      <div className="space-y-4">
                        <JsonPanel label="Registration intent" value={prettifyJson(selectedAgentState.registrationIntent)} />
                        {selectedAgentState.registrationIntent?.explorerAddressUrl ? (
                          <a
                            href={selectedAgentState.registrationIntent.explorerAddressUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-[#f2d0b6]"
                          >
                            Open registry contract
                            <ArrowUpRight size={15} weight="light" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </SectionShell>
          </section>
        ) : null}

        {activePhase === "permissions" ? (
          <section>
            <SectionShell title="Usage grants" eyebrow="Permissions / Authorization" icon={LockKeyOpen}>
              <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="space-y-5 xl:border-r xl:border-white/10 xl:pr-6">
                  <form onSubmit={handleCreateAuthorization} className="grid gap-4">
                    <FormField label="Grantee wallet">
                      <Input value={authorizationForm.grantee} onChange={(event) => updateAuthorizationForm("grantee", event.target.value)} placeholder="0x..." />
                    </FormField>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField label="Label">
                        <Input value={authorizationForm.label} onChange={(event) => updateAuthorizationForm("label", event.target.value)} />
                      </FormField>
                      <FormField label="Access mode">
                        <Select value={authorizationForm.accessMode} onChange={(event) => updateAuthorizationForm("accessMode", event.target.value)}>
                          <option value="licensed_mcp">licensed_mcp</option>
                          <option value="licensed_api">licensed_api</option>
                          <option value="authorized_use">authorized_use</option>
                        </Select>
                      </FormField>
                    </div>
                    <FormField label="Capabilities">
                      <Input value={authorizationForm.capabilities} onChange={(event) => updateAuthorizationForm("capabilities", event.target.value)} />
                    </FormField>
                    <FormField label="Expiry timestamp">
                      <Input value={authorizationForm.expiresAt} onChange={(event) => updateAuthorizationForm("expiresAt", event.target.value)} placeholder="1893456000" />
                    </FormField>
                    <button type="submit" className="pill-primary group justify-between">
                      {pending.authorize ? "Preparing..." : "Prepare authorization intent"}
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                        <Key size={16} weight="light" />
                      </span>
                    </button>
                  </form>

                  <div className="rounded-[1.3rem] border border-white/10 bg-black/15 p-4">
                    <div className="eyebrow">Confirmation defaults</div>
                    <div className="mt-4 grid gap-4">
                      <FormField label="Authorizer">
                        <Input value={authorizationConfirmForm.authorizer} onChange={(event) => updateAuthorizationConfirmForm("authorizer", event.target.value)} />
                      </FormField>
                      <FormField label="Registry address">
                        <Input value={authorizationConfirmForm.registryAddress} onChange={(event) => updateAuthorizationConfirmForm("registryAddress", event.target.value)} />
                      </FormField>
                      <FormField label="Chain transaction hash">
                        <Input value={authorizationConfirmForm.chainTxHash} onChange={(event) => updateAuthorizationConfirmForm("chainTxHash", event.target.value)} placeholder="0x..." />
                      </FormField>
                    </div>
                  </div>
                </div>

                <div>
                  {selectedAgentState.authorizations.length === 0 ? (
                    <EmptyPanel title="No grants recorded." body="Prepare an authorization intent to populate this ledger." />
                  ) : (
                    <div className="grid gap-4">
                      {selectedAgentState.authorizations.map((authorization) => (
                        <div key={authorization.id} className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">{authorization.accessMode}</div>
                              <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-ink">{authorization.label || authorization.grantee}</div>
                            </div>
                            <StatusBadge value={authorization.status} />
                          </div>
                          <div className="mt-4 font-mono text-xs text-soft">{authorization.grantee}</div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(authorization.capabilities || []).map((capability) => (
                              <span key={capability} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-soft">
                                {capability}
                              </span>
                            ))}
                          </div>
                          <div className="mt-4 rounded-[1.1rem] border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs text-soft">
                            {authorization.scopeHash}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-4 text-xs text-soft">
                            {authorization.chainTxHash ? (
                              <a
                                href={buildExplorerUrl(health, "tx", authorization.chainTxHash)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-accent hover:text-[#f2d0b6]"
                              >
                                Grant tx
                                <ArrowUpRight size={14} weight="light" />
                              </a>
                            ) : null}
                            {authorization.revocationTxHash ? (
                              <a
                                href={buildExplorerUrl(health, "tx", authorization.revocationTxHash)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-accent hover:text-[#f2d0b6]"
                              >
                                Revoke tx
                                <ArrowUpRight size={14} weight="light" />
                              </a>
                            ) : null}
                            {authorization.contractAddress || authorization.registryAddress ? (
                              <a
                                href={buildExplorerUrl(health, "address", authorization.registryAddress || authorization.contractAddress)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 text-accent hover:text-[#f2d0b6]"
                              >
                                Registry
                                <ArrowUpRight size={14} weight="light" />
                              </a>
                            ) : null}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            {authorization.status !== "active" ? (
                              <>
                                <button type="button" onClick={() => handleWalletAuthorize(authorization)} className="pill-primary group">
                                  {pending.walletAuthorize ? "Submitting from wallet..." : "Submit authorizeUsage"}
                                  <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                                    <Key size={16} weight="light" />
                                  </span>
                                </button>
                                <button type="button" onClick={() => handleConfirmAuthorization(authorization.id, authorization.scopeHash)} className="pill-secondary">
                                  <ArrowUpRight size={16} weight="light" />
                                  {pending.confirmAuthorization ? "Confirming..." : "Confirm grant"}
                                </button>
                              </>
                            ) : (
                              <button type="button" onClick={() => handleWalletRevoke(authorization)} className="pill-secondary group">
                                {pending.walletRevoke ? "Revoking..." : "Revoke grant"}
                                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[#120e0b] transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                                  <LockKeyOpen size={16} weight="light" />
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SectionShell>
          </section>
        ) : null}

        {activePhase === "runtime" ? (
          <section>
            <SectionShell title="Runtime console" eyebrow="Runtime / Execute" icon={TerminalWindow}>
              <div className="grid gap-8 xl:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
                <div className="xl:border-r xl:border-white/10 xl:pr-6">
                  {selectedAgent ? (
                    <form onSubmit={handleStartRun} className="grid gap-4">
                      <FormField label="Objective">
                        <TextArea value={runForm.objective} onChange={(event) => updateRunForm("objective", event.target.value)} />
                      </FormField>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField label="Audience">
                          <Input value={runForm.audience} onChange={(event) => updateRunForm("audience", event.target.value)} />
                        </FormField>
                        <FormField label="Tone">
                          <Input value={runForm.tone} onChange={(event) => updateRunForm("tone", event.target.value)} />
                        </FormField>
                        <FormField label="Execution mode">
                          <Select value={runForm.executionMode} onChange={(event) => updateRunForm("executionMode", event.target.value)}>
                            <option value="auto">auto</option>
                            <option value="zerog_broker">zerog_broker</option>
                            <option value="zerog_direct_api">zerog_direct_api</option>
                          </Select>
                        </FormField>
                        <FormField label="Credential source">
                          <Select value={runForm.credentialSource} onChange={(event) => updateRunForm("credentialSource", event.target.value)}>
                            <option value="user_runtime">user_runtime</option>
                            <option value="workspace_secret">workspace_secret</option>
                            <option value="platform_managed">platform_managed</option>
                          </Select>
                        </FormField>
                      </div>
                      <FormField label="Provided secret keys">
                        <Input value={runForm.providedSecretKeys} onChange={(event) => updateRunForm("providedSecretKeys", event.target.value)} />
                      </FormField>
                      <button type="submit" className="pill-primary group justify-between">
                        {pending.run ? "Submitting..." : "Submit workflow run"}
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                          <CursorClick size={16} weight="light" />
                        </span>
                      </button>
                    </form>
                  ) : (
                    <EmptyPanel title="Select an agent first." body="The runtime console attaches to the active agent dossier." />
                  )}
                </div>

                <div>
                  {filteredAgentRuns.length === 0 ? (
                    <EmptyPanel title="No runs recorded." body="Completed and failed workflow runs will appear here with persistence and execution state." />
                  ) : (
                    <div className="grid gap-4">
                      {filteredAgentRuns.map((run) => (
                        <div key={run.id} className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-5">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">{run.id}</div>
                              <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-ink">{run.objective}</div>
                            </div>
                            <StatusBadge value={run.status} />
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <DataTag label="Execution mode" value={run.compute?.requestedExecutionMode || run.executionMode} />
                            <div className="metric-card">
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-soft">Trace persistence</div>
                              <div className="mt-2"><StatusBadge value={run.tracePersistence || "local_only"} /></div>
                            </div>
                            <DataTag label="Created" value={formatDate(run.createdAt)} />
                            <DataTag label="Credential source" value={run.credentialSource} />
                          </div>
                          {run.error ? (
                            <div className="mt-4 rounded-[1.25rem] border border-[#8e4330]/25 bg-[#8e4330]/20 px-4 py-3 text-sm text-[#efb197]">
                              {run.error}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </SectionShell>
          </section>
        ) : null}

        {activePhase === "handoff" ? (
          <section>
            <SectionShell title="Runtime handoff" eyebrow="Handoff / Diagnostics" icon={Lightning}>
              <div className="grid gap-8 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
                <div className="space-y-5 xl:border-r xl:border-white/10 xl:pr-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <DataTag label="Backend" value={health?.ok ? "Reachable" : "Offline"} />
                    <DataTag label="Network" value={health?.network || "Unavailable"} />
                    <DataTag label="Compute mode" value={computeDiagnostics?.mode || "Unavailable"} />
                    <DataTag label="Agent registry" value={health?.readiness?.hasAgentRegistry ? "Configured" : "Missing"} />
                  </div>
                  <JsonPanel label="Compute diagnostics" value={prettifyJson(computeDiagnostics)} />
                </div>

                <div>
                  {selectedAgentState.exportManifest ? (
                    <JsonPanel label="Export manifest" value={prettifyJson(selectedAgentState.exportManifest)} />
                  ) : (
                    <EmptyPanel title="Manifest unavailable." body="Select an agent to inspect API, MCP, and runtime handoff details." />
                  )}
                </div>
              </div>
            </SectionShell>
          </section>
        ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
