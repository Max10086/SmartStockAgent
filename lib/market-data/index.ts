/**
 * Market Data Adapters
 * 
 * Export all adapters and types for easy importing
 */

export type { MarketDataAdapter } from "./adapter";
export type { MarketQuote } from "./types";
export { MarketType } from "./types";
export { TencentUSAdapter } from "./tencent-us-adapter";
export { TencentCNAdapter } from "./tencent-cn-adapter";
export { TencentHKAdapter } from "./tencent-hk-adapter";

// Import types for use in this file
import type { MarketDataAdapter } from "./adapter";
import type { MarketQuote } from "./types";
import { MarketType } from "./types";
import { TencentUSAdapter } from "./tencent-us-adapter";
import { TencentCNAdapter } from "./tencent-cn-adapter";
import { TencentHKAdapter } from "./tencent-hk-adapter";

/**
 * Detect market type from ticker symbol
 */
function detectMarketType(ticker: string): MarketType {
  const normalized = ticker.trim().toUpperCase();
  
  // HK stocks: 5 digits or ends with .HK
  if (/^\d{5}$/.test(normalized) || normalized.endsWith(".HK")) {
    return MarketType.HK;
  }
  
  // CN stocks: 6 digits starting with 0, 3, or 6
  if (/^[036]\d{5}$/.test(normalized)) {
    return MarketType.CN;
  }
  
  // Check if it contains Chinese characters
  // Chinese names are likely CN or HK stocks
  if (/[\u4e00-\u9fa5]/.test(ticker)) {
    // Try CN first (more common for Chinese names)
    const cnAdapter = new TencentCNAdapter();
    if (cnAdapter.isValidTicker(ticker)) {
      return MarketType.CN;
    }
    // Then try HK
    const hkAdapter = new TencentHKAdapter();
    if (hkAdapter.isValidTicker(ticker)) {
      return MarketType.HK;
    }
    // Default to CN for Chinese names
    return MarketType.CN;
  }
  
  // Default to US
  return MarketType.US;
}

/**
 * Factory function to get the appropriate adapter for a market type
 */
export function getAdapterForMarket(marketType: MarketType): MarketDataAdapter {
  switch (marketType) {
    case MarketType.US:
      return new TencentUSAdapter();
    case MarketType.CN:
      return new TencentCNAdapter();
    case MarketType.HK:
      return new TencentHKAdapter();
    default:
      throw new Error(`Unknown market type: ${marketType}`);
  }
}

/**
 * Auto-detect market type from ticker and return appropriate adapter
 * 
 * @param ticker - Stock ticker symbol (can be code or Chinese name)
 * @returns MarketDataAdapter instance
 */
export function getAdapterForTicker(ticker: string): MarketDataAdapter {
  const marketType = detectMarketType(ticker);
  return getAdapterForMarket(marketType);
}

