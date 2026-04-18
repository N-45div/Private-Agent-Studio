export class MarketDataAdapter {
  async getSnapshot(input = {}) {
    return {
      timestamp: new Date().toISOString(),
      yieldOpportunities:
        input.yieldOpportunities || [
          { protocol: "Aave", token: "USDC", apr: 0.071 },
          { protocol: "Uniswap", token: "USDC", apr: 0.046 },
        ],
      prices:
        input.prices || {
          USDC: 1,
          ETH: 3200,
        },
    };
  }
}
