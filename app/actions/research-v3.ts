

import { generateTextWithModel } from "@/lib/ai";
import { getAdapterForTicker } from "@/lib/market-data";
import { searchWeb } from "@/lib/tools";
import { saveReport } from "@/lib/db/report-service";
import { Language, getLanguageSystemPrompt } from "@/lib/i18n";
import {
  ResearchNode,
  TopicChain,
  ResearchInvestigation,
  NodeExecutionResult,
} from "@/lib/research/logic-chain-types";
import { TokenUsage as AITokenUsage } from "@/lib/ai/types";
import {
  DeepDiveReportSchema,
  type DeepDiveReport,
  type StreamLog,
} from "@/lib/research/workflow-types";
import pLimit from "p-limit";
import { createStreamableValue } from "@/lib/ai/stream-helper";

// Concurrency limit for AI/Search requests
const limit = pLimit(5);

/**
 * Log collector for streaming logs
 */
/**
 * Log collector for streaming logs
 */
interface LogCollector {
  logs: StreamLog[];
  add(log: StreamLog): void;
}

function createLogCollector(onLog?: (log: StreamLog) => void): LogCollector {
  const logs: StreamLog[] = [];
  return {
    logs,
    add(log: StreamLog) {
      logs.push(log);
      onLog?.(log);
    },
  };
}

/**
 * Stage 1: Generate Topic Chains
 * Creates logical investigation chains for different research topics
 */
async function generateTopicChains(
  ticker: string,
  lang: Language,
  collector: LogCollector
): Promise<{ chains: TopicChain[]; usage: AITokenUsage }> {
  const logMessage = lang === "cn" 
    ? `正在为 ${ticker} 生成逻辑调查链...`
    : `Generating logical investigation chains for ${ticker}...`;
  
  collector.add({
    type: "strategist_plan",
    message: logMessage,
    timestamp: new Date(),
  });

  const languagePrompt = getLanguageSystemPrompt(lang);
  
  const prompt = `You are a senior investment analyst. For the stock ticker "${ticker}", create a comprehensive research investigation structure.

Generate 5-7 major research TOPICS, and for each topic, create a logical chain of investigation steps.

Each topic should have 3-5 sequential steps that build upon each other logically.

Example structure:
Topic: "Competitive Landscape"
- Step 1: Identify direct competitors
- Step 2: Compare market share and positioning
- Step 3: Analyze competitive advantages
- Step 4: Assess threat of new entrants

Return ONLY a JSON object with this EXACT structure:
{
  "topics": [
    {
      "topic": "Topic name",
      "chain": [
        {
          "step_name": "Step 1: Description",
          "intent": "Why we're asking this - what we want to learn",
          "questions": ["specific question 1", "specific question 2"],
          "next_logic_step": "What to investigate next based on findings"
        }
      ]
    }
  ]
}

Requirements:
- Each topic should have 3-5 steps
- Steps should be logically sequential (each builds on the previous)
- Questions should be specific and actionable
- Intent should explain the reasoning
- next_logic_step should describe what to investigate next

Return ONLY valid JSON, no markdown, no explanations.
${languagePrompt}`;

  const response = await limit(() => generateTextWithModel(ticker, prompt));
  
  let chains: TopicChain[] = [];
  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.topics && Array.isArray(parsed.topics)) {
        chains = parsed.topics.map((topicData: any, topicIndex: number) => ({
          topic: topicData.topic || `Topic ${topicIndex + 1}`,
          chain: (topicData.chain || []).map((nodeData: any, nodeIndex: number) => ({
            id: `topic-${topicIndex + 1}-node-${nodeIndex + 1}`,
            step_name: nodeData.step_name || `Step ${nodeIndex + 1}`,
            intent: nodeData.intent || "",
            questions: nodeData.questions || [],
            findings: [],
            reasoning: "",
            next_logic_step: nodeData.next_logic_step || null,
          })),
        }));
      }
    }
  } catch (error) {
    console.error("Error parsing topic chains:", error);
    // Fallback chains
    chains = [
      {
        topic: "Competitive Analysis",
        chain: [
          {
            id: "comp-1",
            step_name: "Step 1: Identify Competitors",
            intent: "Identify direct competitors to understand market positioning",
            questions: [`${ticker} competitors`, `${ticker} market share`],
            findings: [],
            reasoning: "",
            next_logic_step: "Compare competitive advantages",
          },
        ],
      },
    ];
  }

  collector.add({
    type: "strategist_plan",
    message: `Generated ${chains.length} topic chains with ${chains.reduce((sum, c) => sum + c.chain.length, 0)} total investigation steps`,
    data: { chains: chains.map((c) => ({ topic: c.topic, steps: c.chain.length })) },
    timestamp: new Date(),
  });

  return {
    chains,
    usage: response.usage,
  };
}

