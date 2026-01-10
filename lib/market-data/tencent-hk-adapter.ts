import * as iconv from "iconv-lite";
import { MarketDataAdapter } from "./adapter";
import { MarketQuote, MarketType } from "./types";
import { resolveTickerCode } from "./ticker-resolver";

/**
 * Tencent Finance API Adapter for Hong Kong Stocks
 * 
 * Endpoint: http://qt.gtimg.cn/q=hk{ticker}
 * 
 * Response format: v_hk00700="350.00~351.50~..."
 * The response is encoded in GBK and needs to be decoded to UTF-8
 */
export class TencentHKAdapter implements MarketDataAdapter {
  private readonly baseUrl = "http://qt.gtimg.cn/q=";

  getMarketType(): MarketType {
    return MarketType.HK;
  }

  isValidTicker(ticker: string): boolean {
    const normalized = ticker.trim().toUpperCase();
    
    // HK stocks: 4-5 digits (e.g., 2400, 00700 for Tencent)
    if (/^\d{4,5}$/.test(normalized)) {
      return true;
    }
    
    // HK stocks with .HK suffix (e.g., 2400.HK, 00700.HK)
    if (/^\d{4,5}\.HK$/.test(normalized)) {
      return true;
    }
    
    // Check if it contains Chinese characters (stock name)
    if (/[\u4e00-\u9fa5]/.test(normalized)) {
      return true; // Allow Chinese names
    }
    
    return false;
  }

  /**
   * Normalize ticker (remove .HK suffix if present)
   */
  private normalizeTicker(ticker: string): string {
    const normalized = ticker.trim().toUpperCase();
    // Remove .HK suffix if present
    return normalized.replace(/\.HK$/, "");
  }

  /**
   * Fetch quote data from Tencent Finance API
   */
  async getQuote(ticker: string): Promise<MarketQuote> {
    const normalizedTicker = this.normalizeTicker(ticker);
    
    // Resolve Chinese name to stock code if needed
    let stockCode: string;
    if (/^\d{4,5}$/.test(normalizedTicker)) {
      // It's already a valid code - pad to 5 digits if needed
      stockCode = normalizedTicker.padStart(5, '0');
    } else if (/[\u4e00-\u9fa5]/.test(normalizedTicker)) {
      // It's a Chinese name - resolve to code using AI
      console.log(`[Tencent HK API] Resolving Chinese name "${normalizedTicker}" to stock code...`);
      try {
        stockCode = await resolveTickerCode(normalizedTicker, "HK");
        // Pad to 5 digits
        stockCode = stockCode.padStart(5, '0');
        console.log(`[Tencent HK API] Resolved "${normalizedTicker}" to code: ${stockCode}`);
      } catch (error) {
        console.error(`[Tencent HK API] Failed to resolve "${normalizedTicker}":`, error);
        throw new Error(
          `无法找到股票代码 "${normalizedTicker}"。请直接输入4-5位数字股票代码（如 2400 或 00700）。错误: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } else {
      throw new Error(`Invalid HK stock ticker format: ${ticker}. Expected 4-5 digits or Chinese name.`);
    }

    const url = `${this.baseUrl}hk${stockCode}`;

    try {
      // Fetch the data
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
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
        console.warn(`GBK decode failed for ${normalizedTicker}, trying UTF-8`);
        decodedText = buffer.toString("utf-8");
      }

      console.log(`[Tencent HK API] Raw response for ${stockCode}:`, decodedText.substring(0, 300));

      // Parse the response
      return this.parseResponse(decodedText, stockCode);
    } catch (error) {
      console.error(`Error fetching quote for ${stockCode}:`, error);
      throw new Error(
        `Failed to fetch quote for ${stockCode}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Parse Tencent Finance API response for HK stocks
   * 
   * Response format: v_hk00700="350.00~351.50~..."
   */
  private parseResponse(responseText: string, ticker: string): MarketQuote {
    // Extract the data part from response like: v_hk00700="350.00~..."
    const match = responseText.match(/v_hk\d+="([^"]+)"/);
    
    if (!match || !match[1]) {
      console.error(`Failed to parse Tencent API response for ${ticker}. Response:`, responseText.substring(0, 500));
      throw new Error(`Failed to parse Tencent API response for ${ticker}`);
    }

    const dataString = match[1];
    const fields = dataString.split("~");

    console.log(`[Tencent HK API] Parsing ${ticker}: ${fields.length} fields`);
    console.log(`[Tencent HK API] Fields:`, fields.slice(0, 15).map((f, i) => `${i}:${f}`).join(", "));

    if (fields.length < 14) {
      console.error(`Insufficient fields for ${ticker}. Got ${fields.length}, expected at least 14`);
      throw new Error(`Insufficient data fields in response for ${ticker}. Got ${fields.length} fields.`);
    }

    // HK API field mapping (verified from actual API response):
    // Field 0: Market code (e.g., "100")
    // Field 1: Stock name (e.g., "心动公司")
    // Field 2: Stock code (e.g., "02400") - NOT price!
    // Field 3: Current price (e.g., "77.500")
    // Field 4: Previous close (e.g., "74.200")
    // Field 5: Open price (e.g., "75.500")
    // Field 6: Volume
    // Field 31: Change amount (e.g., "3.300")
    // Field 32: Change percent (e.g., "4.45")
    
    const name = fields[1] || ticker;
    const currentPrice = this.parseFloatSafe(fields[3] || "0");
    const previousClose = this.parseFloatSafe(fields[4] || "0");
    const volume = this.parseFloatSafe(fields[6] || "0");
    
    // Change fields from API
    let change = this.parseFloatSafe(fields[31] || "0");
    let changePercent = this.parseFloatSafe(fields[32] || "0");
    
    // Fallback: calculate from prices if API fields are empty
    if (change === 0 && currentPrice > 0 && previousClose > 0) {
      change = currentPrice - previousClose;
    }
    if (changePercent === 0 && change !== 0 && previousClose > 0) {
      changePercent = (change / previousClose) * 100;
    }
    
    const marketCap = fields[39] ? this.parseFloatSafe(fields[39]) : undefined;

    if (currentPrice === 0) {
      console.warn(`[Tencent HK API] Warning: Price is 0 for ${ticker}. Fields:`, {
        field3: fields[3],
        field4: fields[4],
        field31: fields[31],
        field32: fields[32],
      });
    }

    return {
      ticker,
      name: name.trim(),
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      marketCap,
      volume: volume > 0 ? volume : undefined,
      timestamp: new Date(),
      marketType: MarketType.HK,
      currency: "HKD",
      change1D: changePercent,
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
