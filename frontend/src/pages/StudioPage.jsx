import { useDeferredValue, useEffect, useMemo, useState, startTransition } from "react";
import {
  ArrowUpRight,
  BracketsCurly,
  CirclesThreePlus,
  ClockCounterClockwise,
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
  ShieldCheck,
  TerminalWindow,
} from "@phosphor-icons/react";
import { api } from "../api.js";
import { connectWallet, ensureWallet, switchOrAddNetwork, uploadJsonPackage } from "../zerog.js";

const defaultOwner = "0x1234567890123456789012345678901234567890";

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
    <div className="rounded-[1.35rem] border border-black/10 bg-white/75 px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">{label}</div>
      <div className="mt-2 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function SectionShell({ title, eyebrow, icon: Icon, children, className = "" }) {
  return (
    <div className={classNames("section-shell", className)}>
      <section className="section-core h-full p-6 md:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">{eyebrow}</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">{title}</h2>
          </div>
          <Icon size={19} weight="light" className="text-black/55" />
        </div>
        {children}
      </section>
    </div>
  );
}

function FormField({ label, helper, children }) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">{label}</span>
      {children}
      {helper ? <span className="text-xs text-black/48">{helper}</span> : null}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={classNames(
        "min-h-12 w-full rounded-[1.25rem] border border-black/10 bg-white/85 px-4 text-sm text-ink outline-none transition-all duration-500 ease-premium placeholder:text-black/35 focus:-translate-y-[1px] focus:border-black/25 focus:bg-white focus:shadow-[0_18px_28px_-24px_rgba(18,18,18,0.35)]",
        props.className,
      )}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={classNames(
        "min-h-12 w-full rounded-[1.25rem] border border-black/10 bg-white/85 px-4 text-sm text-ink outline-none transition-all duration-500 ease-premium focus:-translate-y-[1px] focus:border-black/25 focus:bg-white focus:shadow-[0_18px_28px_-24px_rgba(18,18,18,0.35)]",
        props.className,
      )}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className={classNames(
        "min-h-[132px] w-full rounded-[1.25rem] border border-black/10 bg-white/85 px-4 py-3 text-sm text-ink outline-none transition-all duration-500 ease-premium placeholder:text-black/35 focus:-translate-y-[1px] focus:border-black/25 focus:bg-white focus:shadow-[0_18px_28px_-24px_rgba(18,18,18,0.35)]",
        props.className,
      )}
    />
  );
}

function StatusBadge({ value }) {
  const palette = {
    draft: "bg-[#f5d66a]/30 text-[#7d5b00]",
    published: "bg-[#1f4fd1]/14 text-[#1f4fd1]",
    registered: "bg-[#2b865f]/16 text-[#1d6547]",
    active: "bg-[#2b865f]/16 text-[#1d6547]",
    failed: "bg-[#c94b2c]/16 text-[#8a2d17]",
    completed: "bg-[#2b865f]/16 text-[#1d6547]",
    running: "bg-[#1f4fd1]/14 text-[#1f4fd1]",
    local_only: "bg-black/8 text-black/60",
  };

  return (
    <span
      className={classNames(
        "inline-flex rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]",
        palette[value] || "bg-black/8 text-black/55",
      )}
    >
      {value}
    </span>
  );
}

function JsonPanel({ label, value }) {
  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-black/10 bg-[#151515]">
      <div className="border-b border-white/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
        {label}
      </div>
      <pre className="thin-scrollbar max-h-[20rem] overflow-auto px-4 py-4 font-mono text-xs leading-6 text-white/82">
        {value}
      </pre>
    </div>
  );
}

function EmptyPanel({ title, body }) {
  return (
    <div className="grid min-h-[180px] place-items-center rounded-[1.4rem] border border-dashed border-black/12 bg-white/45 p-8 text-center">
      <div className="max-w-sm space-y-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-black/40">Awaiting state</div>
        <h3 className="text-xl font-semibold tracking-[-0.04em] text-ink">{title}</h3>
        <p className="text-sm leading-7 text-black/55">{body}</p>
      </div>
    </div>
  );
}