/**
 * Execute a single research node
 * Searches for answers to the node's questions and extracts facts
 */
async function executeNode(
  ticker: string,
  lang: Language,
  node: ResearchNode,
  collector: LogCollector
): Promise<{ result: NodeExecutionResult; usage: AITokenUsage }> {
  const logMessage = lang === "cn" 
    ? `执行: ${node.step_name}`
    : `Executing: ${node.step_name}`;
    
  collector.add({
    type: "mission_start",
    message: logMessage,
    data: { nodeId: node.id, intent: node.intent },
    timestamp: new Date(),
  });

  const allFindings: string[] = [];
  const allSearchResults: Array<{ title: string; content: string; link: string }> = [];
  let totalUsage: AITokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cost: 0,
    model: "gemini" as any,
  };

  // Execute searches for each question concurrently with limit
  const searchPromises = node.questions.map(question => limit(async () => {
    collector.add({
      type: "search_query",
      message: `Searching: ${question}`,
      data: { nodeId: node.id, question },
      timestamp: new Date(),
    });

    try {
      const searchResponse = await searchWeb(question, 5);
      
      collector.add({
        type: "search_results",
        message: `Found ${searchResponse.results.length} results`,
        data: {
          nodeId: node.id,
          question,
          resultCount: searchResponse.results.length,
        },
        timestamp: new Date(),
      });

      // Extract facts from search results
      return searchResponse.results
        .filter(r => r.content)
        .map(r => ({
          title: r.title,
          content: r.content || "",
          link: r.link,
        }));
    } catch (error) {
      console.error(`Error searching for "${question}":`, error);
      collector.add({
        type: "search_results",
        message: `Search failed: ${question}`,
        data: { nodeId: node.id, question, error: true },
        timestamp: new Date(),
      });
      return [];
    }
  }));

  const searchResults = await Promise.all(searchPromises);
  searchResults.flat().forEach(r => allSearchResults.push(r));

  // Extract facts from search results using AI (Use Flash model for speed)
  if (allSearchResults.length > 0) {
    const extractingMessage = lang === "cn"
      ? `正在从 ${allSearchResults.length} 个搜索结果中提取事实...`
      : `Extracting facts from ${allSearchResults.length} search results...`;
      
    collector.add({
      type: "analysis_progress",
      message: extractingMessage,
      data: { nodeId: node.id },
      timestamp: new Date(),
    });

    const languagePrompt = getLanguageSystemPrompt(lang);
    const factExtractionPrompt = `You are a fact extraction specialist. From the following search results, extract SPECIFIC FACTS that answer this question:

INTENT: ${node.intent}

SEARCH RESULTS:
${allSearchResults
  .map(
    (r, i) => `
Result ${i + 1}: ${r.title}
${r.content.substring(0, 1000)}
Source: ${r.link}
`
  )
  .join("\n---\n")}

Extract SPECIFIC FACTS including:
- Numbers (revenue, market cap, percentages, dates)
- Dates (earnings dates, announcements, milestones)
- Named entities (companies, people, locations)
- Specific metrics and comparisons

Return ONLY a JSON array of fact strings:
["Fact 1 with specific numbers/dates", "Fact 2 with specific numbers/dates", ...]

Each fact should be a complete sentence with specific data. Do not include generic statements.
${languagePrompt}`;

    try {
      // USE FLASH MODEL FOR SPEED
      const factResponse = await limit(() => generateTextWithModel(
        ticker, 
        factExtractionPrompt, 
        process.env.GOOGLE_MODEL_NAME_FLASH || "gemini-2.5-pro"
      ));
      totalUsage.inputTokens += factResponse.usage.inputTokens;
      totalUsage.outputTokens += factResponse.usage.outputTokens;
      totalUsage.cost = (totalUsage.cost || 0) + (factResponse.usage.cost || 0);

      const jsonMatch = factResponse.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          allFindings.push(...parsed);
        }
      }
    } catch (error) {
      console.error("Error extracting facts:", error);
    }
  }

  // Generate reasoning (Use Flash model for speed)
  let reasoning = "";
  if (allFindings.length > 0) {
    const languagePrompt = getLanguageSystemPrompt(lang);
    const reasoningPrompt = `Based on these facts, explain how they answer the intent:

INTENT: ${node.intent}

FACTS:
${allFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Provide a concise reasoning (2-3 sentences) explaining how these facts answer the intent.
${languagePrompt}`;

    try {
      // USE FLASH MODEL FOR SPEED
      const reasoningResponse = await limit(() => generateTextWithModel(
        ticker, 
        reasoningPrompt,
        process.env.GOOGLE_MODEL_NAME_FLASH || "gemini-2.5-pro"
      ));
      totalUsage.inputTokens += reasoningResponse.usage.inputTokens;
      totalUsage.outputTokens += reasoningResponse.usage.outputTokens;
      totalUsage.cost = (totalUsage.cost || 0) + (reasoningResponse.usage.cost || 0);
      reasoning = reasoningResponse.text.trim();
    } catch (error) {
      console.error("Error generating reasoning:", error);
      const defaultReasoning = lang === "cn" 
        ? `找到 ${allFindings.length} 个与 ${node.intent} 相关的事实`
        : `Found ${allFindings.length} facts related to ${node.intent}`;
      reasoning = defaultReasoning;
    }
  }

  return {
    result: {
      nodeId: node.id,
      success: allFindings.length > 0,
      findings: allFindings,
      reasoning,
      searchResults: allSearchResults,
    },
    usage: totalUsage,
  };
}

