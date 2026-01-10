import { generateTextWithModel } from "@/lib/ai/generator";

/**
 * Resolve Chinese stock name to stock code
 * Uses AI to convert Chinese stock names to their corresponding stock codes
 */
export async function resolveChineseTickerToCode(
  chineseName: string,
  market: "CN" | "HK"
): Promise<string> {
  // Try to use AI to resolve the stock code
  const prompt = `你是一个股票代码解析专家。请将以下${market === "CN" ? "A股" : "港股"}股票名称转换为对应的股票代码。

股票名称: ${chineseName}

要求:
1. 只返回股票代码（${market === "CN" ? "6位数字，以0、3或6开头" : "5位数字"}）
2. 不要返回任何其他文字、标点符号或解释
3. 如果无法确定，返回 "UNKNOWN"

示例:
${market === "CN" 
  ? '- 输入: "贵州茅台" -> 输出: "600519"\n- 输入: "赣锋锂业" -> 输出: "002460"\n- 输入: "宁德时代" -> 输出: "300750"'
  : '- 输入: "腾讯控股" -> 输出: "00700"\n- 输入: "阿里巴巴" -> 输出: "09988"\n- 输入: "美团" -> 输出: "03690"'
}

请直接返回股票代码（仅数字，不要任何其他字符）:`;

  try {
    // Use a temporary ticker to ensure we use the right AI model
    // Now all markets use Gemini, but we still need a valid ticker format
    const tempTicker = market === "CN" ? "000001" : market === "HK" ? "00700" : "AAPL";
    const response = await generateTextWithModel(tempTicker, prompt);
    
    // Extract only digits from the response
    let code = response.text.trim();
    // Remove any non-digit characters
    code = code.replace(/[^\d]/g, "");
    
    console.log(`[Ticker Resolver] AI response for "${chineseName}": "${response.text.trim()}" -> extracted code: "${code}"`);
    
    // Validate the code format
    if (market === "CN") {
      if (/^[036]\d{5}$/.test(code)) {
        return code;
      }
      throw new Error(`Invalid A-share code format: ${code}. Expected 6 digits starting with 0, 3, or 6.`);
    } else if (market === "HK") {
      if (/^\d{5}$/.test(code)) {
        return code;
      }
      throw new Error(`Invalid HK stock code format: ${code}. Expected 5 digits.`);
    }
    
    throw new Error(`Invalid code format returned: ${code}`);
  } catch (error) {
    console.error(`Failed to resolve Chinese ticker "${chineseName}" to code:`, error);
    
    // Provide helpful error message
    const codeFormat = market === "CN" ? "6位数字（如 002460）" : "5位数字（如 00700）";
    throw new Error(
      `无法将股票名称 "${chineseName}" 转换为股票代码。请直接输入${codeFormat}。错误详情: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Common stock name to code mapping (fallback)
 * This is a small cache for frequently searched stocks
 */
const STOCK_NAME_MAP: Record<string, string> = {
  // A股常见股票
  赣锋锂业: "002460",
  贵州茅台: "600519",
  五粮液: "000858",
  比亚迪: "002594",
  宁德时代: "300750",
  中国平安: "601318",
  招商银行: "600036",
  工商银行: "601398",
  建设银行: "601939",
  中国银行: "601988",
  
  // 港股常见股票
  腾讯控股: "00700",
  阿里巴巴: "09988",
  美团: "03690",
  小米集团: "01810",
  京东集团: "09618",
};

/**
 * Try to resolve stock code from name using cache first, then AI
 */
export async function resolveTickerCode(
  nameOrCode: string,
  market: "CN" | "HK"
): Promise<string> {
  // If it's already a valid code, return it
  if (market === "CN" && /^[036]\d{5}$/.test(nameOrCode)) {
    return nameOrCode;
  }
  if (market === "HK" && /^\d{5}$/.test(nameOrCode)) {
    return nameOrCode.replace(/\.HK$/, "");
  }
  
  // Check cache first
  if (STOCK_NAME_MAP[nameOrCode]) {
    return STOCK_NAME_MAP[nameOrCode];
  }
  
  // Use AI to resolve
  return resolveChineseTickerToCode(nameOrCode, market);
}
