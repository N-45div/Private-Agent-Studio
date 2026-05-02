import { BrowserProvider, Contract } from "ethers";
import { privateAgentRegistryAbi } from "./privateAgentRegistryAbi.js";

function getEthereum() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask or another EVM wallet.");
  }

  return window.ethereum;
}

async function createBrowserSigner() {
  const provider = new BrowserProvider(getEthereum());
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    address,
    chainId: Number(network.chainId),
  };
}

function normalizeHashValue(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "function") {
    return normalizeHashValue(value());
  }

  if (Array.isArray(value)) {
    return normalizeHashValue(value[0]);
  }

  if (typeof value === "object") {
    return normalizeHashValue(
      value.hash ||
        value.transactionHash ||
        value.txHash ||
        value.rootHash ||
        value.root ||
        value.value,
    );
  }

  return String(value);
}

export async function connectWallet() {
  return createBrowserSigner();
}

export async function ensureWallet() {
  const provider = new BrowserProvider(getEthereum());
  const accounts = await provider.send("eth_accounts", []);

  if (!accounts.length) {
    return null;
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    address,
    chainId: Number(network.chainId),
  };
}

export async function switchOrAddNetwork({ chainId, chainName, rpcUrl, blockExplorerUrl, nativeCurrency }) {
  const ethereum = getEthereum();
  const hexChainId = `0x${Number(chainId).toString(16)}`;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
  } catch (error) {
    if (error?.code !== 4902) {
      throw error;
    }

    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hexChainId,
          chainName,
          nativeCurrency,
          rpcUrls: [rpcUrl],
          blockExplorerUrls: blockExplorerUrl ? [blockExplorerUrl] : [],
        },
      ],
    });
  }

  return ensureWallet();
}

export async function uploadJsonPackage({
  payload,
  fileName,
  indexerRpc,
  rpcUrl,
}) {
  const { Blob: ZgBlob, Indexer } = await import("@0gfoundation/0g-ts-sdk");
  const wallet = await createBrowserSigner();
  const json = JSON.stringify(payload, null, 2);
  const file = new File([json], fileName, {
    type: "application/json",
  });
  const blob = new ZgBlob(file);
  const [tree, treeError] = await blob.merkleTree();

  if (treeError) {
    throw new Error(`Failed to prepare Merkle tree: ${treeError}`);
  }

  const indexer = new Indexer(indexerRpc);
  const [tx, uploadError] = await indexer.upload(blob, rpcUrl, wallet.signer);

  if (uploadError) {
    throw new Error(`0G Storage upload failed: ${uploadError}`);
  }

  const receipt =
    tx && "rootHash" in tx
      ? { rootHash: normalizeHashValue(tx.rootHash), txHash: normalizeHashValue(tx.txHash) }
      : {
          rootHash: normalizeHashValue(tx?.rootHashes || tree?.rootHash) || null,
          txHash: normalizeHashValue(tx?.txHashes || tx?.hash || tx?.transactionHash) || null,
        };

  return {
    ...wallet,
    ...receipt,
    fileName,
  };
}

export async function writePrivateAgentRegistry({
  contractAddress,
  functionName,
  args,
}) {
  const wallet = await createBrowserSigner();
  const contract = new Contract(contractAddress, privateAgentRegistryAbi, wallet.signer);
  const tx = await contract[functionName](...args);
  const receipt = await tx.wait();

  return {
    ...wallet,
    contractAddress,
    functionName,
    txHash: receipt?.hash || tx.hash,
  };
}