/**
 * Execute a complete topic chain
 */
async function executeTopicChain(
  ticker: string,
  lang: Language,
  chain: TopicChain,
  collector: LogCollector
): Promise<{ updatedChain: TopicChain; usage: AITokenUsage }> {
  const startMessage = lang === "cn"
    ? `开始主题链: ${chain.topic}`
    : `Starting topic chain: ${chain.topic}`;
    
  collector.add({
    type: "mission_start",
    message: startMessage,
    data: { topic: chain.topic, steps: chain.chain.length },
    timestamp: new Date(),
  });

  let totalUsage: AITokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    cost: 0,
    model: "gemini" as any,
  };

  const updatedChain: TopicChain = {
    topic: chain.topic,
    chain: [],
  };

  // Execute nodes sequentially (each builds on previous)
  for (const node of chain.chain) {
    const { result, usage } = await executeNode(ticker, lang, node, collector);
    
    totalUsage.inputTokens += usage.inputTokens;
    totalUsage.outputTokens += usage.outputTokens;
    totalUsage.cost = (totalUsage.cost || 0) + (usage.cost || 0);

    // Update node with findings and reasoning
    const updatedNode: ResearchNode = {
      ...node,
      findings: result.findings,
      reasoning: result.reasoning,
    };

    updatedChain.chain.push(updatedNode);

    const completedMessage = lang === "cn"
      ? `完成 ${node.step_name}: 找到 ${result.findings.length} 个事实`
      : `Completed ${node.step_name}: Found ${result.findings.length} facts`;
      
    collector.add({
      type: "analysis_progress",
      message: completedMessage,
      data: {
        nodeId: node.id,
        findingsCount: result.findings.length,
        reasoning: result.reasoning.substring(0, 100),
      },
      timestamp: new Date(),
    });
  }

  return {
    updatedChain,
    usage: totalUsage,
  };
}

/**
 * Synthesize all findings into final report
 */
