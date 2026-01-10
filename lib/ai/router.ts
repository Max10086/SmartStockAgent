import { AIModel, ModelConfig } from "./types";

/**
 * Detect market type from ticker symbol
 */
function detectMarketFromTicker(ticker: string): "US" | "CN" | "HK" {
  const normalized = ticker.trim().toUpperCase();

  // HK stocks: ends with .HK or 5 digits
  if (normalized.endsWith(".HK") || /^\d{5}$/.test(normalized)) {
    return "HK";
  }

  // CN stocks: 6 digits starting with 0, 3, or 6
  if (/^[036]\d{5}$/.test(normalized)) {
    return "CN";
  }

  // Check if it contains Chinese characters
  // Chinese names are likely CN or HK stocks (default to CN)
  if (/[\u4e00-\u9fa5]/.test(ticker)) {
    return "CN"; // Default to CN for Chinese names
  }

  // Default to US
  return "US";
}

/**
 * Get AI model configuration based on ticker symbol
 * 
 * Logic:
 * - All markets (US/CN/HK) -> Google Gemini (primary)
 * - Qwen as fallback only if Gemini is not available
 * - DeepSeek is no longer used
 * 
 * @param ticker - Stock ticker symbol
 * @returns Model configuration
 */
export function getModelForTicker(ticker: string): ModelConfig {
  // Primary: Use Google Gemini for all markets
  const googleKey = process.env.GOOGLE_API_KEY;
  if (googleKey) {
    return {
      model: AIModel.Gemini,
      modelName: process.env.GOOGLE_MODEL_NAME || "gemini-1.5-pro",
      apiKey: googleKey,
    };
  }

  // Fallback: Use Qwen if Gemini is not available (for CN/HK markets only)
  const market = detectMarketFromTicker(ticker);
  if (market === "CN" || market === "HK") {
    const qwenKey = process.env.QWEN_API_KEY;
    if (qwenKey) {
      console.warn("Google Gemini API key not found, falling back to Qwen for CN/HK market");
      return {
        model: AIModel.Qwen,
        modelName: process.env.QWEN_MODEL_NAME || "qwen-plus",
        apiKey: qwenKey,
        baseURL: process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
      };
    }
  }

  // No API key available
  throw new Error(
    "GOOGLE_API_KEY is not set. Please add it to your .env.local file. " +
    (market === "CN" || market === "HK" 
      ? "Alternatively, you can set QWEN_API_KEY as a fallback for CN/HK markets."
      : "")
  );
}

/**
 * Get model name for display/logging
 */
export function getModelDisplayName(ticker: string): string {
  const config = getModelForTicker(ticker);
  return `${config.model} (${config.modelName})`;
}

