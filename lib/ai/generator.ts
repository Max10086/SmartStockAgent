import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
export async function generateTextWithModel(
  ticker: string,
  prompt: string
): Promise<GenerateTextResponse> {
  const config = getModelForTicker(ticker);

  if (config.model === AIModel.Gemini) {
    return generateWithGemini(config, prompt);
  } else {
    // DeepSeek or Qwen (OpenAI-compatible)
    return generateWithOpenAICompatible(config, prompt);
  }
}

/**
 * Generate text using Google Gemini
 */
async function generateWithGemini(
  config: ModelConfig,
  prompt: string
): Promise<GenerateTextResponse> {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const model = genAI.getGenerativeModel({ model: config.modelName });

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const usageMetadata = result.response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;

    return {
      text,
      usage: {
        inputTokens,
        outputTokens,
        cost: calculateCost(inputTokens, outputTokens, AIModel.Gemini),
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
 * Generate text using OpenAI-compatible API (DeepSeek/Qwen)
 */
async function generateWithOpenAICompatible(
  config: ModelConfig,
  prompt: string
): Promise<GenerateTextResponse> {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  try {
    const completion = await client.chat.completions.create({
      model: config.modelName,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const message = completion.choices[0]?.message?.content || "";
    const inputTokens = completion.usage?.prompt_tokens || 0;
    const outputTokens = completion.usage?.completion_tokens || 0;

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
    console.error(`Error generating text with ${config.model}:`, error);
    throw new Error(
      `Failed to generate text with ${config.model}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

