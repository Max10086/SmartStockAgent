import OpenAI from "openai";

import {
  AIModel,
  ModelConfig,
  GenerateTextResponse,
  TokenUsage,
  calculateCost,
} from "./types";
import { getModelForTicker } from "./router";

/**
 * Generate text using the appropriate AI model based on ticker
 */
/**
 * Generate text using the appropriate AI model based on ticker
 */
export async function generateTextWithModel(
  ticker: string,
  prompt: string,
  modelNameOverride?: string
): Promise<GenerateTextResponse> {
  const config = getModelForTicker(ticker);

  if (config.model === AIModel.Gemini) {
    return generateWithGemini(config, prompt, modelNameOverride);
  } else {
    // Qwen (OpenAI-compatible) - fallback only, primary is Gemini
    return generateWithOpenAICompatible(config, prompt);
  }
}

/**
 * Generate text using Google Gemini
 */
import { generateText } from "../google-ai";

/**
 * Generate text using Google Gemini
 */
async function generateWithGemini(
  config: ModelConfig,
  prompt: string,
  modelNameOverride?: string
): Promise<GenerateTextResponse> {
  const modelName = modelNameOverride || config.modelName;

  try {
    const result = await generateText(prompt, modelName);

    return {
      text: result.text,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        cost: calculateCost(result.usage.inputTokens, result.usage.outputTokens, AIModel.Gemini),
        model: AIModel.Gemini,
      },
    };
  } catch (error) {
    console.error("Error generating text with Gemini:", error);
    throw new Error(
      `Failed to generate text with Gemini: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate text using OpenAI-compatible API (Qwen only - fallback)
 * Note: DeepSeek is no longer used. All markets use Gemini as primary.
 */
async function generateWithOpenAICompatible(
  config: ModelConfig,
  prompt: string,
  retries: number = 3
): Promise<GenerateTextResponse> {
  // Create client with proper timeout configuration
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: 180000, // 180 seconds (3 minutes) timeout for Qwen
    maxRetries: 0, // We'll handle retries manually for better control
  });

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[${config.model}] Attempt ${attempt}/${retries} - Generating text (model: ${config.modelName})...`);
      
      // Create a promise with timeout wrapper
      const completionPromise = client.chat.completions.create({
        model: config.modelName,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
          max_tokens: 4000, // Explicitly set max_tokens for Qwen
        temperature: 0.7,
      });

      // Add timeout wrapper
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout after 180 seconds")), 180000);
      });

      const completion = await Promise.race([completionPromise, timeoutPromise]);

      const message = completion.choices[0]?.message?.content || "";
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;

      if (!message) {
        throw new Error("Empty response from API");
      }

      console.log(`[${config.model}] Success - Input tokens: ${inputTokens}, Output tokens: ${outputTokens}`);

      return {
        text: message,
        usage: {
          inputTokens,
          outputTokens,
          cost: calculateCost(
            inputTokens,
            outputTokens,
            config.model as AIModel.DeepSeek | AIModel.Qwen
          ),
          model: config.model as AIModel.DeepSeek | AIModel.Qwen,
        },
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message.toLowerCase();
      const errorString = String(error).toLowerCase();
      
      // Check if it's a retryable error (network/connection issues)
      const isRetryable = 
        errorMessage.includes("terminated") ||
        errorMessage.includes("socket") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("econnreset") ||
        errorMessage.includes("other side closed") ||
        errorMessage.includes("econnrefused") ||
        errorMessage.includes("enotfound") ||
        errorString.includes("und_err_socket") ||
        errorString.includes("und_err_") ||
        (error as any)?.code === "UND_ERR_SOCKET" ||
        (error as any)?.cause?.code === "UND_ERR_SOCKET";

      if (!isRetryable || attempt === retries) {
        // Not retryable or last attempt
        console.error(`[${config.model}] Error generating text (attempt ${attempt}/${retries}):`, lastError);
        throw new Error(
          `Failed to generate text with ${config.model}: ${lastError.message}`
        );
      }

      // Wait before retrying (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.warn(
        `[${config.model}] Retryable error (attempt ${attempt}/${retries}), retrying in ${waitTime}ms...`,
        lastError.message
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error(
    `Failed to generate text with ${config.model} after ${retries} attempts: ${
      lastError?.message || "Unknown error"
    }`
  );
}

