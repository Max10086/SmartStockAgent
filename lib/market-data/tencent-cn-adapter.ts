import * as iconv from "iconv-lite";
import { MarketDataAdapter } from "./adapter";
import { MarketQuote, MarketType } from "./types";
import { resolveTickerCode } from "./ticker-resolver";

/**
 * Tencent Finance API Adapter for A-Shares (CN Stocks)
 * 
 * Endpoint: 
 * - Shanghai: http://qt.gtimg.cn/q=sh{ticker} (6开头)
 * - Shenzhen: http://qt.gtimg.cn/q=sz{ticker} (0或3开头)
 * 
 * Response format: v_sh600000="10.50~10.60~..." or v_sz000001="..."
 * The response is encoded in GBK and needs to be decoded to UTF-8
 */
export class TencentCNAdapter implements MarketDataAdapter {
  private readonly baseUrl = "http://qt.gtimg.cn/q=";

  getMarketType(): MarketType {
    return MarketType.CN;
  }

  isValidTicker(ticker: string): boolean {
    // A-shares: 6 digits starting with 0, 3, or 6
    // 0开头: 深圳主板
    // 3开头: 深圳创业板
    // 6开头: 上海主板
    const normalized = ticker.trim();
    
    // Check if it's a 6-digit code
    if (/^[036]\d{5}$/.test(normalized)) {
      return true;
    }
    
    // Check if it contains Chinese characters (stock name)
    // We'll handle this by trying to fetch and see if it works
    if (/[\u4e00-\u9fa5]/.test(normalized)) {
      return true; // Allow Chinese names, will need to resolve to code
    }
    
    return false;
  }

  /**
   * Get exchange prefix (sh for Shanghai, sz for Shenzhen)
   */
  private getExchangePrefix(ticker: string): "sh" | "sz" {
    const normalized = ticker.trim();
    
    // Shanghai: 6开头
    if (normalized.startsWith("6")) {
      return "sh";
    }
    
    // Shenzhen: 0开头或3开头
    if (normalized.startsWith("0") || normalized.startsWith("3")) {
      return "sz";
    }
    
    // Default to Shanghai if unclear
    return "sh";
  }

