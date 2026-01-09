"use server";

import { generateTextWithModel } from "@/lib/ai";
import { getAdapterForTicker } from "@/lib/market-data";
import { searchWeb } from "@/lib/tools";
import {
  StrategistPlanSchema,
  DeepDiveReportSchema,
  type StrategistPlan,
  type DeepDiveReport,
  type MissionSearchResult,
  type StreamLog,
} from "@/lib/research/workflow-types";
import { TokenUsage as AITokenUsage } from "@/lib/ai/types";

/**
 * Simple log collector for streaming logs
 * Collects logs in an array that can be serialized and passed to client
 */
interface LogCollector {
  logs: StreamLog[];
  add(log: StreamLog): void;
}

function createLogCollector(): LogCollector {
  const logs: StreamLog[] = [];
  return {
    logs,
    add(log: StreamLog) {
      logs.push(log);
    },
  };
}

/**
 * Stage 1: The Strategist - Plan Generation
 * Identifies sector, peer group, and generates 4 research missions
 */
async function stage1Strategist(
  ticker: string,
  collector: LogCollector
): Promise<{ plan: StrategistPlan; usage: AITokenUsage }> {
  const prompt = `You are a senior investment strategist. Analyze the stock ticker "${ticker}" and create a comprehensive research plan.

Your task:
1. Identify the INDUSTRY SECTOR (e.g., "Semiconductors", "Electric Vehicles", "Critical Metals")
2. Identify the PEER GROUP (list 3-5 competitor tickers or company names)
3. Generate exactly 4 specific RESEARCH MISSIONS

Each mission should be actionable and focused. Example missions:
- "Identify top 3 direct competitors and compare their Gross Margins"
- "Find recent earnings call summaries to understand the 'Story'"
- "Analyze the upstream resource constraints"
- "Compare market positioning and competitive advantages"

Return ONLY a JSON object with this EXACT structure:
{
  "sector": "Industry sector name",
  "peerGroup": ["TICKER1", "TICKER2", "TICKER3"],
  "missions": [
    {
      "title": "Mission 1 title",
      "description": "Detailed description of what to research",
      "searchQueries": ["query 1", "query 2", "query 3"]
    },
    {
      "title": "Mission 2 title",
      "description": "Detailed description",
      "searchQueries": ["query 1", "query 2"]
    },
    {
      "title": "Mission 3 title",
      "description": "Detailed description",
      "searchQueries": ["query 1", "query 2"]
    },
    {
      "title": "Mission 4 title",
      "description": "Detailed description",
      "searchQueries": ["query 1", "query 2"]
    }
  ]
}

Do not include any other text, markdown, or explanation. Return only valid JSON.`;

  collector.add({
    type: "strategist_plan",
    message: `Analyzing ${ticker} and generating research plan...`,
    timestamp: new Date(),
  });

  const response = await generateTextWithModel(ticker, prompt);

  // Parse and validate plan
  let plan: StrategistPlan;
  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    plan = StrategistPlanSchema.parse(parsed);
  } catch (error) {
    console.error("Error parsing strategist plan:", error);
    // Fallback plan
    plan = {
      sector: "Unknown",
      peerGroup: [],
      missions: [
        {
          title: "Competitive Analysis",
          description: `Analyze ${ticker}'s competitive position`,
          searchQueries: [`${ticker} competitors`, `${ticker} market share`],
        },
        {
          title: "Financial Health",
          description: `Assess ${ticker}'s financial metrics`,
          searchQueries: [`${ticker} earnings`, `${ticker} cash flow`],
        },
        {
          title: "Recent Developments",
          description: `Find recent news and developments for ${ticker}`,
          searchQueries: [`${ticker} news`, `${ticker} recent events`],
        },
        {
          title: "Industry Trends",
          description: `Analyze industry trends affecting ${ticker}`,
          searchQueries: [`${ticker} industry trends`, `${ticker} sector analysis`],
        },
      ],
    };
  }

  collector.add({
    type: "strategist_plan",
    message: `Research plan generated: ${plan.sector} sector, ${plan.missions.length} missions`,
    data: plan,
    timestamp: new Date(),
  });

  return {
    plan,
    usage: response.usage,
  };
}

/**
 * Stage 2: The Investigator - Parallel Mission Execution
 * Executes search queries for each mission and collects results
 */
