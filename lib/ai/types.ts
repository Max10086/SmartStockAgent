/**
 * Supported AI models
 */
export enum AIModel {
  Gemini = "gemini",
  DeepSeek = "deepseek",
  Qwen = "qwen",
}

/**
 * Model provider configuration
 */
export interface ModelConfig {
  model: AIModel;
  modelName: string;
  apiKey: string;
  baseURL?: string; // For OpenAI-compatible APIs
}

/**
 * Token usage with cost tracking
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cost?: number; // Cost in USD
  model: AIModel;
}

/**
 * Response from AI generation
 */
export interface GenerateTextResponse {
  text: string;
  usage: TokenUsage;
}

/**
 * Model pricing per 1M tokens (input/output)
 */
export const MODEL_PRICING: Record<
  AIModel,
  { input: number; output: number }
> = {
  [AIModel.Gemini]: {
    input: 1.25, // $1.25 per 1M input tokens (gemini-1.5-pro)
    output: 5.0, // $5.00 per 1M output tokens
  },
  [AIModel.DeepSeek]: {
    input: 0.14, // $0.14 per 1M input tokens (DeepSeek-V2)
    output: 0.28, // $0.28 per 1M output tokens
  },
  [AIModel.Qwen]: {
    input: 0.14, // $0.14 per 1M input tokens (Qwen2.5)
    output: 0.28, // $0.28 per 1M output tokens
  },
};

/**
 * Calculate cost from token usage
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: AIModel
): number {
  const pricing = MODEL_PRICING[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

