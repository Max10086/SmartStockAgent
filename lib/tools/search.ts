/**
 * Search result from web search
 */
export interface SearchResult {
  title: string;
  snippet: string; // Short snippet/summary
  content?: string; // Full content from Tavily (crucial for analysis)
  link: string;
  source?: string;
  answer?: string; // Tavily's AI-generated answer (if available)
}

/**
 * Search response
 */
export interface SearchResponse {
  results: SearchResult[];
  totalResults?: number;
}

/**
 * Search provider type
 */
type SearchProvider = "serper" | "tavily" | "vertex";

/**
 * Get search provider from environment or default based on available API keys
 */
function getSearchProvider(): SearchProvider {
  const rawProvider = process.env.SEARCH_PROVIDER;
  const provider = rawProvider?.toLowerCase()?.trim();
  const tavilyKey = process.env.TAVILY_API_KEY;
  const serperKey = process.env.SERPER_API_KEY;
  const gcpProjectId = process.env.GCP_PROJECT_ID;
  
  console.log(`[Search] Provider config: SEARCH_PROVIDER="${rawProvider}", normalized="${provider}"`);
  console.log(`[Search] GCP Project ID exists: ${!!gcpProjectId}`);
  console.log(`[Search] Tavily key exists: ${!!tavilyKey}, valid: ${tavilyKey && tavilyKey !== "your_tavily_api_key_here"}`);
  console.log(`[Search] Serper key exists: ${!!serperKey}, valid: ${serperKey && serperKey !== "your_serper_api_key_here"}`);
  
  // If provider is explicitly set and valid, use it (case-insensitive)
  if (provider === "vertex" || provider === "google" || provider === "grounding") {
    console.log(`[Search] Using Vertex (Google Grounding) (explicitly set)`);
    return "vertex";
  }
  
  if (provider === "tavily" || provider === "Tavily" || provider === "TAVILY") {
    console.log(`[Search] Using Tavily (explicitly set)`);
    return "tavily";
  }
  
  if (provider === "serper" || provider === "Serper" || provider === "SERPER") {
    console.log(`[Search] Using Serper (explicitly set)`);
    return "serper";
  }
  
  // Auto-detect based on available API keys
  // Prefer Vertex (Google Grounding) if GCP project is configured
  if (gcpProjectId && gcpProjectId !== "your_gcp_project_id") {
    console.log(`[Search] Using Vertex (auto-detected from GCP_PROJECT_ID)`);
    return "vertex";
  }
  
  if (tavilyKey && tavilyKey !== "your_tavily_api_key_here") {
    console.log(`[Search] Using Tavily (auto-detected from valid API key)`);
    return "tavily";
  }
  
  if (serperKey && serperKey !== "your_serper_api_key_here") {
    console.log(`[Search] Using Serper (auto-detected from valid API key)`);
    return "serper";
  }
  
  // Default to Tavily if neither is properly configured
  console.log(`[Search] Using Tavily (default fallback)`);
  return "tavily";
}

/**
 * Search the web using Serper.dev API
 */
