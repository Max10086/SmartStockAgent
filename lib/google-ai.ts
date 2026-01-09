import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Token usage information for a single API call
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Response from generateText function
 */
export interface GenerateTextResponse {
  text: string;
  usage: TokenUsage;
}

/**
 * Initialize Google Generative AI client
 */
function getGoogleAI(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY is not set. Please add it to your .env.local file."
    );
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * Get the model name from environment variable or use default
 */
function getModelName(): string {
  return process.env.GOOGLE_MODEL_NAME || "gemini-1.5-pro";
}

/**
 * Generate text using Google Gemini API with token usage tracking
 * 
 * @param prompt - The prompt to send to the model
 * @returns Promise resolving to text and token usage information
 */
export async function generateText(
  prompt: string
): Promise<GenerateTextResponse> {
  const genAI = getGoogleAI();
  const modelName = getModelName();
  const model = genAI.getGenerativeModel({ model: modelName });

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract token usage from the response
    const usageMetadata = result.response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;

    return {
      text,
      usage: {
        inputTokens,
        outputTokens,
      },
    };
  } catch (error) {
    console.error("Error generating text with Google AI:", error);
    throw new Error(
      `Failed to generate text: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate text with streaming support (for future use)
 * Note: Token usage tracking for streaming requires different handling
 */
export async function* generateTextStream(prompt: string) {
  const genAI = getGoogleAI();
  const modelName = getModelName();
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContentStream(prompt);
  
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    yield chunkText;
  }
}

