/**
 * Market Data Adapters
 * 
 * Export all adapters and types for easy importing
 */

export type { MarketDataAdapter } from "./adapter";
export type { MarketQuote } from "./types";
export { MarketType } from "./types";
export { TencentUSAdapter } from "./tencent-us-adapter";

// Import types for use in this file
import type { MarketDataAdapter } from "./adapter";
import type { MarketQuote } from "./types";
import { MarketType } from "./types";
import { TencentUSAdapter } from "./tencent-us-adapter";

/**
 * Factory function to get the appropriate adapter for a market type
 */
export function getAdapterForMarket(marketType: MarketType): MarketDataAdapter {
  switch (marketType) {
    case MarketType.US:
      return new TencentUSAdapter();
    case MarketType.CN:
      // TODO: Implement TencentCNAdapter
      throw new Error("CN market adapter not yet implemented");
    case MarketType.HK:
      // TODO: Implement TencentHKAdapter
      throw new Error("HK market adapter not yet implemented");
    default:
      throw new Error(`Unknown market type: ${marketType}`);
  }
}

/**
 * Auto-detect market type from ticker and return appropriate adapter
 * 
 * @param ticker - Stock ticker symbol
 * @returns MarketDataAdapter instance
 */
export function getAdapterForTicker(ticker: string): MarketDataAdapter {
  // Try US adapter first (most common)
  const usAdapter = new TencentUSAdapter();
  if (usAdapter.isValidTicker(ticker)) {
    return usAdapter;
  }

  // TODO: Add detection logic for CN and HK markets
  // For now, default to US
  return usAdapter;
}

