/**
 * Vertex AI with Google Search Grounding
 * 
 * This module provides search capabilities using Google Cloud Vertex AI's
 * native grounding with Google Search feature.
 */

import { VertexAI } from '@google-cloud/vertexai';

/**
 * Source citation from grounding metadata
 */
export interface GroundingSource {
  title: string;
  url: string;
}

/**
 * Grounding metadata from Vertex AI response
 */
export interface GroundingMetadata {
  sources: GroundingSource[];
  searchQueries?: string[];
}

/**
 * Response from grounded research
 */
export interface GroundedResponse {
  text: string;
  groundingMetadata?: GroundingMetadata;
}

/**
 * Get Vertex AI client
 */
function getVertexAI(): VertexAI {
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION || 'us-central1';

  if (!projectId) {
    throw new Error(
      'GCP_PROJECT_ID is not set. Please add it to your .env.local file.'
    );
  }

  return new VertexAI({
    project: projectId,
    location: location,
  });
}

/**
 * Get the model name for Vertex AI
 */
function getModelName(): string {
  return process.env.GOOGLE_MODEL_NAME || 'gemini-2.5-pro';
}

/**
 * Research a topic using Google Search grounding
 * 
 * This function uses Vertex AI with the Google Search Retrieval tool
 * to generate grounded responses with citations.
 * 
 * @param prompt - The research prompt/question
 * @returns Promise resolving to grounded response with sources
 */
export async function researchWithGoogle(prompt: string): Promise<GroundedResponse> {
  const vertexAI = getVertexAI();
  const modelName = getModelName();

  console.log(`[Vertex Grounding] Researching with model: ${modelName}`);
  console.log(`[Vertex Grounding] Prompt: ${prompt.substring(0, 100)}...`);

  try {
    // Get generative model with Google Search grounding enabled
    // Note: googleSearch is for Gemini 2.0+, googleSearchRetrieval is for Gemini 1.5
    // The SDK types may not include googleSearch yet, so we use type assertion
    const model = vertexAI.preview.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1, // Low temperature for factual research
        maxOutputTokens: 4096,
      },
      // Enable Google Search tool for grounding (Gemini 2.0+)
      tools: [{
        googleSearch: {}
      } as any],
    });

    const result = await model.generateContent(prompt);
    const response = result.response;

    // Extract text from response
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract grounding metadata (sources/citations)
    const groundingMetadataRaw = response.candidates?.[0]?.groundingMetadata;
    let groundingMetadata: GroundingMetadata | undefined;

    if (groundingMetadataRaw) {
      console.log('[Vertex Grounding] Grounding metadata found');
      
      const sources: GroundingSource[] = [];
      const searchQueries: string[] = [];

      // Extract web search queries if available
      if (groundingMetadataRaw.webSearchQueries) {
        searchQueries.push(...groundingMetadataRaw.webSearchQueries);
      }

      // Extract grounding chunks (citations)
      if (groundingMetadataRaw.groundingChunks) {
        for (const chunk of groundingMetadataRaw.groundingChunks) {
          if (chunk.web) {
            sources.push({
              title: chunk.web.title || 'Unknown Source',
              url: chunk.web.uri || '',
            });
          }
        }
      }

      // Also check supportedLinks if available
      if (groundingMetadataRaw.groundingSupports) {
        for (const support of groundingMetadataRaw.groundingSupports) {
          if (support.groundingChunkIndices) {
            // These reference the groundingChunks array
            // We've already extracted those above
          }
        }
      }

      if (sources.length > 0 || searchQueries.length > 0) {
        groundingMetadata = {
          sources,
          searchQueries: searchQueries.length > 0 ? searchQueries : undefined,
        };
      }

      console.log(`[Vertex Grounding] Found ${sources.length} sources, ${searchQueries.length} search queries`);
    }

    console.log(`[Vertex Grounding] Response length: ${text.length} characters`);

    return {
      text,
      groundingMetadata,
    };
  } catch (error) {
    console.error('[Vertex Grounding] Error:', error);
    throw new Error(
      `Failed to research with Google Grounding: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Search using Vertex AI grounding and return in SearchResponse format
 * This is a wrapper for compatibility with the existing search interface
 * 
 * @param query - Search query string
 * @param maxResults - Maximum number of sources to return (default: 10)
 * @returns Promise resolving to search response with results
 */
export async function searchWithVertexGrounding(
  query: string,
  maxResults: number = 10
): Promise<{
  results: Array<{
    title: string;
    snippet: string;
    content?: string;
    link: string;
    source?: string;
    answer?: string;
  }>;
  totalResults?: number;
}> {
  // Craft a research prompt that will trigger grounding
  const researchPrompt = `Research and provide comprehensive, factual information about: ${query}

Please include specific facts, numbers, dates, and details. Cite your sources.`;

  const response = await researchWithGoogle(researchPrompt);

  const results: Array<{
    title: string;
    snippet: string;
    content?: string;
    link: string;
    source?: string;
    answer?: string;
  }> = [];

  // Add AI answer as first result
  if (response.text) {
    results.push({
      title: 'AI Summary (Google Grounding)',
      snippet: response.text.substring(0, 200) + '...',
      content: response.text,
      link: '',
      answer: response.text,
    });
  }

  // Add grounding sources as results
  if (response.groundingMetadata?.sources) {
    for (const source of response.groundingMetadata.sources.slice(0, maxResults - 1)) {
      results.push({
        title: source.title,
        snippet: '', // Vertex AI doesn't provide snippets for sources
        link: source.url,
        source: source.url ? new URL(source.url).hostname : undefined,
      });
    }
  }

  return {
    results,
    totalResults: results.length,
  };
}
