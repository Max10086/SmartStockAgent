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

  // Default to US
  return "US";
}

/**
 * Get AI model configuration based on ticker symbol
 * 
 * Logic:
 * - CN/HK stocks -> DeepSeek or Qwen (OpenAI-compatible)
 * - US stocks -> Google Gemini
 * 
 * @param ticker - Stock ticker symbol
 * @returns Model configuration
 */
export function getModelForTicker(ticker: string): ModelConfig {
  const market = detectMarketFromTicker(ticker);

  if (market === "CN" || market === "HK") {
    // Prefer DeepSeek, fallback to Qwen if DeepSeek not available
    const deepSeekKey = process.env.DEEPSEEK_API_KEY;
    const qwenKey = process.env.QWEN_API_KEY;

    if (deepSeekKey) {
      return {
        model: AIModel.DeepSeek,
        modelName: process.env.DEEPSEEK_MODEL_NAME || "deepseek-chat",
        apiKey: deepSeekKey,
        baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      };
    }

    if (qwenKey) {
      return {
        model: AIModel.Qwen,
        modelName: process.env.QWEN_MODEL_NAME || "qwen-plus",
        apiKey: qwenKey,
        baseURL: process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
      };
    }

    throw new Error(
      `No API key found for CN/HK market. Please set DEEPSEEK_API_KEY or QWEN_API_KEY in .env.local`
    );
  }

  // US stocks use Gemini
  const googleKey = process.env.GOOGLE_API_KEY;
  if (!googleKey) {
    throw new Error(
      "GOOGLE_API_KEY is not set. Please add it to your .env.local file."
    );
  }

  return {
    model: AIModel.Gemini,
    modelName: process.env.GOOGLE_MODEL_NAME || "gemini-1.5-pro",
    apiKey: googleKey,
  };
}

/**
 * Get model name for display/logging
 */
export function getModelDisplayName(ticker: string): string {
  const config = getModelForTicker(ticker);
  return `${config.model} (${config.modelName})`;
}