async function synthesizeReport(
  ticker: string,
  lang: Language,
  chains: TopicChain[],
  marketData: any,
  collector: LogCollector
): Promise<{ report: DeepDiveReport; usage: AITokenUsage }> {
  const synthMessage = lang === "cn"
    ? "正在将所有发现综合成综合报告..."
    : "Synthesizing all findings into comprehensive report...";
    
  collector.add({
    type: "analysis_progress",
    message: synthMessage,
    timestamp: new Date(),
  });

  // Compile all findings
  const allFindings = chains.flatMap((chain) =>
    chain.chain.flatMap((node) => node.findings)
  );

  const allReasoning = chains.flatMap((chain) =>
    chain.chain.map((node) => `${node.step_name}: ${node.reasoning}`)
  );

  const languagePrompt = getLanguageSystemPrompt(lang);
  const prompt = `You are a senior investment analyst. Synthesize all research findings into a comprehensive investment report.

STOCK TICKER: ${ticker}

MARKET DATA:
- Current Price: $${marketData.price.toFixed(2)}
- Change: ${marketData.change >= 0 ? "+" : ""}${marketData.change.toFixed(2)} (${marketData.changePercent >= 0 ? "+" : ""}${marketData.changePercent.toFixed(2)}%)
- Market Cap: ${marketData.marketCap ? `$${marketData.marketCap.toLocaleString()}` : "N/A"}

RESEARCH TOPICS INVESTIGATED:
${chains.map((c) => `- ${c.topic} (${c.chain.length} steps)`).join("\n")}

KEY FINDINGS (${allFindings.length} facts):
${allFindings.slice(0, 50).map((f, i) => `${i + 1}. ${f}`).join("\n")}
${allFindings.length > 50 ? `\n... and ${allFindings.length - 50} more facts` : ""}

REASONING CHAIN:
${allReasoning.join("\n\n")}

Based on this comprehensive research with ${allFindings.length} specific facts, provide a deep-dive analysis.

Return ONLY a JSON object with this EXACT structure:
{
  "narrative_arc": "What is the market narrative? Be specific with facts and numbers",
  "competitor_matrix": [
    {
      "name": "Competitor name",
      "market_cap": "Market cap if found",
      "core_difference": "Key difference vs ${ticker} (use specific facts)",
      "resource_quality": "Resource quality if applicable"
    }
  ],
  "financial_reality": {
    "cash_burn_rate": "Cash burn analysis with specific numbers",
    "capex_cycle": "Capital expenditure cycle with specific numbers",
    "revenue_trend": "Revenue trend with specific numbers and dates"
  },
  "marginal_changes": "What changed in the last 3 months? Use specific dates and facts",
  "verdict": "The brutal truth based on all ${allFindings.length} facts found"
}

Requirements:
- Use SPECIFIC FACTS from the research (numbers, dates, entities)
- Be brutally honest and direct
- Reference specific findings where relevant
- competitor_matrix should have at least 2-3 competitors
- All fields must be filled with factual content

Return ONLY the JSON object, no markdown, no explanations.
${languagePrompt}`;

  const response = await limit(() => generateTextWithModel(ticker, prompt));

  let report: DeepDiveReport;
  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    report = DeepDiveReportSchema.parse(parsed);
  } catch (error) {
    console.error("Error parsing report:", error);
    report = {
      narrative_arc: `Analysis for ${ticker} based on ${allFindings.length} facts found.`,
      competitor_matrix: [],
      financial_reality: {
        cash_burn_rate: "",
        capex_cycle: "",
        revenue_trend: "",
      },
      marginal_changes: "",
      verdict: `Analysis for ${ticker}: Found ${allFindings.length} facts across ${chains.length} research topics.`,
    };
  }

  collector.add({
    type: "final_report",
    message: "Report synthesis complete",
    data: report,
    timestamp: new Date(),
  });

  return {
    report,
    usage: response.usage,
  };
}

export interface ResearchState {
  status: "initializing" | "planning" | "researching" | "completed" | "error";
  plan?: TopicChain[]; 
  completedChains: TopicChain[];
  logs: StreamLog[];
  report?: DeepDiveReport;
  error?: string;
  totalTokens?: number;
  reportId?: string;
  investigation?: ResearchInvestigation;
}

/**
 * Deep Research with Logical Chain Architecture
 * 
 * This implements a structured, logical deep-dive investigation
 * with topic chains and sequential node execution
 * 
 * @param ticker - Stock ticker symbol
 * @param lang - Output language (en or cn)
 */