async function stage2Investigator(
  ticker: string,
  plan: StrategistPlan,
  collector: LogCollector
): Promise<{ results: MissionSearchResult[]; usage: AITokenUsage }> {
  const allResults: MissionSearchResult[] = [];
  let totalUsage: AITokenUsage = { 
    inputTokens: 0, 
    outputTokens: 0, 
    cost: 0, 
    model: "gemini" as any 
  };

  // Execute missions in parallel
  const missionPromises = plan.missions.map(async (mission, index) => {
    const missionId = `mission-${index + 1}`;

    collector.add({
      type: "mission_start",
      message: `Starting Mission ${index + 1}: ${mission.title}`,
      data: { missionId, title: mission.title },
      timestamp: new Date(),
    });

    // Generate specific search queries using AI
    const queryPrompt = `Given this research mission: "${mission.title} - ${mission.description}"

For the stock ticker "${ticker}", generate 2-3 highly specific Google search queries that will help complete this mission.

Return ONLY a JSON array of search query strings:
["query 1", "query 2", "query 3"]

Make queries specific and actionable. Do not include any other text.`;

    let searchQueries = mission.searchQueries;
    try {
      const queryResponse = await generateTextWithModel(ticker, queryPrompt);
      totalUsage.inputTokens += queryResponse.usage.inputTokens;
      totalUsage.outputTokens += queryResponse.usage.outputTokens;
      totalUsage.cost = (totalUsage.cost || 0) + (queryResponse.usage.cost || 0);
      totalUsage.model = queryResponse.usage.model;

      const jsonMatch = queryResponse.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          searchQueries = parsed;
        }
      }
    } catch (error) {
      console.error(`Error generating queries for mission ${missionId}:`, error);
      // Use default queries from plan
    }

    // Execute searches for each query
    const missionResults: MissionSearchResult = {
      missionId,
      missionTitle: mission.title,
      query: searchQueries.join("; "),
      results: [],
    };

    for (const query of searchQueries) {
      collector.add({
        type: "search_query",
        message: `Searching: ${query}`,
        data: { missionId, query },
        timestamp: new Date(),
      });

      try {
        const searchResponse = await searchWeb(query);
        const topResults = searchResponse.results.slice(0, 3); // Top 3 results per query

        missionResults.results.push(...topResults);

        collector.add({
          type: "search_results",
          message: `Found ${topResults.length} results for: ${query}`,
          data: {
            missionId,
            query,
            results: topResults.map((r) => ({
              title: r.title,
              snippet: r.snippet.substring(0, 100) + "...",
            })),
          },
          timestamp: new Date(),
        });
      } catch (error) {
        console.error(`Error searching for "${query}":`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        collector.add({
          type: "search_results",
          message: `Search failed for: ${query}. Error: ${errorMessage.substring(0, 100)}`,
          data: { 
            missionId, 
            query, 
            error: true,
            errorMessage: errorMessage.substring(0, 200)
          },
          timestamp: new Date(),
        });
      }
    }

    return missionResults;
  });

  const missionResults = await Promise.all(missionPromises);
  allResults.push(...missionResults);

  return {
    results: allResults,
    usage: totalUsage,
  };
}

/**
 * Stage 3: The Analyst - Synthesis
 * Combines all search results and market data into structured analysis
 */
