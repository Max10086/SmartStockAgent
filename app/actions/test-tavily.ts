"use server";

import { searchTavily } from "@/lib/tools/search";

/**
 * Test Tavily search integration
 * This is a test server action to validate Tavily API connectivity
 */
export async function testTavilySearch(query: string = "Apple Inc AAPL stock price") {
  try {
    console.log(`[Test] Testing Tavily search with query: "${query}"`);
    
    const result = await searchTavily(query, 3);
    
    return {
      success: true,
      query,
      resultCount: result.results.length,
      results: result.results.map((r) => ({
        title: r.title,
        snippet: r.snippet?.substring(0, 150),
        hasContent: !!r.content,
        contentLength: r.content?.length || 0,
        link: r.link,
        hasAnswer: !!r.answer,
      })),
      rawResult: result,
    };
  } catch (error) {
    console.error("[Test] Tavily search failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      query,
    };
  }
}

