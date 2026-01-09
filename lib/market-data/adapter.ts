import { MarketQuote, MarketType } from "./types";

/**
 * Market Data Adapter Interface
 * 
 * This interface allows for easy extension to support different markets
 * (US, CN A-Shares, HK Stocks) with different data sources.
 */
export interface MarketDataAdapter {
  /**
   * Get market quote for a given ticker
   * @param ticker - Stock ticker symbol (e.g., "AAPL" for US stocks)
   * @returns Promise resolving to market quote data
   */
  getQuote(ticker: string): Promise<MarketQuote>;

  /**
   * Get the market type this adapter supports
   */
  getMarketType(): MarketType;

  /**
   * Check if a ticker is valid for this adapter
   * @param ticker - Stock ticker symbol to validate
   */
  isValidTicker(ticker: string): boolean;
}