  /**
   * Fetch quote data from Tencent Finance API
   */
  async getQuote(ticker: string): Promise<MarketQuote> {
    const normalizedTicker = ticker.trim();
    
    // Resolve Chinese name to stock code if needed
    let stockCode: string;
    if (/^[036]\d{5}$/.test(normalizedTicker)) {
      // It's already a valid code
      stockCode = normalizedTicker;
    } else if (/[\u4e00-\u9fa5]/.test(normalizedTicker)) {
      // It's a Chinese name - resolve to code using AI
      console.log(`[Tencent CN API] Resolving Chinese name "${normalizedTicker}" to stock code...`);
      try {
        stockCode = await resolveTickerCode(normalizedTicker, "CN");
        console.log(`[Tencent CN API] Resolved "${normalizedTicker}" to code: ${stockCode}`);
      } catch (error) {
        console.error(`[Tencent CN API] Failed to resolve "${normalizedTicker}":`, error);
        throw new Error(
          `无法找到股票代码 "${normalizedTicker}"。请直接输入6位数字股票代码（如 002460）。错误: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } else {
      throw new Error(`Invalid A-share ticker format: ${ticker}`);
    }

    // Determine exchange prefix based on code
    const exchangePrefix = this.getExchangePrefix(stockCode);
    const url = `${this.baseUrl}${exchangePrefix}${stockCode}`;

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

      console.log(`[Tencent CN API] Raw response for ${stockCode}:`, decodedText.substring(0, 300));

      // Parse the response
      return this.parseResponse(decodedText, stockCode, exchangePrefix);
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
   * Parse Tencent Finance API response for A-shares
   * 
   * Response format: v_sh600000="10.50~10.60~..." or v_sz000001="..."
   */
  private parseResponse(responseText: string, ticker: string, exchangePrefix: string): MarketQuote {
    // Extract the data part from response like: v_sh600000="10.50~..." or v_sz000001="..."
    const pattern = new RegExp(`v_${exchangePrefix}[^=]+="([^"]+)"`);
    const match = responseText.match(pattern);
    
    if (!match || !match[1]) {
      console.error(`Failed to parse Tencent API response for ${ticker}. Response:`, responseText.substring(0, 500));
      throw new Error(`Failed to parse Tencent API response for ${ticker}`);
    }

    const dataString = match[1];
    const fields = dataString.split("~");

    console.log(`[Tencent CN API] Parsing ${ticker}: ${fields.length} fields`);
    console.log(`[Tencent CN API] Fields:`, fields.slice(0, 15).map((f, i) => `${i}:${f}`).join(", "));

    if (fields.length < 14) {
      console.error(`Insufficient fields for ${ticker}. Got ${fields.length}, expected at least 14`);
      throw new Error(`Insufficient data fields in response for ${ticker}. Got ${fields.length} fields.`);
    }

    // Extract key fields
    // Field structure for A-shares (based on actual API response):
    // 0: Status code (e.g., "51")
    // 1: Stock name (GBK encoded, e.g., "赣锋锂业")
    // 2: Stock code (e.g., "002460") - DO NOT USE AS PRICE!
    // 3: Current price (最新价, e.g., "65.39")
    // 4: Previous close (昨收, e.g., "65.02")
    // 5: Open price (今开)
    // ... more fields ...
    // Looking at the actual response, change percent appears later in the fields
    // Need to find the correct field indices
    
    const name = fields[1] || ticker;
    
    // Current price is in field[3], NOT field[2] (field[2] is the stock code!)
    let currentPrice = this.parseFloatSafe(fields[3] || "0");
    
    // Previous close is in field[4]
    let previousClose = this.parseFloatSafe(fields[4] || "0");
    
    // CRITICAL VALIDATION: Check if currentPrice looks like a stock code
    // Stock codes are 6 digits (e.g., 002460), prices are usually < 1000 for A-shares
    // If field[3] was incorrectly parsed as the stock code, fix it
    const field3Value = fields[3] || "0";
    const field2Value = fields[2] || "0";
    
    // If currentPrice looks like a 6-digit stock code, we made an error
    if (currentPrice >= 1000 && /^\d{6}$/.test(String(Math.floor(currentPrice)))) {
      console.error(`[Tencent CN API] ERROR: Price (${currentPrice}) looks like stock code! Field[2]=${field2Value}, Field[3]=${field3Value}`);
      // Reset: field[3] should be price, field[2] is stock code
      currentPrice = this.parseFloatSafe(field3Value);
      previousClose = this.parseFloatSafe(fields[4] || "0");
    }
    
    // Try to find change percent in later fields (around index 30-32 based on actual response)
    // Response shows: "...~0.37~0.57~..." where 0.37 might be change amount, 0.57 is change percent
    let change = 0;
    let changePercent = 0;
    
    // Search for change percent (small number between -20 and +20)
    for (let i = 30; i < Math.min(fields.length, 35); i++) {
      const val = this.parseFloatSafe(fields[i] || "0");
      // Change percent is usually between -20 and +20 for daily changes
      if (Math.abs(val) > 0 && Math.abs(val) < 20 && val !== currentPrice && val !== previousClose) {
        // Check if previous field might be change amount
        if (i > 0) {
          const prevVal = this.parseFloatSafe(fields[i - 1] || "0");
          // If previous value is also small and could be change amount
          if (Math.abs(prevVal) < 100 && Math.abs(prevVal) > 0) {
            // Verify: change amount * 100 should be close to change percent * previousClose
            const expectedChangeFromPercent = (previousClose * val) / 100;
            if (Math.abs(prevVal - expectedChangeFromPercent) < 1) {
              change = prevVal;
              changePercent = val;
              break;
            }
          }
        }
        // If we found a small number that could be change percent
        if (Math.abs(val) < 15) {
          changePercent = val;
          if (previousClose > 0) {
            change = (previousClose * changePercent) / 100;
          }
          break;
        }
      }
    }
    
    // Fallback: Calculate from price difference (most reliable method)
    if (change === 0 && currentPrice > 0 && previousClose > 0) {
      change = currentPrice - previousClose;
      changePercent = (change / previousClose) * 100;
    }
    
    const volume = this.parseFloatSafe(fields[6] || fields[5] || "0");
    const marketCap = fields.length > 30 ? this.parseFloatSafe(fields[30] || "0") : undefined;

    // Final calculated values
    const calculatedChange = change;
    const calculatedChangePercent = changePercent;
    
    // Additional validation: Price should be reasonable for A-shares (usually < 500)
    if (currentPrice > 500 && currentPrice < 10000) {
      console.warn(`[Tencent CN API] Warning: Price (${currentPrice}) seems high for A-share ${ticker}.`);
    }
    
    if (currentPrice === 0) {
      console.error(`[Tencent CN API] ERROR: Price is 0 for ${ticker}. Fields:`, {
        field2: fields[2], // Stock code
        field3: fields[3], // Should be price
        field4: fields[4], // Previous close
      });
    }

    return {
      ticker,
      name: name.trim(),
      price: currentPrice,
      change: calculatedChange,
      changePercent: calculatedChangePercent,
      marketCap: marketCap && marketCap > 0 ? marketCap : undefined,
      volume: volume > 0 ? volume : undefined,
      timestamp: new Date(),
      marketType: MarketType.CN,
      currency: "CNY",
      // Note: Historical data (1W, 1M) would require additional API calls or historical data storage
      // For now, we only have current day data
      change1D: calculatedChangePercent, // Same as current changePercent (daily change)
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