export function StudioPage() {
  const [health, setHealth] = useState(null);
  const [computeDiagnostics, setComputeDiagnostics] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialCreateState.templateId);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [createForm, setCreateForm] = useState(initialCreateState);
  const [publishForm, setPublishForm] = useState(initialPublishState);
  const [registrationForm, setRegistrationForm] = useState(initialRegistrationState);
  const [authorizationForm, setAuthorizationForm] = useState(initialAuthorizationState);
  const [authorizationConfirmForm, setAuthorizationConfirmForm] = useState(initialAuthorizationConfirmState);
  const [runForm, setRunForm] = useState(initialRunState);
  const [search, setSearch] = useState("");
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
    publish: false,
    register: false,
    authorize: false,
    confirmAuthorization: false,
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
        setAgents(agentResponse.agents || []);

        const firstAgentId = agentResponse.agents?.[0]?.id || "";
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
    const nextAgents = response.agents || [];
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
      setInfoMessage(`Wallet connected: ${wallet.address}`);
    } catch (error) {
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, connectWallet: false }));
    }
  }

  async function handleUseConnectedWallet() {
    if (!walletState.connected || !walletState.address) {
      setScreenError("Connect a wallet before syncing the owner field.");
      return;
    }

    setCreateForm((current) => ({ ...current, owner: walletState.address }));
    setPublishForm((current) => ({ ...current, publisher: walletState.address }));
    setRegistrationForm((current) => ({ ...current, registrant: walletState.address }));
    setAuthorizationConfirmForm((current) => ({ ...current, authorizer: walletState.address }));
    setInfoMessage("Owner fields synced from the connected wallet.");
  }

  async function handleWalletUpload() {
    if (!selectedAgentState.publishIntent) {
      return;
    }

    setPending((current) => ({ ...current, uploadPackage: true }));
    setScreenError("");
    setInfoMessage("");

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
      setInfoMessage(`Package uploaded to 0G Storage. Root: ${upload.rootHash}`);
    } catch (error) {
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, uploadPackage: false }));
    }
  }

  async function handleCreateAgent(event) {
    event.preventDefault();
    setPending((current) => ({ ...current, create: true }));
    setScreenError("");
    setInfoMessage("");

    try {
      const response = await api.createAgent(buildCreatePayload(createForm));
      await refreshAgentList(response.agent.id);
      await loadAgentWorkbench(response.agent.id);
      setSelectedAgentId(response.agent.id);
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

    try {
      await api.confirmPublish(selectedAgent.id, {
        ...publishForm,
        packageHash: selectedAgentState.publishIntent.packageHash,
      });
      await loadAgentWorkbench(selectedAgent.id);
      await refreshAgentList(selectedAgent.id);
      setInfoMessage("Publish confirmation recorded.");
    } catch (error) {
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

    try {
      await api.confirmOnchainRegistration(selectedAgent.id, {
        ...registrationForm,
        packageHash: selectedAgentState.registrationIntent.packageHash,
        storageRoot: selectedAgentState.registrationIntent.storageRoot,
      });
      await loadAgentWorkbench(selectedAgent.id);
      await refreshAgentList(selectedAgent.id);
      setInfoMessage("Onchain registration confirmed.");
    } catch (error) {
      setScreenError(error.message);
    } finally {
      setPending((current) => ({ ...current, register: false }));
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

  const filteredAgentRuns = selectedAgentState.runs.slice().reverse();

  return (
    <div className="space-y-8 pb-24 pt-4">
      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionShell title="Operator deck" eyebrow="Studio / Overview" icon={CubeFocus}>
          <div className="grid gap-4 md:grid-cols-2">
            <DataTag label="Backend" value={health?.ok ? "Reachable" : "Offline"} />
            <DataTag label="Network" value={health?.network || "Unavailable"} />
            <DataTag label="Wallet" value={walletState.connected ? formatShortAddress(walletState.address) : "Not connected"} />
            <DataTag label="Compute mode" value={computeDiagnostics?.mode || "Unavailable"} />
            <DataTag label="Agent registry" value={health?.readiness?.hasAgentRegistry ? "Configured" : "Missing"} />
            <DataTag label="Published agents" value={String(agents.filter((agent) => agent.status === "published").length)} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleConnectWallet}
              className="group inline-flex items-center gap-3 rounded-full bg-ink px-4 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                <Key size={15} weight="light" />
              </span>
              {pending.connectWallet ? "Connecting..." : walletState.connected ? "Reconnect wallet" : "Connect wallet"}
            </button>
            <button
              type="button"
              onClick={handleUseConnectedWallet}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-4 py-3 text-sm font-medium text-ink transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
            >
              <LinkSimple size={16} weight="light" />
              Sync owner fields
            </button>
          </div>
          {screenError ? (
            <div className="mt-6 rounded-[1.35rem] border border-accent/15 bg-accent/10 px-4 py-3 text-sm text-accent">
              {screenError}
            </div>
          ) : null}
          {infoMessage ? (
            <div className="mt-4 rounded-[1.35rem] border border-signal/15 bg-signal/10 px-4 py-3 text-sm text-signal">
              {infoMessage}
            </div>
          ) : null}
        </SectionShell>

        <SectionShell title="Live compute posture" eyebrow="Studio / Diagnostics" icon={ShieldCheck}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.4rem] border border-black/10 bg-white/75 p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Health readiness</div>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between text-sm text-ink">
                  <span>Private key</span>
                  <StatusBadge value={health?.readiness?.hasPrivateKey ? "active" : "draft"} />
                </div>
                <div className="flex items-center justify-between text-sm text-ink">
                  <span>Agent registry</span>
                  <StatusBadge value={health?.readiness?.hasAgentRegistry ? "active" : "draft"} />
                </div>
                <div className="flex items-center justify-between text-sm text-ink">
                  <span>Compute API key</span>
                  <StatusBadge value={health?.readiness?.hasComputeApiKey ? "active" : "draft"} />
                </div>
              </div>
            </div>
            <JsonPanel label="Compute diagnostics" value={prettifyJson(computeDiagnostics)} />
          </div>
        </SectionShell>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.74fr_1.26fr]">
        <SectionShell title="Template index" eyebrow="Studio / Templates" icon={Rows}>
          <div className="space-y-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates by name, track, or summary"
            />
            <div className="thin-scrollbar grid max-h-[42rem] gap-4 overflow-auto pr-1">
              {pending.bootstrap ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="animate-pulse rounded-[1.5rem] border border-black/10 bg-white/60 p-5">
                    <div className="h-3 w-20 rounded-full bg-black/10" />
                    <div className="mt-6 h-8 w-2/3 rounded-full bg-black/10" />
                    <div className="mt-4 h-16 rounded-[1rem] bg-black/10" />
                  </div>
                ))
              ) : filteredTemplates.length === 0 ? (
                <EmptyPanel
                  title="No templates match this filter."
                  body="Clear the search or use broader track language to restore the catalog."
                />
              ) : (
                filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      setCreateForm((current) => ({ ...current, templateId: template.id }));
                    }}
                    className={classNames(
                      "rounded-[1.6rem] border p-5 text-left transition-all duration-700 ease-premium active:scale-[0.98]",
                      selectedTemplateId === template.id
                        ? "border-ink bg-ink text-white"
                        : "border-black/10 bg-white/65 text-ink hover:-translate-y-1 hover:bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-current/45">
                        {template.category}
                      </div>
                      <ArrowUpRight size={17} weight="light" />
                    </div>
                    <div className="mt-6 text-xl font-semibold tracking-[-0.05em]">{template.name}</div>
                    <p className="mt-3 text-sm leading-7 text-current/70">{template.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(template.tracks || []).map((track) => (
                        <span
                          key={track}
                          className={classNames(
                            "rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]",
                            selectedTemplateId === template.id
                              ? "bg-white/10 text-white/70"
                              : "bg-black/6 text-black/55",
                          )}
                        >
                          {track.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </SectionShell>

        <SectionShell title="Draft forge" eyebrow="Studio / Create" icon={BracketsCurly}>
          <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
            <div className="rounded-[1.6rem] border border-black/10 bg-[#151515] p-5 text-white">
              {selectedTemplate ? (
                <div className="space-y-5">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">Selected template</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.05em]">{selectedTemplate.name}</div>
                    <p className="mt-3 text-sm leading-7 text-white/62">{selectedTemplate.summary}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">Roles</div>
                    <div className="grid gap-3">
                      {selectedTemplate.roles?.map((role) => (
                        <div key={role.id} className="rounded-[1.3rem] border border-white/10 bg-white/[0.05] px-4 py-3">
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
                            {role.roleType}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-white">{role.id}</div>
                          <div className="mt-1 text-sm leading-6 text-white/60">{role.purpose}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyPanel title="No template selected." body="Choose a template to inspect its workflow design." />
              )}
            </div>

            <form onSubmit={handleCreateAgent} className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="Agent name">
                  <Input value={createForm.name} onChange={(event) => updateCreateForm("name", event.target.value)} />
                </FormField>
                <FormField label="Owner wallet" helper="Should match the wallet that publishes and registers this agent.">
                  <Input value={createForm.owner} onChange={(event) => updateCreateForm("owner", event.target.value)} />
                </FormField>
                <FormField label="Template">
                  <Select
                    value={createForm.templateId}
                    onChange={(event) => {
                      updateCreateForm("templateId", event.target.value);
                      setSelectedTemplateId(event.target.value);
                    }}
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Collaborators" helper="Comma-separated wallet addresses">
                  <Input value={createForm.collaborators} onChange={(event) => updateCreateForm("collaborators", event.target.value)} />
                </FormField>
              </div>

              <FormField label="Description">
                <TextArea value={createForm.description} onChange={(event) => updateCreateForm("description", event.target.value)} />
              </FormField>

              <div className="grid gap-5 md:grid-cols-3">
                <FormField label="Visibility">
                  <Select value={createForm.visibility} onChange={(event) => updateCreateForm("visibility", event.target.value)}>
                    <option value="private">private</option>
                    <option value="team_private">team_private</option>
                  </Select>
                </FormField>
                <FormField label="Sensitivity">
                  <Select value={createForm.dataSensitivity} onChange={(event) => updateCreateForm("dataSensitivity", event.target.value)}>
                    <option value="restricted">restricted</option>
                    <option value="confidential">confidential</option>
                    <option value="regulated">regulated</option>
                  </Select>
                </FormField>
                <FormField label="Exportability">
                  <Select value={createForm.exportability} onChange={(event) => updateCreateForm("exportability", event.target.value)}>
                    <option value="owner_authorized">owner_authorized</option>
                    <option value="non_exportable">non_exportable</option>
                    <option value="licensable">licensable</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <FormField label="Approval mode">
                  <Select value={createForm.approvalMode} onChange={(event) => updateCreateForm("approvalMode", event.target.value)}>
                    <option value="human_for_external_actions">human_for_external_actions</option>
                    <option value="manual">manual</option>
                    <option value="policy_gated">policy_gated</option>
                  </Select>
                </FormField>
                <FormField label="Max A2A steps">
                  <Input type="number" min="1" max="12" value={createForm.maxStepsPerRun} onChange={(event) => updateCreateForm("maxStepsPerRun", event.target.value)} />
                </FormField>
                <FormField label="Delegation">
                  <Select value={String(createForm.allowDelegation)} onChange={(event) => updateCreateForm("allowDelegation", event.target.value === "true")}>
                    <option value="true">enabled</option>
                    <option value="false">disabled</option>
                  </Select>
                </FormField>
              </div>

              <FormField label="Knowledge sources">
                <Input value={createForm.knowledgeSources} onChange={(event) => updateCreateForm("knowledgeSources", event.target.value)} />
              </FormField>

              <button
                type="submit"
                className="group inline-flex items-center justify-between rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
              >
                {pending.create ? "Creating draft..." : "Create draft package"}
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                  <ArrowUpRight size={16} weight="light" />
                </span>
              </button>
            </form>
          </div>
        </SectionShell>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <SectionShell title="Agent roster" eyebrow="Studio / Agents" icon={Radio}>
          <div className="thin-scrollbar grid max-h-[58rem] gap-4 overflow-auto pr-1">
            {agents.length === 0 ? (
              <EmptyPanel title="No agents yet." body="Create a draft first to unlock publish, registration, and run flows." />
            ) : (
              agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => {
                    setSelectedAgentId(agent.id);
                    startTransition(() => {
                      loadAgentWorkbench(agent.id);
                    });
                  }}
                  className={classNames(
                    "rounded-[1.5rem] border p-5 text-left transition-all duration-700 ease-premium active:scale-[0.98]",
                    selectedAgentId === agent.id
                      ? "border-ink bg-ink text-white"
                      : "border-black/10 bg-white/65 text-ink hover:-translate-y-1 hover:bg-white",
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-current/45">
                      {agent.templateId}
                    </div>
                    <StatusBadge value={agent.status} />
                  </div>
                  <div className="mt-4 text-xl font-semibold tracking-[-0.05em]">{agent.name}</div>
                  <div className="mt-2 text-sm leading-7 text-current/68">{agent.description || "No description supplied."}</div>
                  <div className="mt-4 font-mono text-xs text-current/70">{agent.owner}</div>
                </button>
              ))
            )}
          </div>
        </SectionShell>

        <div className="grid gap-6">
          <SectionShell title="Publish and registry" eyebrow="Studio / Lifecycle" icon={FileArrowUp}>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-5">
                {selectedAgentState.publishIntent ? (
                  <>
                    <JsonPanel label="Publish intent" value={prettifyJson(selectedAgentState.publishIntent)} />
                    <div className="rounded-[1.4rem] border border-black/10 bg-white/75 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Connected wallet</div>
                          <div className="mt-2 text-sm font-semibold text-ink">
                            {walletState.connected ? formatShortAddress(walletState.address) : "Not connected"}
                          </div>
                          <div className="mt-1 font-mono text-xs text-black/55">chain id: {walletState.chainId || "n/a"}</div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={handleConnectWallet}
                            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-medium text-ink transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                          >
                            <Key size={16} weight="light" />
                            {walletState.connected ? "Reconnect wallet" : "Connect wallet"}
                          </button>
                          <button
                            type="button"
                            onClick={handleWalletUpload}
                            className="group inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                          >
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
                      <button
                        type="submit"
                        className="group inline-flex items-center justify-between rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                      >
                        {pending.publish ? "Recording..." : "Confirm publish"}
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                          <LinkSimple size={16} weight="light" />
                        </span>
                      </button>
                    </form>
                  </>
                ) : (
                  <EmptyPanel title="Publish intent unavailable." body="Create or select a draft agent first." />
                )}
              </div>

              <div className="space-y-5">
                {selectedAgentState.registrationIntent ? (
                  <>
                    <JsonPanel label="Registration intent" value={prettifyJson(selectedAgentState.registrationIntent)} />
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
                      <button
                        type="submit"
                        className="group inline-flex items-center justify-between rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-ink transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                      >
                        {pending.register ? "Confirming..." : "Confirm onchain registration"}
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                          <Fingerprint size={16} weight="light" />
                        </span>
                      </button>
                    </form>
                  </>
                ) : (
                  <EmptyPanel title="Registration intent unavailable." body="Agents need a confirmed storage root before registry calldata can be shaped." />
                )}
              </div>
            </div>
          </SectionShell>

          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <SectionShell title="Usage grants" eyebrow="Studio / Authorization" icon={LockKeyOpen}>
              <div className="grid gap-5">
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
                  <button
                    type="submit"
                    className="group inline-flex items-center justify-between rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                  >
                    {pending.authorize ? "Preparing..." : "Prepare authorization intent"}
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                      <Key size={16} weight="light" />
                    </span>
                  </button>
                </form>

                <div className="rounded-[1.4rem] border border-black/10 bg-white/70 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Confirmation defaults</div>
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
            </SectionShell>

            <SectionShell title="Authorization ledger" eyebrow="Studio / Grants" icon={CirclesThreePlus}>
              {selectedAgentState.authorizations.length === 0 ? (
                <EmptyPanel title="No grants recorded." body="Prepare an authorization intent to populate this ledger." />
              ) : (
                <div className="grid gap-4">
                  {selectedAgentState.authorizations.map((authorization) => (
                    <div key={authorization.id} className="rounded-[1.45rem] border border-black/10 bg-white/75 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">
                            {authorization.accessMode}
                          </div>
                          <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-ink">
                            {authorization.label || authorization.grantee}
                          </div>
                        </div>
                        <StatusBadge value={authorization.status} />
                      </div>
                      <div className="mt-4 font-mono text-xs text-black/65">{authorization.grantee}</div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(authorization.capabilities || []).map((capability) => (
                          <span key={capability} className="rounded-full bg-black/6 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-black/55">
                            {capability}
                          </span>
                        ))}
                      </div>
                      <div className="mt-4 rounded-[1.25rem] border border-black/10 bg-black/5 px-4 py-3 font-mono text-xs text-black/65">
                        {authorization.scopeHash}
                      </div>
                      {authorization.status !== "active" ? (
                        <button
                          type="button"
                          onClick={() => handleConfirmAuthorization(authorization.id, authorization.scopeHash)}
                          className="mt-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-medium text-ink transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                        >
                          <ArrowUpRight size={16} weight="light" />
                          {pending.confirmAuthorization ? "Confirming..." : "Confirm grant"}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </SectionShell>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionShell title="Run console" eyebrow="Studio / Runtime" icon={TerminalWindow}>
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
              <button
                type="submit"
                className="group inline-flex items-center justify-between rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
              >
                {pending.run ? "Submitting..." : "Submit workflow run"}
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                  <CursorClick size={16} weight="light" />
                </span>
              </button>
            </form>
          ) : (
            <EmptyPanel title="Select an agent first." body="The runtime console attaches to the active agent dossier." />
          )}
        </SectionShell>

        <div className="grid gap-6">
          <SectionShell title="Recent runs" eyebrow="Studio / Runs" icon={ClockCounterClockwise}>
            {filteredAgentRuns.length === 0 ? (
              <EmptyPanel title="No runs recorded." body="Completed and failed workflow runs will appear here with persistence and execution state." />
            ) : (
              <div className="grid gap-4">
                {filteredAgentRuns.map((run) => (
                  <div key={run.id} className="rounded-[1.45rem] border border-black/10 bg-white/75 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">{run.id}</div>
                        <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-ink">{run.objective}</div>
                      </div>
                      <StatusBadge value={run.status} />
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <DataTag label="Execution mode" value={run.compute?.requestedExecutionMode || run.executionMode} />
                      <div className="rounded-[1.35rem] border border-black/10 bg-white/75 px-4 py-3">
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Trace persistence</div>
                        <div className="mt-2"><StatusBadge value={run.tracePersistence || "local_only"} /></div>
                      </div>
                      <DataTag label="Created" value={formatDate(run.createdAt)} />
                      <DataTag label="Credential source" value={run.credentialSource} />
                    </div>
                    {run.error ? (
                      <div className="mt-4 rounded-[1.25rem] border border-accent/15 bg-accent/10 px-4 py-3 text-sm text-accent">
                        {run.error}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </SectionShell>

          <SectionShell title="Export manifest" eyebrow="Studio / Handoff" icon={Lightning}>
            {selectedAgentState.exportManifest ? (
              <JsonPanel label="Manifest" value={prettifyJson(selectedAgentState.exportManifest)} />
            ) : (
              <EmptyPanel title="Manifest unavailable." body="Select an agent to inspect API, MCP, and runtime handoff details." />
            )}
          </SectionShell>
        </div>
      </section>
    </div>
  );
}
