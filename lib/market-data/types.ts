/**
 * Market data quote information
 */
export interface MarketQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  volume?: number;
  timestamp: Date;
  marketType?: MarketType; // Add market type for currency display
  // Historical price changes
  change1D?: number; // 1 day change percent
  change1W?: number; // 1 week change percent
  change1M?: number; // 1 month change percent
  currency?: string; // Currency symbol (USD, CNY, HKD)
}

/**
 * Market type enumeration
 */
export enum MarketType {
  US = "US",
  CN = "CN", // A-Shares
  HK = "HK", // Hong Kong
}