async function searchWithSerper(query: string): Promise<SearchResponse> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey || apiKey === "your_serper_api_key_here") {
    throw new Error(
      "SERPER_API_KEY is not set or is using placeholder value. Please add a valid API key to your .env.local file."
    );
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: 10, // Number of results
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Serper API error (${response.status}):`, errorText);
      throw new Error(
        `Serper API error: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`
      );
    }

    const data = await response.json();

    const results: SearchResult[] = (data.organic || []).map((item: any) => ({
      title: item.title || "",
      snippet: item.snippet || "",
      link: item.link || "",
      source: item.source,
    }));

    return {
      results,
      totalResults: data.searchInformation?.totalResults
        ? parseInt(data.searchInformation.totalResults)
        : undefined,
    };
  } catch (error) {
    console.error("Error searching with Serper:", error);
    throw new Error(
      `Failed to search with Serper: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Search the web using Tavily API with advanced parameters
 * 
 * @param query - Search query string
 * @param maxResults - Maximum number of results to return (default: 5)
 * @returns Promise resolving to search results with full content
 */
export async function searchTavily(
  query: string,
  maxResults: number = 5
): Promise<SearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  console.log(`[Tavily] API key check: exists=${!!apiKey}, value=${apiKey ? apiKey.substring(0, 10) + "..." : "none"}`);
  
  if (!apiKey || apiKey === "your_tavily_api_key_here") {
    const errorMsg = "TAVILY_API_KEY is not set or is using placeholder value. Please add a valid API key to your .env.local file.";
    console.error(`[Tavily] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    console.log(`[Tavily] Searching: "${query}" (maxResults: ${maxResults})`);
    
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "advanced", // Use advanced depth for better context
        include_answer: true, // Include AI-generated answer
        include_raw_content: false, // Don't include raw HTML, just processed content
        max_results: maxResults,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Tavily API error (${response.status}):`, errorText);
      let errorMessage = `Tavily API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage += `. ${errorData.message}`;
        }
      } catch {
        errorMessage += `. ${errorText.substring(0, 200)}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    console.log(`[Tavily] Received ${data.results?.length || 0} results`);
    if (data.answer) {
      console.log(`[Tavily] AI Answer available: ${data.answer.substring(0, 100)}...`);
    }

    // Map Tavily results to our SearchResult format
    const results: SearchResult[] = (data.results || []).map((item: any) => ({
      title: item.title || "",
      snippet: item.content ? item.content.substring(0, 200) + "..." : "", // Short snippet
      content: item.content || "", // Full content for analysis
      link: item.url || "",
      source: item.url ? new URL(item.url).hostname : undefined,
    }));

    // Include AI answer if available
    const responseWithAnswer: SearchResponse = {
      results,
    };

    // Add answer as a special result if available
    if (data.answer) {
      responseWithAnswer.results.unshift({
        title: "AI Summary",
        snippet: data.answer.substring(0, 200) + "...",
        content: data.answer,
        link: "",
        answer: data.answer,
      });
    }

    return responseWithAnswer;
  } catch (error) {
    console.error("Error searching with Tavily:", error);
    throw new Error(
      `Failed to search with Tavily: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Search the web using Tavily API (legacy wrapper for backward compatibility)
 */
async function searchWithTavily(query: string): Promise<SearchResponse> {
  return searchTavily(query, 10);
}

/**
 * Search the web for information about a ticker
 * 
 * This function searches for:
 * - Earnings call transcripts
 * - Analyst opinions and reports
 * - Competitor information
 * - Recent news and developments
 * 
 * @param query - Search query (e.g., "AAPL earnings call transcript Q4 2024")
 * @returns Promise resolving to search results
 */
/**
 * Search the web for information
 * 
 * @param query - Search query string
 * @param maxResults - Maximum number of results (default: 10, ignored for Serper)
 * @returns Promise resolving to search results
 */
export async function searchWeb(
  query: string,
  maxResults: number = 10
): Promise<SearchResponse> {
  const provider = getSearchProvider();
  
  console.log(`[Search] searchWeb called with provider: ${provider}, maxResults: ${maxResults}`);

  if (provider === "vertex") {
    console.log(`[Search] Calling searchWithVertexGrounding for query: ${query.substring(0, 50)}...`);
    const { searchWithVertexGrounding } = await import("@/lib/ai/vertex-grounding");
    return searchWithVertexGrounding(query, maxResults);
  } else if (provider === "tavily") {
    console.log(`[Search] Calling searchTavily for query: ${query.substring(0, 50)}...`);
    return searchTavily(query, maxResults);
  } else {
    console.log(`[Search] Calling searchWithSerper for query: ${query.substring(0, 50)}...`);
    return searchWithSerper(query);
  }
}

/**
 * Search for ticker-specific information
 * Combines multiple search queries for comprehensive results
 */
export async function searchTickerInfo(
  ticker: string,
  market: "US" | "CN" | "HK" = "US"
): Promise<SearchResponse> {
  const queries = [
    `${ticker} earnings call transcript`,
    `${ticker} analyst report`,
    `${ticker} competitors`,
    `${ticker} recent news`,
  ];

  const allResults: SearchResult[] = [];
  const seenLinks = new Set<string>();

  for (const query of queries) {
    try {
      const response = await searchWeb(query);
      for (const result of response.results) {
        // Deduplicate by link
        if (!seenLinks.has(result.link)) {
          seenLinks.add(result.link);
          allResults.push(result);
        }
      }
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
      // Continue with other queries even if one fails
    }
  }

  return {
    results: allResults.slice(0, 20), // Limit to 20 results total
  };
}

