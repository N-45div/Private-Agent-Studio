import { useDeferredValue, useEffect, useMemo, useState, startTransition } from "react";
import {
  ArrowUpRight,
  Binary,
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
  Sparkle,
  TerminalWindow,
} from "@phosphor-icons/react";
import { api } from "./api.js";
import { connectWallet, ensureWallet, switchOrAddNetwork, uploadJsonPackage } from "./zerog.js";

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

function StatPill({ label, value, accent = "signal" }) {
  return (
    <div className="rounded-full border border-black/10 bg-white/50 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="flex items-center gap-3">
        <span
          className={classNames(
            "signal-dot",
            accent === "accent" ? "bg-accent" : "bg-signal",
          )}
        />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-black/45">
            {label}
          </div>
          <div className="text-sm font-semibold text-ink">{value}</div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ badge, title, body, icon: Icon }) {
  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-black/50">
        <Icon size={14} weight="light" />
        {badge}
      </div>
      <div className="space-y-3">
        <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-ink md:text-5xl md:leading-[0.92]">
          {title}
        </h2>
        <p className="max-w-[70ch] text-sm leading-7 text-black/60 md:text-base">{body}</p>
      </div>
    </div>
  );
}

function AppCard({ className = "", children }) {
  return (
    <div className={classNames("section-shell", className)}>
      <div className="section-core overflow-hidden">{children}</div>
    </div>
  );
}

function FormField({ label, helper, error, children }) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/45">{label}</span>
      {children}
      {helper ? <span className="text-xs text-black/45">{helper}</span> : null}
      {error ? <span className="text-xs font-medium text-accent">{error}</span> : null}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={classNames(
        "min-h-12 w-full rounded-[1.4rem] border border-black/10 bg-white/80 px-4 text-sm text-ink outline-none transition-all duration-500 ease-premium placeholder:text-black/35 focus:-translate-y-[1px] focus:border-black/25 focus:bg-white focus:shadow-[0_20px_30px_-24px_rgba(18,18,18,0.35)]",
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
        "min-h-12 w-full rounded-[1.4rem] border border-black/10 bg-white/80 px-4 text-sm text-ink outline-none transition-all duration-500 ease-premium focus:-translate-y-[1px] focus:border-black/25 focus:bg-white focus:shadow-[0_20px_30px_-24px_rgba(18,18,18,0.35)]",
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
        "min-h-[132px] w-full rounded-[1.4rem] border border-black/10 bg-white/80 px-4 py-3 text-sm text-ink outline-none transition-all duration-500 ease-premium placeholder:text-black/35 focus:-translate-y-[1px] focus:border-black/25 focus:bg-white focus:shadow-[0_20px_30px_-24px_rgba(18,18,18,0.35)]",
        props.className,
      )}
    />
  );
}

