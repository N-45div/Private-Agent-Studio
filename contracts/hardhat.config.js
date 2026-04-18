import "dotenv/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";

const privateKey = process.env.PRIVATE_KEY;
const configuredChainId = process.env.ZEROG_CHAIN_ID
  ? Number(process.env.ZEROG_CHAIN_ID)
  : undefined;

export default {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      metadata: {
        bytecodeHash: "none",
      },
    },
  },
  networks: {
    testnet: {
      url: process.env.ZEROG_RPC_URL || "https://evmrpc-testnet.0g.ai",
      chainId: configuredChainId,
      accounts: privateKey ? [privateKey] : [],
    },
    mainnet: {
      url: process.env.ZEROG_RPC_URL || "https://evmrpc.0g.ai",
      chainId: configuredChainId,
      accounts: privateKey ? [privateKey] : [],
    },
  },
  etherscan: {
    apiKey: {
      testnet: "PLACEHOLDER",
      mainnet: "PLACEHOLDER",
    },
    customChains: [
      {
        network: "testnet",
        chainId: 16602,
        urls: {
          apiURL: "https://chainscan-galileo.0g.ai/open/api",
          browserURL: "https://chainscan-galileo.0g.ai",
        },
      },
      {
        network: "mainnet",
        chainId: 16661,
        urls: {
          apiURL: "https://chainscan.0g.ai/open/api",
          browserURL: "https://chainscan.0g.ai",
        },
      },
    ],
  },
};