export async function runDeepResearchV3(
  ticker: string,
  lang: Language = "en"
) {
  const stream = createStreamableValue<ResearchState>({
    status: "initializing",
    completedChains: [],
    logs: [],
  });

  (async () => {
    const currentState: ResearchState = {
      status: "initializing",
      completedChains: [],
      logs: [],
    };

    const collector = createLogCollector((log) => {
      currentState.logs.push(log);
      stream.update(currentState);
    });

    const startMessage = lang === "cn"
      ? `正在启动 ${ticker} 的逻辑链深度研究...`
      : `Starting deep research with logical chains for ${ticker}...`;

    collector.add({
      type: "strategist_plan",
      message: startMessage,
      timestamp: new Date(),
    });

    let totalUsage: AITokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
       model: "gemini" as any,
    };
    let reportId: string | undefined;

    try {
      // Stage 1: Generate topic chains
      currentState.status = "planning";
      stream.update(currentState);

      const { chains, usage: usage1 } = await generateTopicChains(ticker, lang, collector);
      totalUsage.inputTokens += usage1.inputTokens;
      totalUsage.outputTokens += usage1.outputTokens;
      totalUsage.cost = (totalUsage.cost || 0) + (usage1.cost || 0);
      
      currentState.plan = chains;
      currentState.status = "researching";
      stream.update(currentState);

      // Fetch market data
      const adapter = getAdapterForTicker(ticker);
      const marketData = await adapter.getQuote(ticker);

      // Stage 2: Execute all topic chains (concurrently with limit)
      // Use limit to control how many chains run at once (e.g., 2 chains in parallel)
      // Each chain has its own internal concurrency control for searches
      const chainLimit = pLimit(2);
      
      const chainPromises = chains.map((chain) => chainLimit(async () => {
        const result = await executeTopicChain(ticker, lang, chain, collector);
        
        // Update state with completed chain
        currentState.completedChains.push(result.updatedChain);
        stream.update(currentState);
        
        return result;
      }));

      const chainResults = await Promise.all(chainPromises);

      // Update total usage
      chainResults.forEach((r) => {
        totalUsage.inputTokens += r.usage.inputTokens;
        totalUsage.outputTokens += r.usage.outputTokens;
        totalUsage.cost = (totalUsage.cost || 0) + (r.usage.cost || 0);
      });

      // Update chains with findings for final report
      const completedChains = chainResults.map((r) => r.updatedChain);

      // Stage 3: Synthesize report
      const { report, usage: usage3 } = await synthesizeReport(
        ticker,
        lang,
        completedChains,
        marketData,
        collector
      );
      totalUsage.inputTokens += usage3.inputTokens;
      totalUsage.outputTokens += usage3.outputTokens;
      totalUsage.cost = (totalUsage.cost || 0) + (usage3.cost || 0);

      const totalNodes = completedChains.reduce(
        (sum, chain) => sum + chain.chain.length,
        0
      );
      const completedNodes = completedChains.reduce(
        (sum, chain) =>
          sum + chain.chain.filter((node) => node.findings.length > 0).length,
        0
      );

      const investigation: ResearchInvestigation = {
        ticker,
        topicChains: completedChains,
        totalNodes,
        completedNodes,
      };

      const totalTokens = totalUsage.inputTokens + totalUsage.outputTokens;

      // Save report to database
      try {
        const savingMessage = lang === "cn"
          ? "正在将报告保存到数据库..."
          : "Saving report to database...";
          
        collector.add({
          type: "analysis_progress",
          message: savingMessage,
          timestamp: new Date(),
        });

        const savedReport = await saveReport({
          ticker,
          language: lang,
          report,
          investigation,
          totalTokens,
        });

        // Set valid reportId
        reportId = savedReport.id;

        const savedMessage = lang === "cn"
          ? `报告已保存，ID: ${savedReport.id}`
          : `Report saved with ID: ${savedReport.id}`;
          
        collector.add({
          type: "final_report",
          message: savedMessage,
          data: { reportId: savedReport.id },
          timestamp: new Date(),
        });
      } catch (saveError) {
        console.error("Error saving report to database:", saveError);
        const errorMessage = lang === "cn"
          ? `警告: 保存报告到数据库失败: ${saveError instanceof Error ? saveError.message : "未知错误"}`
          : `Warning: Failed to save report to database: ${saveError instanceof Error ? saveError.message : "Unknown error"}`;
          
        collector.add({
          type: "analysis_progress",
          message: errorMessage,
          timestamp: new Date(),
        });
      }

      currentState.status = "completed";
      currentState.report = report;
      currentState.investigation = investigation;
      currentState.totalTokens = totalTokens;
      currentState.reportId = reportId;
      
      stream.done(currentState);
      
    } catch (error) {
      console.error("Error in runDeepResearchV3:", error);
      const errorLogMessage = lang === "cn"
        ? `错误: ${error instanceof Error ? error.message : "未知错误"}`
        : `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
        
      collector.add({
        type: "analysis_progress",
        message: errorLogMessage,
        timestamp: new Date(),
      });

      currentState.status = "error";
      currentState.error = error instanceof Error ? error.message : "Unknown error";
      stream.done(currentState);
    }
  })();

  return { output: stream.value };
}