function JsonPanel({ label, value }) {
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-black/10 bg-[#151515]">
      <div className="border-b border-white/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.24em] text-white/45">
        {label}
      </div>
      <pre className="thin-scrollbar max-h-[22rem] overflow-auto px-4 py-4 font-mono text-xs leading-6 text-white/82">
        {value}
      </pre>
    </div>
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

function EmptyPanel({ title, body }) {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-[1.6rem] border border-dashed border-black/12 bg-white/45 p-8 text-center">
      <div className="max-w-sm space-y-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-black/40">Awaiting state</div>
        <h3 className="text-xl font-semibold tracking-[-0.04em] text-ink">{title}</h3>
        <p className="text-sm leading-7 text-black/55">{body}</p>
      </div>
    </div>
  );
}

export function App() {
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

  const activeAgentCount = agents.filter((agent) => agent.status === "published").length;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <div className="absolute left-[8%] top-[8rem] h-64 w-64 rounded-full bg-signal/10 blur-3xl" />
      <div className="absolute right-[5%] top-[20rem] h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1440px] flex-col px-4 pb-24 pt-6 md:px-6 lg:px-10">
        <header className="reveal sticky top-6 z-20 mx-auto mb-10 w-full max-w-[1280px]">
          <div className="mx-auto flex w-full items-center justify-between gap-4 rounded-full border border-black/10 bg-white/70 px-4 py-3 shadow-[0_20px_40px_-30px_rgba(18,18,18,0.25)] backdrop-blur-md md:px-6">
            <div className="flex items-center gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-ink text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Binary size={18} weight="light" />
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-black/40">Private Agent Studio</div>
                <div className="text-sm font-semibold tracking-[-0.03em] text-ink">0G operator console</div>
              </div>
            </div>
            <div className="hidden items-center gap-3 md:flex">
              <StatPill label="Templates" value={String(templates.length)} accent="signal" />
              <StatPill label="Drafts + Agents" value={String(agents.length)} accent="accent" />
              <button
                type="button"
                onClick={handleConnectWallet}
                className="group inline-flex items-center gap-3 rounded-full border border-black/10 bg-white/60 px-4 py-2.5 text-sm font-medium text-ink transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                  <Key size={15} weight="light" />
                </span>
                <span className="text-left">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-black/45">
                    Wallet
                  </span>
                  <span className="block text-sm font-semibold text-ink">
                    {pending.connectWallet ? "Connecting..." : formatShortAddress(walletState.address)}
                  </span>
                </span>
              </button>
            </div>
          </div>
        </header>

        <section className="grid min-h-[100dvh] items-end gap-8 pb-14 pt-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8 reveal">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-black/50">
              <Sparkle size={14} weight="light" />
              Track 1 + Track 5 + Track 3
            </div>
            <div className="space-y-6">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.07em] text-ink md:text-7xl md:leading-[0.9]">
                Build private multi-agent workflows on 0G without turning the product into another generic builder.
              </h1>
              <p className="max-w-[62ch] text-base leading-8 text-black/62 md:text-lg">
                This console is wired to the live backend surface: template catalog, draft creation,
                user-wallet publish handoff, registry intents, usage authorizations, and run
                orchestration across planner, specialist, and executor roles.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatPill label="Backend" value={health?.ok ? "reachable" : "offline"} accent="signal" />
              <StatPill label="Published agents" value={String(activeAgentCount)} accent="accent" />
              <StatPill
                label="Compute mode"
                value={computeDiagnostics?.mode || "broker"}
                accent="signal"
              />
              <StatPill
                label="Runtime"
                value={selectedAgentState.exportManifest?.runtime?.ownershipModel || "runtime_owned_secrets"}
                accent="accent"
              />
            </div>
          </div>

          <AppCard className="reveal reveal-delay-2">
            <div className="relative min-h-[32rem] bg-[#111111] px-6 py-6 text-white md:px-8">
              <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
              <div className="absolute inset-y-0 left-[56%] hidden w-px bg-white/10 lg:block" />
              <div className="absolute right-8 top-6 h-28 w-28 rounded-full border border-white/10 bg-accent/15 blur-2xl" />
              <div className="absolute bottom-10 left-10 h-24 w-24 rounded-full border border-white/10 bg-signal/20 blur-2xl" />
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/5 to-transparent" />
                <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-white/[0.04] to-transparent animate-scan" />
              </div>

              <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/45">Operating surface</div>
                  <div className="space-y-3">
                    <div className="text-3xl font-semibold tracking-[-0.06em]">Builder state</div>
                    <p className="text-sm leading-7 text-white/62">
                      No stock marketing chrome. This front end exposes the actual product path from
                      draft package to onchain authorization.
                    </p>
                  </div>

                  <div className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/40">
                      <span>Registry readiness</span>
                      <StatusBadge value={health?.readiness?.hasAgentRegistry ? "active" : "draft"} />
                    </div>
                    <div className="grid gap-3">
                      <div className="rounded-[1.3rem] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">Storage indexer</div>
                        <div className="mt-2 text-sm text-white/78">
                          {health?.readiness?.storageIndexerRpc || "Unavailable"}
                        </div>
                      </div>
                      <div className="rounded-[1.3rem] border border-white/10 bg-black/20 px-4 py-3">
                        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">Compute provider</div>
                        <div className="mt-2 text-sm text-white/78">
                          {health?.readiness?.computeProvider || "Unavailable"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      {
                        label: "Phase / 01",
                        title: "Draft package",
                        body: "Template, policy, and workflow graph stay local until publish.",
                        icon: CubeFocus,
                      },
                      {
                        label: "Phase / 02",
                        title: "Wallet publish",
                        body: "User signer pushes encrypted package to 0G Storage.",
                        icon: FileArrowUp,
                      },
                      {
                        label: "Phase / 03",
                        title: "Registry anchor",
                        body: "Owner confirms storage root and package hash onchain.",
                        icon: Fingerprint,
                      },
                      {
                        label: "Phase / 04",
                        title: "A2A runtime",
                        body: "Planner, specialist, and executor compose a private run trace.",
                        icon: Radio,
                      },
                    ].map((item, index) => (
                      <div
                        key={item.title}
                        className={classNames(
                          "rounded-[1.7rem] border border-white/10 bg-white/[0.05] p-5 transition-transform duration-700 ease-premium hover:-translate-y-1",
                          index === 0 ? "lg:translate-y-6" : "",
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
                            {item.label}
                          </div>
                          <item.icon size={18} weight="light" className="text-white/65" />
                        </div>
                        <div className="mt-10 space-y-3">
                          <div className="text-lg font-semibold tracking-[-0.04em] text-white">
                            {item.title}
                          </div>
                          <p className="text-sm leading-7 text-white/60">{item.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AppCard>
        </section>

        <section className="space-y-8 pb-24">
          <SectionHeading
            badge="Console / 01"
            title="Template intelligence and draft forging live in one surface."
            body="The layout stays asymmetric on desktop and collapses cleanly on mobile. Search, inspect template primitives, then mint a draft package directly against the current backend."
            icon={Rows}
          />

          <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
            <AppCard className="reveal reveal-delay-1">
              <div className="space-y-5 p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Template index</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">Workflow catalog</div>
                  </div>
                  <div className="rounded-full border border-black/10 bg-white/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-black/45">
                    {filteredTemplates.length} loaded
                  </div>
                </div>

                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tracks, summaries, or template names"
                />

                <div className="thin-scrollbar grid max-h-[40rem] gap-4 overflow-auto pr-1">
                  {pending.bootstrap ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`skeleton-${index}`}
                        className="animate-pulse rounded-[1.6rem] border border-black/10 bg-white/55 p-5"
                      >
                        <div className="h-3 w-24 rounded-full bg-black/10" />
                        <div className="mt-6 h-8 w-2/3 rounded-full bg-black/10" />
                        <div className="mt-4 h-16 rounded-[1rem] bg-black/10" />
                      </div>
                    ))
                  ) : filteredTemplates.length === 0 ? (
                    <EmptyPanel
                      title="No templates match this filter."
                      body="Try broader track terms or clear the search to restore the core template set."
                    />
                  ) : (
                    filteredTemplates.map((template, index) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplateId(template.id);
                          setCreateForm((current) => ({ ...current, templateId: template.id }));
                        }}
                        className={classNames(
                          "group text-left rounded-[1.8rem] border p-5 transition-all duration-700 ease-premium active:scale-[0.98]",
                          selectedTemplateId === template.id
                            ? "border-ink bg-ink text-white shadow-[0_28px_40px_-30px_rgba(18,18,18,0.5)]"
                            : "border-black/10 bg-white/65 text-ink hover:-translate-y-1 hover:border-black/20 hover:bg-white",
                          index % 2 === 1 ? "md:translate-x-6" : "",
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-current/45">
                            {template.category}
                          </div>
                          <ArrowUpRight
                            size={18}
                            weight="light"
                            className="transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1"
                          />
                        </div>
                        <div className="mt-8 space-y-4">
                          <div className="text-2xl font-semibold tracking-[-0.05em]">{template.name}</div>
                          <p className="text-sm leading-7 text-current/70">{template.summary}</p>
                          <div className="flex flex-wrap gap-2 pt-2">
                            {template.tracks?.map((track) => (
                              <span
                                key={track}
                                className={classNames(
                                  "rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]",
                                  selectedTemplateId === template.id
                                    ? "bg-white/10 text-white/70"
                                    : "bg-black/6 text-black/55",
                                )}
                              >
                                {track.replace("_", " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </AppCard>

            <AppCard className="reveal reveal-delay-2">
              <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
                <div className="border-b border-black/10 bg-[#111111] px-6 py-8 text-white md:border-b-0 md:border-r md:px-8">
                  <div className="space-y-6">
                    <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-white/45">Selected template</div>
                    {selectedTemplate ? (
                      <>
                        <div className="space-y-3">
                          <div className="text-3xl font-semibold tracking-[-0.06em]">{selectedTemplate.name}</div>
                          <p className="text-sm leading-7 text-white/62">{selectedTemplate.summary}</p>
                        </div>
                        <div className="space-y-3">
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">Roles</div>
                          <div className="grid gap-3">
                            {selectedTemplate.roles?.map((role) => (
                              <div key={role.id} className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] px-4 py-3">
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
                                  {role.roleType}
                                </div>
                                <div className="mt-2 text-sm font-medium text-white">{role.id}</div>
                                <div className="mt-1 text-sm leading-6 text-white/60">{role.purpose}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">Required runtime secrets</div>
                          <div className="grid gap-2">
                            {selectedTemplate.requiredSecrets?.map((secret) => (
                              <div key={secret.key} className="rounded-[1.2rem] border border-white/10 bg-black/20 px-4 py-3">
                                <div className="text-sm font-medium text-white">{secret.label}</div>
                                <div className="mt-1 text-xs leading-6 text-white/58">{secret.purpose}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <EmptyPanel
                        title="No template selected."
                        body="Pick a template to inspect its role graph, runtime targets, and secret model."
                      />
                    )}
                  </div>
                </div>

                <form onSubmit={handleCreateAgent} className="space-y-6 p-6 md:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Draft forge</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">Create a private agent package</div>
                    </div>
                    <button
                      type="submit"
                      className="group inline-flex items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                    >
                      Create draft
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                        <ArrowUpRight size={16} weight="light" />
                      </span>
                    </button>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <FormField label="Agent name">
                      <Input value={createForm.name} onChange={(event) => updateCreateForm("name", event.target.value)} />
                    </FormField>
                    <FormField label="Owner wallet" helper="Draft owner should match the wallet that publishes and registers the agent.">
                      <Input value={createForm.owner} onChange={(event) => updateCreateForm("owner", event.target.value)} />
                    </FormField>
                    <div className="md:col-span-2 -mt-1 flex">
                      <button
                        type="button"
                        onClick={handleUseConnectedWallet}
                        className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-black/55 transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                      >
                        <LinkSimple size={14} weight="light" />
                        Use connected wallet
                      </button>
                    </div>
                    <FormField label="Template">
                      <Select value={createForm.templateId} onChange={(event) => {
                        updateCreateForm("templateId", event.target.value);
                        setSelectedTemplateId(event.target.value);
                      }}>
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

                  <FormField label="Knowledge sources" helper="Comma-separated storage references or labels">
                    <Input value={createForm.knowledgeSources} onChange={(event) => updateCreateForm("knowledgeSources", event.target.value)} />
                  </FormField>

                  {screenError ? (
                    <div className="rounded-[1.4rem] border border-accent/15 bg-accent/10 px-4 py-3 text-sm text-accent">
                      {screenError}
                    </div>
                  ) : null}

                  {infoMessage ? (
                    <div className="rounded-[1.4rem] border border-signal/15 bg-signal/10 px-4 py-3 text-sm text-signal">
                      {infoMessage}
                    </div>
                  ) : null}

                  {pending.create ? (
                    <div className="h-2 overflow-hidden rounded-full bg-black/8">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-ink" />
                    </div>
                  ) : null}
                </form>
              </div>
            </AppCard>
          </div>
        </section>

        <section className="space-y-8 pb-24">
          <SectionHeading
            badge="Console / 02"
            title="Published agents get a proper dossier: storage, registry, authorization, and run state."
            body="This panel is driven by the selected agent. It shows the exact backend lifecycle rather than abstract diagrams, including manual confirmation payloads for wallet-mediated steps."
            icon={BracketsCurly}
          />

          <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
            <AppCard className="reveal reveal-delay-1">
              <div className="space-y-5 p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Agent roster</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">Select active dossier</div>
                  </div>
                  <div className="rounded-full border border-black/10 bg-white/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-black/45">
                    {agents.length} total
                  </div>
                </div>

                <div className="thin-scrollbar grid max-h-[62rem] gap-4 overflow-auto pr-1">
                  {agents.length === 0 ? (
                    <EmptyPanel
                      title="No agents yet."
                      body="Create a draft in the forge to unlock publish, registry, and run surfaces."
                    />
                  ) : (
                    agents.map((agent, index) => (
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
                          "text-left rounded-[1.8rem] border p-5 transition-all duration-700 ease-premium active:scale-[0.98]",
                          selectedAgentId === agent.id
                            ? "border-ink bg-ink text-white shadow-[0_28px_40px_-30px_rgba(18,18,18,0.5)]"
                            : "border-black/10 bg-white/65 text-ink hover:-translate-y-1 hover:bg-white",
                          index % 2 === 0 ? "md:translate-x-4" : "",
                        )}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-current/45">
                            {agent.templateId}
                          </div>
                          <StatusBadge value={agent.status} />
                        </div>
                        <div className="mt-5 space-y-3">
                          <div className="text-xl font-semibold tracking-[-0.05em]">{agent.name}</div>
                          <div className="text-sm leading-7 text-current/68">{agent.description || "No description supplied."}</div>
                          <div className="grid gap-2 pt-2">
                            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-current/45">
                              owner
                            </div>
                            <div className="truncate font-mono text-xs text-current/75">{agent.owner}</div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </AppCard>

            <div className="grid gap-6">
              <AppCard className="reveal reveal-delay-2">
                <div className="grid gap-0 border-black/10 lg:grid-cols-[1fr_1fr]">
                  <div className="border-b border-black/10 p-6 md:p-8 lg:border-b-0 lg:border-r">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Publish handoff</div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">0G Storage confirmation</div>
                      </div>
                      <FileArrowUp size={20} weight="light" className="text-black/55" />
                    </div>
                    <div className="mt-6">
                      {selectedAgentState.publishIntent ? (
                        <div className="space-y-5">
                          <JsonPanel label="Publish intent payload" value={prettifyJson(selectedAgentState.publishIntent)} />
                          <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Connected wallet</div>
                                <div className="mt-2 text-sm font-semibold text-ink">
                                  {walletState.connected ? formatShortAddress(walletState.address) : "Not connected"}
                                </div>
                                <div className="mt-1 font-mono text-xs text-black/55">
                                  chain id: {walletState.chainId || "n/a"}
                                </div>
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
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-[1.2rem] border border-black/10 bg-black/5 px-4 py-3">
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Indexer RPC</div>
                                <div className="mt-2 break-all text-xs text-black/68">
                                  {selectedAgentState.publishIntent.targets.storageIndexerRpc}
                                </div>
                              </div>
                              <div className="rounded-[1.2rem] border border-black/10 bg-black/5 px-4 py-3">
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">EVM RPC</div>
                                <div className="mt-2 break-all text-xs text-black/68">
                                  {selectedAgentState.publishIntent.targets.rpcUrl}
                                </div>
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
                            <FormField label="Publish mode">
                              <Select value={publishForm.publishMode} onChange={(event) => updatePublishForm("publishMode", event.target.value)}>
                                <option value="user_wallet_storage">user_wallet_storage</option>
                                <option value="user_wallet_storage_and_chain">user_wallet_storage_and_chain</option>
                              </Select>
                            </FormField>
                            <button
                              type="submit"
                              className="group inline-flex items-center justify-between rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                            >
                              Record publish confirmation
                              <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                                <LinkSimple size={16} weight="light" />
                              </span>
                            </button>
                          </form>
                        </div>
                      ) : (
                        <EmptyPanel
                          title="Publish intent unavailable."
                          body="Select or create a draft agent first. Once the backend can shape a draft package, this panel shows the exact storage handoff payload."
                        />
                      )}
                    </div>
                  </div>

                  <div className="p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Registry anchor</div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">Onchain registration</div>
                      </div>
                      <Fingerprint size={20} weight="light" className="text-black/55" />
                    </div>
                    <div className="mt-6">
                      {selectedAgentState.registrationIntent ? (
                        <div className="space-y-5">
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
                            <FormField label="Registration mode">
                              <Select value={registrationForm.registrationMode} onChange={(event) => updateRegistrationForm("registrationMode", event.target.value)}>
                                <option value="user_wallet_registry">user_wallet_registry</option>
                              </Select>
                            </FormField>
                            <button
                              type="submit"
                              className="group inline-flex items-center justify-between rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-medium text-ink transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                            >
                              Confirm onchain registration
                              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                                <ArrowUpRight size={16} weight="light" />
                              </span>
                            </button>
                          </form>
                        </div>
                      ) : (
                        <EmptyPanel
                          title="Registration intent unavailable."
                          body="Agents need a confirmed storage root before the backend can shape the registerAgent calldata."
                        />
                      )}
                    </div>
                  </div>
                </div>
              </AppCard>

              <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
                <AppCard className="reveal reveal-delay-3">
                  <div className="space-y-6 p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Authorization rail</div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">Usage grants and confirmation</div>
                      </div>
                      <LockKeyOpen size={20} weight="light" className="text-black/55" />
                    </div>

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
                      <FormField label="Capabilities" helper="Comma-separated capability list">
                        <Input value={authorizationForm.capabilities} onChange={(event) => updateAuthorizationForm("capabilities", event.target.value)} />
                      </FormField>
                      <FormField label="Expiry timestamp">
                        <Input value={authorizationForm.expiresAt} onChange={(event) => updateAuthorizationForm("expiresAt", event.target.value)} placeholder="1893456000" />
                      </FormField>
                      <button
                        type="submit"
                        className="group inline-flex items-center justify-between rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                      >
                        Prepare authorization intent
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                          <Key size={16} weight="light" />
                        </span>
                      </button>
                    </form>

                    <div className="rounded-[1.6rem] border border-black/10 bg-white/70 p-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Authorization confirmation defaults</div>
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
                </AppCard>

                <AppCard className="reveal reveal-delay-4">
                  <div className="grid gap-6 p-6 md:p-8">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Active grants</div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">Authorization ledger</div>
                      </div>
                      <div className="rounded-full border border-black/10 bg-white/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-black/45">
                        {selectedAgentState.authorizations.length} records
                      </div>
                    </div>

                    {selectedAgentState.authorizations.length === 0 ? (
                      <EmptyPanel
                        title="No grants recorded."
                        body="Prepare an authorization intent to see scope hashes, expiry, and confirm actions here."
                      />
                    ) : (
                      <div className="grid gap-4">
                        {selectedAgentState.authorizations.map((authorization) => (
                          <div key={authorization.id} className="rounded-[1.7rem] border border-black/10 bg-white/70 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-4">
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
                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Grantee</div>
                                <div className="font-mono text-xs text-black/70">{authorization.grantee}</div>
                              </div>
                              <div className="space-y-2">
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Expires</div>
                                <div className="font-mono text-xs text-black/70">
                                  {authorization.expiresAt ? authorization.expiresAt : "No expiry"}
                                </div>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Capabilities</div>
                                <div className="flex flex-wrap gap-2">
                                  {(authorization.capabilities || []).map((capability) => (
                                    <span key={capability} className="rounded-full bg-black/6 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-black/55">
                                      {capability}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="mt-5 rounded-[1.4rem] border border-black/10 bg-black/5 p-4">
                              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Scope hash</div>
                              <div className="mt-2 break-all font-mono text-xs text-black/70">{authorization.scopeHash}</div>
                            </div>
                            {authorization.status !== "active" ? (
                              <button
                                type="button"
                                onClick={() => handleConfirmAuthorization(authorization.id, authorization.scopeHash)}
                                className="mt-5 inline-flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-medium text-ink transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                              >
                                Confirm this grant
                                <ArrowUpRight size={16} weight="light" />
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </AppCard>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8 pb-24">
          <SectionHeading
            badge="Console / 03"
            title="Execution, diagnostics, and export sit in the same command deck."
            body="Runs are created against the selected agent. The same view exposes compute posture, export manifest data, and recent run traces so the workflow stays legible under failure."
            icon={Lightning}
          />

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <AppCard className="reveal reveal-delay-2">
              <div className="space-y-6 p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Run console</div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">Start A2A workflow</div>
                  </div>
                  <TerminalWindow size={20} weight="light" className="text-black/55" />
                </div>

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
                    <FormField label="Provided secret keys" helper="These names are recorded, not the secret values.">
                      <Input value={runForm.providedSecretKeys} onChange={(event) => updateRunForm("providedSecretKeys", event.target.value)} />
                    </FormField>
                    <button
                      type="submit"
                      className="group inline-flex items-center justify-between rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition-all duration-700 ease-premium hover:-translate-y-1 active:scale-[0.98]"
                    >
                      Submit workflow run
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition-transform duration-700 ease-premium group-hover:-translate-y-[1px] group-hover:translate-x-1">
                        <CursorClick size={16} weight="light" />
                      </span>
                    </button>
                  </form>
                ) : (
                  <EmptyPanel
                    title="Select an agent first."
                    body="The run console attaches to the active dossier. Once selected, you can trigger A2A runs and inspect their persistence mode."
                  />
                )}

                {pending.run ? (
                  <div className="h-2 overflow-hidden rounded-full bg-black/8">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-signal" />
                  </div>
                ) : null}
              </div>
            </AppCard>

            <div className="grid gap-6">
              <AppCard className="reveal reveal-delay-3">
                <div className="space-y-6 p-6 md:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Run history</div>
                      <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">Recent workflow traces</div>
                    </div>
                    <ClockCounterClockwise size={20} weight="light" className="text-black/55" />
                  </div>

                  {selectedAgentState.runs.length === 0 ? (
                    <EmptyPanel
                      title="No runs recorded."
                      body="As soon as a workflow run is submitted, this panel will display execution mode, persistence, and completion state."
                    />
                  ) : (
                    <div className="grid gap-4">
                      {selectedAgentState.runs
                        .slice()
                        .reverse()
                        .map((run) => (
                          <div key={run.id} className="rounded-[1.7rem] border border-black/10 bg-white/70 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                              <div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">
                                  {run.id}
                                </div>
                                <div className="mt-2 text-lg font-semibold tracking-[-0.04em] text-ink">
                                  {run.objective}
                                </div>
                              </div>
                              <StatusBadge value={run.status} />
                            </div>
                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                              <div className="rounded-[1.3rem] border border-black/10 bg-white/80 px-4 py-3">
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Execution mode</div>
                                <div className="mt-2 text-sm text-ink">{run.compute?.requestedExecutionMode || run.executionMode}</div>
                              </div>
                              <div className="rounded-[1.3rem] border border-black/10 bg-white/80 px-4 py-3">
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Trace persistence</div>
                                <div className="mt-2 flex items-center gap-3">
                                  <StatusBadge value={run.tracePersistence || "local_only"} />
                                </div>
                              </div>
                              <div className="rounded-[1.3rem] border border-black/10 bg-white/80 px-4 py-3">
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Created</div>
                                <div className="mt-2 text-sm text-ink">{formatDate(run.createdAt)}</div>
                              </div>
                              <div className="rounded-[1.3rem] border border-black/10 bg-white/80 px-4 py-3">
                                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Credential source</div>
                                <div className="mt-2 text-sm text-ink">{run.credentialSource}</div>
                              </div>
                            </div>
                            {run.error ? (
                              <div className="mt-5 rounded-[1.4rem] border border-accent/15 bg-accent/10 px-4 py-3 text-sm text-accent">
                                {run.error}
                              </div>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </AppCard>

              <AppCard className="reveal reveal-delay-4">
                <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[0.92fr_1.08fr]">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Diagnostics</div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">Compute and readiness</div>
                      </div>
                      <ShieldCheck size={20} weight="light" className="text-black/55" />
                    </div>
                    <div className="grid gap-4">
                      <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
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
                      <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
                        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-black/40">Compute diagnostics</div>
                        <div className="mt-4 grid gap-3 text-sm text-ink">
                          <div className="flex items-center justify-between">
                            <span>Mode</span>
                            <span className="font-mono text-xs text-black/60">{computeDiagnostics?.mode || "n/a"}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>TEE required</span>
                            <span className="font-mono text-xs text-black/60">{String(computeDiagnostics?.teeRequired ?? false)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Direct ready</span>
                            <span className="font-mono text-xs text-black/60">{String(computeDiagnostics?.ready ?? false)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-black/40">Export handoff</div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-ink">Manifest and runtime profile</div>
                      </div>
                      <CirclesThreePlus size={20} weight="light" className="text-black/55" />
                    </div>
                    {selectedAgentState.exportManifest ? (
                      <JsonPanel label="Export manifest" value={prettifyJson(selectedAgentState.exportManifest)} />
                    ) : (
                      <EmptyPanel
                        title="Manifest unavailable."
                        body="Select an agent to inspect the API, MCP, and OpenClaw handoff bundle."
                      />
                    )}
                  </div>
                </div>
              </AppCard>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