async function stage3Analyst(
  ticker: string,
  plan: StrategistPlan,
  searchResults: MissionSearchResult[],
  marketData: any,
  collector: LogCollector
): Promise<{ report: DeepDiveReport; usage: AITokenUsage }> {
  collector.add({
    type: "analysis_progress",
    message: "Synthesizing all research data into comprehensive analysis...",
    timestamp: new Date(),
  });

  // Compile all search results into context
  const searchContext = searchResults
    .map(
      (mission) => `
MISSION: ${mission.missionTitle}
QUERIES: ${mission.query}
RESULTS:
${mission.results
  .map(
    (r, i) => `
${i + 1}. ${r.title}
   ${r.snippet}
   Source: ${r.link}
`
  )
  .join("\n")}
`
    )
    .join("\n---\n");

  const prompt = `You are a brutally honest investment analyst. Based on comprehensive research, provide a deep-dive analysis.

STOCK TICKER: ${ticker}
SECTOR: ${plan.sector}
PEER GROUP: ${plan.peerGroup.join(", ")}

MARKET DATA:
- Current Price: $${marketData.price.toFixed(2)}
- Change: ${marketData.change >= 0 ? "+" : ""}${marketData.change.toFixed(2)} (${marketData.changePercent >= 0 ? "+" : ""}${marketData.changePercent.toFixed(2)}%)
- Market Cap: ${marketData.marketCap ? `$${marketData.marketCap.toLocaleString()}` : "N/A"}
- Volume: ${marketData.volume ? marketData.volume.toLocaleString() : "N/A"}

RESEARCH RESULTS:
${searchContext}

Based on this comprehensive research, provide a brutally honest analysis.

Return ONLY a JSON object with this EXACT structure:
{
  "narrative_arc": "What is the hype? (Policy? Tech? Market narrative?) - Be specific",
  "competitor_matrix": [
    {
      "name": "Competitor name",
      "market_cap": "Market cap if available",
      "core_difference": "Key difference vs ${ticker}",
      "resource_quality": "Resource quality assessment if applicable"
    }
  ],
  "financial_reality": {
    "cash_burn_rate": "Cash burn rate analysis",
    "capex_cycle": "Capital expenditure cycle assessment",
    "revenue_trend": "Revenue trend analysis"
  },
  "marginal_changes": "What changed in the last 3 months? Be specific with dates/events",
  "verdict": "The brutal truth - honest, direct investment verdict"
}

Requirements:
- Be brutally honest and direct
- Use specific facts from the research
- competitor_matrix should have at least 2-3 competitors
- All fields must be filled
- Return ONLY the JSON object, no markdown, no explanations`;

  const response = await generateTextWithModel(ticker, prompt);

  // Parse and validate report
  let report: DeepDiveReport;
  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    report = DeepDiveReportSchema.parse(parsed);
  } catch (error) {
    console.error("Error parsing analyst report:", error);
    // Fallback report
    report = {
      narrative_arc: `Analysis for ${ticker} based on available research data.`,
      competitor_matrix: [],
      financial_reality: {
        cash_burn_rate: "Requires deeper analysis",
        capex_cycle: "Requires deeper analysis",
        revenue_trend: "Requires deeper analysis",
      },
      marginal_changes: "Recent developments require further investigation",
      verdict: `Analysis for ${ticker}: Current price $${marketData.price.toFixed(2)}. Requires comprehensive fundamental analysis.`,
    };
  }

  collector.add({
    type: "final_report",
    message: "Analysis complete",
    data: report,
    timestamp: new Date(),
  });

  return {
    report,
    usage: response.usage,
  };
}

/**
 * Deep Research Workflow - Modular Agentic Logic
 * 
 * Stage 1: Strategist - Generate research plan
 * Stage 2: Investigator - Execute missions in parallel
 * Stage 3: Analyst - Synthesize comprehensive report
 */
export async function runDeepResearch(
  ticker: string
): Promise<{
  status: "completed" | "error";
  report: DeepDiveReport;
  totalTokens: number;
  logs: StreamLog[];
  error?: string;
}> {
  const collector = createLogCollector();
  
  collector.add({
    type: "strategist_plan",
    message: `Starting deep research for ${ticker}...`,
    timestamp: new Date(),
  });

  let totalUsage: AITokenUsage = { inputTokens: 0, outputTokens: 0, cost: 0, model: "gemini" as any };

  try {
    // Stage 1: Strategist
    const { plan, usage: usage1 } = await stage1Strategist(ticker, collector);
    totalUsage.inputTokens += usage1.inputTokens;
    totalUsage.outputTokens += usage1.outputTokens;
    totalUsage.cost = (totalUsage.cost || 0) + (usage1.cost || 0);
    totalUsage.model = usage1.model;

    // Fetch market data
    const adapter = getAdapterForTicker(ticker);
    const marketData = await adapter.getQuote(ticker);

    // Stage 2: Investigator
    const { results: searchResults, usage: usage2 } = await stage2Investigator(
      ticker,
      plan,
      collector
    );
    totalUsage.inputTokens += usage2.inputTokens;
    totalUsage.outputTokens += usage2.outputTokens;
    totalUsage.cost = (totalUsage.cost || 0) + (usage2.cost || 0);
    totalUsage.model = usage2.model;

    // Stage 3: Analyst
    const { report, usage: usage3 } = await stage3Analyst(
      ticker,
      plan,
      searchResults,
      marketData,
      collector
    );
    totalUsage.inputTokens += usage3.inputTokens;
    totalUsage.outputTokens += usage3.outputTokens;
    totalUsage.cost = (totalUsage.cost || 0) + (usage3.cost || 0);
    totalUsage.model = usage3.model;

    return {
      status: "completed",
      report,
      totalTokens: totalUsage.inputTokens + totalUsage.outputTokens,
      logs: collector.logs,
    };
  } catch (error) {
    console.error("Error in runDeepResearch:", error);
    collector.add({
      type: "analysis_progress",
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      timestamp: new Date(),
    });

    return {
      status: "error",
      report: {
        narrative_arc: `Error analyzing ${ticker}`,
        competitor_matrix: [],
        financial_reality: {
          cash_burn_rate: "",
          capex_cycle: "",
          revenue_trend: "",
        },
        marginal_changes: "",
        verdict: `Failed to complete analysis for ${ticker}`,
      },
      totalTokens: totalUsage.inputTokens + totalUsage.outputTokens,
      logs: collector.logs,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

