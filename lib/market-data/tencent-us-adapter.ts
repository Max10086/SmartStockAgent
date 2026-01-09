import * as iconv from "iconv-lite";
import { MarketDataAdapter } from "./adapter";
import { MarketQuote, MarketType } from "./types";

/**
 * Tencent Finance API Adapter for US Stocks
 * 
 * Endpoint: http://qt.gtimg.cn/q=us{ticker}
 * 
 * Response format: v_usAAPL="200.00~201.50~..."
 * The response is encoded in GBK and needs to be decoded to UTF-8
 */
export class TencentUSAdapter implements MarketDataAdapter {
  private readonly baseUrl = "http://qt.gtimg.cn/q=";

  getMarketType(): MarketType {
    return MarketType.US;
  }

  isValidTicker(ticker: string): boolean {
    // Basic validation for US stock tickers
    // Tickers are typically 1-5 uppercase letters
    return /^[A-Z]{1,5}$/.test(ticker.toUpperCase());
  }

  /**
   * Fetch quote data from Tencent Finance API
   */
  async getQuote(ticker: string): Promise<MarketQuote> {
    const normalizedTicker = ticker.toUpperCase();
    
    if (!this.isValidTicker(normalizedTicker)) {
      throw new Error(`Invalid US stock ticker: ${ticker}`);
    }

    const url = `${this.baseUrl}us${normalizedTicker}`;

    try {
      // Fetch the data
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        // Add cache control to avoid stale data
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error for ${normalizedTicker}:`, response.status, errorText.substring(0, 200));
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the response as ArrayBuffer to handle GBK encoding
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Decode from GBK to UTF-8
      let decodedText: string;
      try {
        decodedText = iconv.decode(buffer, "gbk");
      } catch (decodeError) {
        // Fallback to UTF-8 if GBK decoding fails
        console.warn(`GBK decode failed for ${normalizedTicker}, trying UTF-8`);
        decodedText = buffer.toString("utf-8");
      }

      console.log(`[Tencent API] Raw response for ${normalizedTicker}:`, decodedText.substring(0, 300));

      // Parse the response
      return this.parseResponse(decodedText, normalizedTicker);
    } catch (error) {
      console.error(`Error fetching quote for ${normalizedTicker}:`, error);
      throw new Error(
        `Failed to fetch quote for ${normalizedTicker}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Parse Tencent Finance API response
   * 
   * Response format: v_usAAPL="200.00~201.50~199.80~200.50~1000000~2000000~..."
   * 
   * Field positions (0-indexed):
   * 0: Unknown
   * 1: Name (stock name in Chinese/English)
   * 2: Current Price
   * 3: Previous Close
   * 4: Open Price
   * 5: Volume
   * 6: Amount (turnover)
   * 7: Bid Price
   * 8: Ask Price
   * 9: High
   * 10: Low
   * 11: Current Price (again)
   * 12: Change
   * 13: Change Percent
   * 14: High (52-week)
   * 15: Low (52-week)
   * 16: Market Cap (if available)
   * ... more fields
   */
  private parseResponse(responseText: string, ticker: string): MarketQuote {
    // Extract the data part from response like: v_usAAPL="200.00~201.50~..."
    const match = responseText.match(/v_us\w+="([^"]+)"/);
    
    if (!match || !match[1]) {
      console.error(`Failed to parse Tencent API response for ${ticker}. Response:`, responseText.substring(0, 500));
      throw new Error(`Failed to parse Tencent API response for ${ticker}`);
    }

    const dataString = match[1];
    const fields = dataString.split("~");

    console.log(`[Tencent API] Parsing ${ticker}: ${fields.length} fields`);
    console.log(`[Tencent API] Fields:`, fields.slice(0, 15).map((f, i) => `${i}:${f}`).join(", "));

    if (fields.length < 14) {
      console.error(`Insufficient fields for ${ticker}. Got ${fields.length}, expected at least 14`);
      throw new Error(`Insufficient data fields in response for ${ticker}. Got ${fields.length} fields.`);
    }

    // Extract key fields
    const name = fields[1] || ticker;
    
    // Try multiple fields for current price (different APIs may use different positions)
    let currentPrice = this.parseFloatSafe(fields[2] || "0");
    if (currentPrice === 0 && fields[11]) {
      currentPrice = this.parseFloatSafe(fields[11]);
    }
    // If still 0, try field 3 (previous close might be current if market is closed)
    if (currentPrice === 0 && fields[3]) {
      const prevClose = this.parseFloatSafe(fields[3]);
      if (prevClose > 0) {
        currentPrice = prevClose;
      }
    }
    
    let previousClose = this.parseFloatSafe(fields[3] || "0");
    const change = this.parseFloatSafe(fields[12] || "0");
    const changePercent = this.parseFloatSafe(fields[13] || "0");
    const volume = this.parseFloatSafe(fields[5] || "0");
    const marketCap = fields[16] ? this.parseFloatSafe(fields[16]) : undefined;

    // Calculate change and price with priority logic
    let calculatedChange = change;
    let calculatedChangePercent = changePercent;
    
    // Priority 1: If we have both price and previous close, calculate change
    if (currentPrice > 0 && previousClose > 0) {
      if (change === 0) {
        calculatedChange = currentPrice - previousClose;
      }
      if (changePercent === 0 && calculatedChange !== 0) {
        calculatedChangePercent = ((calculatedChange / previousClose) * 100);
      }
    }
    // Priority 2: If change is provided but price is 0, calculate price from change
    else if (currentPrice === 0 && change !== 0 && previousClose > 0) {
      currentPrice = previousClose + change;
      calculatedChange = change;
      calculatedChangePercent = changePercent !== 0 ? changePercent : ((change / previousClose) * 100);
    }
    // Priority 3: If we have previous close but no current price, use previous close
    else if (currentPrice === 0 && previousClose > 0) {
      currentPrice = previousClose;
      calculatedChange = 0;
      calculatedChangePercent = 0;
    }
    // Priority 4: If we have change but no previous close, try to estimate
    else if (currentPrice > 0 && change !== 0 && previousClose === 0) {
      previousClose = currentPrice - change;
      calculatedChange = change;
      calculatedChangePercent = previousClose > 0 ? ((change / previousClose) * 100) : 0;
    }
    // Priority 5: Calculate percentage from change if we have change but no percentage
    else if (changePercent === 0 && change !== 0 && previousClose > 0) {
      calculatedChangePercent = ((change / previousClose) * 100);
    }

    // Final validation: if price is still 0, log warning
    if (currentPrice === 0) {
      console.warn(`[Tencent API] Warning: Price is 0 for ${ticker}. Fields:`, {
        field2: fields[2],
        field3: fields[3],
        field11: fields[11],
        field12: fields[12],
        field13: fields[13],
      });
    }

    return {
      ticker,
      name: name.trim(),
      price: currentPrice,
      change: calculatedChange,
      changePercent: calculatedChangePercent,
      marketCap,
      volume: volume > 0 ? volume : undefined,
      timestamp: new Date(),
    };
  }

  /**
   * Safely parse float, returning 0 if invalid
   */
  private parseFloatSafe(value: string): number {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
}

