"use server";

import { researchWithGoogle } from "@/lib/ai/vertex-grounding";

/**
 * Test Vertex AI Grounding functionality
 * This is a server action for testing purposes
 */
export async function testVertexGrounding(query: string): Promise<{
  success: boolean;
  text?: string;
  sources?: { title: string; url: string }[];
  searchQueries?: string[];
  error?: string;
}> {
  if (!query || query.trim().length === 0) {
    return {
      success: false,
      error: "Query is required",
    };
  }

  try {
    console.log(`[Test Vertex] Testing grounding with query: ${query}`);
    
    const response = await researchWithGoogle(query);
    
    console.log(`[Test Vertex] Response received, text length: ${response.text.length}`);
    console.log(`[Test Vertex] Sources found: ${response.groundingMetadata?.sources?.length || 0}`);
    
    return {
      success: true,
      text: response.text,
      sources: response.groundingMetadata?.sources,
      searchQueries: response.groundingMetadata?.searchQueries,
    };
  } catch (error) {
    console.error("[Test Vertex] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
