import "dotenv/config";
import path from "node:path";

const network = process.env.ZEROG_NETWORK || "testnet";
const privateKey = process.env.PRIVATE_KEY || "";
const rpcUrl =
  process.env.ZEROG_RPC_URL ||
  (network === "mainnet" ? "https://evmrpc.0g.ai" : "https://evmrpc-testnet.0g.ai");
const chainId = process.env.ZEROG_CHAIN_ID
  ? Number(process.env.ZEROG_CHAIN_ID)
  : network === "mainnet"
    ? 16661
    : 16602;
const defaultComputeFallbackProviders =
  network === "mainnet"
    ? []
    : [
        "0xf07240Efa67755B5311bc75784a061eDB47165Dd",
        "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3",
        "0x6D233D2610c32f630ED53E8a7Cbf759568041f8f",
      ];
const computeFallbackProviders = (
  process.env.ZEROG_COMPUTE_FALLBACK_PROVIDERS ||
  defaultComputeFallbackProviders.join(",")
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

export const config = {
  port: Number.parseInt(process.env.PORT || "4000", 10),
  host: process.env.HOST || (process.env.PORT ? "0.0.0.0" : "127.0.0.1"),
  dataFile: path.join(process.cwd(), "data", "state.json"),
  stateStore:
    process.env.STATE_STORE ||
    (process.env.PORT && privateKey ? "zerog_snapshot" : "file"),
  stateKey: process.env.PRIVATE_AGENT_STATE_KEY || "private-agent-studio/state/main",
  statePointerAgentId: process.env.PRIVATE_AGENT_STATE_POINTER_ID || "private-agent-studio-state",
  stateStreamId: process.env.PRIVATE_AGENT_STATE_STREAM_ID || "",
  stateEncryptionKey: process.env.PRIVATE_AGENT_STATE_ENCRYPTION_KEY || privateKey,
  zeroG: {
    network,
    chainId,
    rpcUrl,
    privateKey,
    explorerBaseUrl:
      network === "mainnet"
        ? "https://chainscan.0g.ai/tx/"
        : "https://chainscan-galileo.0g.ai/tx/",
    chainExplorerBaseUrl:
      network === "mainnet"
        ? "https://chainscan.0g.ai/address/"
        : "https://chainscan-galileo.0g.ai/address/",
    registryAddress: process.env.AGENTVAULT_REGISTRY_ADDRESS || "",
    agentRegistryAddress:
      process.env.PRIVATE_AGENT_REGISTRY_ADDRESS || process.env.AGENTVAULT_REGISTRY_ADDRESS || "",
    storageIndexerRpc:
      process.env.ZEROG_STORAGE_INDEXER_RPC ||
      "https://indexer-storage-testnet-turbo.0g.ai",
    computeProvider: process.env.ZEROG_COMPUTE_PROVIDER || "",
    computeFallbackProviders,
    computeApiKey: process.env.ZEROG_COMPUTE_API_KEY || "",
    computeApiBase: process.env.ZEROG_COMPUTE_API_BASE || "",
    computeModel: process.env.ZEROG_COMPUTE_MODEL || "",
    computeRequireTee: (process.env.ZEROG_COMPUTE_REQUIRE_TEE || "true") === "true",
  },
};
