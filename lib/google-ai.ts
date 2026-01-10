import { VertexAI, GenerateContentResult } from "@google-cloud/vertexai";

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
 * Initialize Google Vertex AI client
 */
function getVertexAI(): VertexAI {
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION || "us-central1";
  
  if (!projectId) {
    throw new Error(
      "GCP_PROJECT_ID is not set. Please add it to your .env.local file."
    );
  }

  return new VertexAI({ project: projectId, location });
}

/**
 * Get the model name from environment variable or use default
 */
function getModelName(): string {
  // Enforce gemini-2.5-pro as requested
  return process.env.GOOGLE_MODEL_NAME || "gemini-2.5-pro";
}

/**
 * Generate text using Google Vertex AI with token usage tracking
 * 
 * @param prompt - The prompt to send to the model
 * @param modelName - Optional model name override
 * @returns Promise resolving to text and token usage information
 */
export async function generateText(
  prompt: string,
  modelName?: string
): Promise<GenerateTextResponse> {
  const vertex_ai = getVertexAI();
  const activeModelName = modelName || getModelName();
  
  const model = vertex_ai.getGenerativeModel({ 
    model: activeModelName,
    // Ensure googleSearch is configured as requested
    tools: [
      {
        googleSearch: {}
      } as any // Cast as any if type definition is missing in SDK
    ]
  });

  try {
    const result: GenerateContentResult = await model.generateContent(prompt);
    const response = await result.response;
    
    // Extract text from candidates
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract token usage
    const usageMetadata = response.usageMetadata;
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
    console.error("Error generating text with Vertex AI:", error);
    throw new Error(
      `Failed to generate text with Vertex AI: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generate text with streaming support
 */
export async function* generateTextStream(prompt: string) {
  const vertex_ai = getVertexAI();
  const modelName = getModelName();
  const model = vertex_ai.getGenerativeModel({ 
    model: modelName,
    tools: [
      {
        googleSearch: {}
      } as any
    ]
  });

  const result = await model.generateContentStream(prompt);
  
  for await (const chunk of result.stream) {
    const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (chunkText) {
      yield chunkText;
    }
  }
}
