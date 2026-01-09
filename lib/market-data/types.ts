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
}

/**
 * Market type enumeration
 */
export enum MarketType {
  US = "US",
  CN = "CN", // A-Shares
  HK = "HK", // Hong Kong
}

