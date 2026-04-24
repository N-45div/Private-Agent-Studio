import { BrowserProvider } from "ethers";

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
      ? { rootHash: tx.rootHash, txHash: tx.txHash }
      : {
          rootHash: tx?.rootHashes?.[0] || tree?.rootHash?.() || null,
          txHash: tx?.txHashes?.[0] || null,
        };

  return {
    ...wallet,
    ...receipt,
    fileName,
  };
}
