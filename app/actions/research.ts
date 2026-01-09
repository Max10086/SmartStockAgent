"use server";

import { generateText } from "@/lib/google-ai";
import { getAdapterForTicker } from "@/lib/market-data";
import {
  ResearchStep,
  ResearchStepStatus,
  InvestigationQuestions,
  ResearchData,
  AnalysisResult,
  ResearchReport,
} from "@/lib/research/types";
import { TokenUsage } from "@/lib/google-ai";
import { ResearchReportSchema, ValidatedResearchReport } from "@/lib/research/schema";

/**
 * Step 1: Generate investigation questions based on user input
 */
export async function generateInvestigationQuestions(
  ticker: string
): Promise<{ questions: InvestigationQuestions; usage: TokenUsage }> {
  const prompt = `You are a senior investment analyst. Given the stock ticker "${ticker}", generate 5-10 deep research questions that would help understand:
1. The company's business model and competitive position
2. Financial health and growth prospects
3. Market sentiment and narrative
4. Risk factors and potential catalysts
5. Industry trends and macro environment

Return ONLY a JSON object with this exact structure:
{
  "questions": ["question1", "question2", ...]
}

Do not include any other text or explanation.`;

  const response = await generateText(prompt);
  
  // Parse JSON from response
  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const questions = JSON.parse(jsonMatch[0]) as InvestigationQuestions;
    
    return {
      questions,
      usage: response.usage,
    };
  } catch (error) {
    console.error("Error parsing questions:", error);
    // Fallback: create questions from text
    const lines = response.text
      .split("\n")
      .filter((line) => line.trim().length > 0 && /^\d+[\.\)]/.test(line.trim()))
      .map((line) => line.replace(/^\d+[\.\)]\s*/, "").trim())
      .slice(0, 10);
    
    return {
      questions: {
        questions: lines.length > 0 ? lines : [
          `What is ${ticker}'s business model?`,
          `What are ${ticker}'s key financial metrics?`,
          `What are the main risks for ${ticker}?`,
        ],
      },
      usage: response.usage,
    };
  }
}

/**
 * Step 2: Fetch market data and mock news
 */
export async function fetchResearchData(
  ticker: string
): Promise<{ data: ResearchData; usage: TokenUsage }> {
  // Fetch market data
  const adapter = getAdapterForTicker(ticker);
  const marketData = await adapter.getQuote(ticker);

  // Mock news data (in future, integrate with real news API)
  const mockNews = [
    {
      title: `Recent developments for ${ticker}`,
      source: "Market Analysis",
      date: new Date().toISOString(),
    },
  ];

  return {
    data: {
      marketData,
      newsData: mockNews,
    },
    usage: {
      inputTokens: 0,
      outputTokens: 0,
    },
  };
}

/**
 * Step 3: Analyze fundamentals and narrative
 */
export async function analyzeFundamentals(
  ticker: string,
  marketData: any,
  questions: InvestigationQuestions
): Promise<{ analysis: AnalysisResult; usage: TokenUsage }> {
  const prompt = `You are a senior investment analyst. Analyze the following stock:

Ticker: ${ticker}
Current Price: $${marketData.price}
Change: ${marketData.change > 0 ? "+" : ""}${marketData.change} (${marketData.changePercent > 0 ? "+" : ""}${marketData.changePercent.toFixed(2)}%)
Market Cap: ${marketData.marketCap ? `$${marketData.marketCap.toLocaleString()}` : "N/A"}

Research Questions to Address:
${questions.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Based on this information and your knowledge, provide a comprehensive analysis.

Return ONLY a JSON object with this exact structure:
{
  "summary": "A 2-3 sentence summary of the investment thesis",
  "bullPoints": ["bull point 1", "bull point 2", ...],
  "bearPoints": ["bear point 1", "bear point 2", ...],
  "timeline": [
    {
      "date": "YYYY-MM-DD",
      "event": "event description",
      "impact": "positive|negative|neutral"
    }
  ]
}

Do not include any other text or explanation.`;

  const response = await generateText(prompt);

  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const analysis = JSON.parse(jsonMatch[0]) as AnalysisResult;

    return {
      analysis,
      usage: response.usage,
    };
  } catch (error) {
    console.error("Error parsing analysis:", error);
    // Fallback analysis
    return {
      analysis: {
        summary: `Analysis for ${ticker} based on current market data and research questions.`,
        bullPoints: [
          `Current price: $${marketData.price}`,
          `Market sentiment appears positive`,
        ],
        bearPoints: [
          `Requires deeper fundamental analysis`,
          `Market conditions may change`,
        ],
      },
      usage: response.usage,
    };
  }
}

/**
 * Step 4: Generate final report JSON
 */
export async function generateFinalReport(
  ticker: string,
  analysis: AnalysisResult
): Promise<{ report: ResearchReport; usage: TokenUsage }> {
  const prompt = `Create a concise one-liner investment thesis for ${ticker} based on this analysis:

Summary: ${analysis.summary}
Bull Points: ${analysis.bullPoints.join(", ")}
Bear Points: ${analysis.bearPoints.join(", ")}

Return ONLY a JSON object with this exact structure:
{
  "oneLiner": "A single compelling sentence summarizing the investment thesis",
  "bullPoints": ${JSON.stringify(analysis.bullPoints)},
  "bearPoints": ${JSON.stringify(analysis.bearPoints)},
  "timeline": ${JSON.stringify(analysis.timeline || [])}
}

Do not include any other text or explanation.`;

  const response = await generateText(prompt);

  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const reportData = JSON.parse(jsonMatch[0]);

    const report: ResearchReport = {
      ticker,
      oneLiner: reportData.oneLiner || analysis.summary,
      bullPoints: reportData.bullPoints || analysis.bullPoints,
      bearPoints: reportData.bearPoints || analysis.bearPoints,
      timeline: reportData.timeline || analysis.timeline,
      generatedAt: new Date(),
    };

    return {
      report,
      usage: response.usage,
    };
  } catch (error) {
    console.error("Error parsing report:", error);
    // Fallback report
    return {
      report: {
        ticker,
        oneLiner: analysis.summary,
        bullPoints: analysis.bullPoints,
        bearPoints: analysis.bearPoints,
        timeline: analysis.timeline,
        generatedAt: new Date(),
      },
      usage: response.usage,
    };
  }
}

/**
 * Complete research workflow - executes all steps sequentially
 */
export async function runCompleteResearch(
  ticker: string
): Promise<{
  report: ResearchReport;
  totalUsage: TokenUsage;
}> {
  let totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  // Step 1: Generate questions
  const { questions, usage: usage1 } = await generateInvestigationQuestions(ticker);
  totalUsage.inputTokens += usage1.inputTokens;
  totalUsage.outputTokens += usage1.outputTokens;

  // Step 2: Fetch data
  const { data, usage: usage2 } = await fetchResearchData(ticker);
  totalUsage.inputTokens += usage2.inputTokens;
  totalUsage.outputTokens += usage2.outputTokens;

  // Step 3: Analyze
  const { analysis, usage: usage3 } = await analyzeFundamentals(
    ticker,
    data.marketData,
    questions
  );
  totalUsage.inputTokens += usage3.inputTokens;
  totalUsage.outputTokens += usage3.outputTokens;

  // Step 4: Generate report
  const { report, usage: usage4 } = await generateFinalReport(ticker, analysis);
  totalUsage.inputTokens += usage4.inputTokens;
  totalUsage.outputTokens += usage4.outputTokens;

  return {
    report,
    totalUsage,
  };
}

/**
 * Deep Research Workflow - Autonomous Analyst Logic
 * 
 * This is the main function for Phase 2 that implements the complete
 * autonomous analyst workflow with proper token tracking and validation.
 * 
 * @param ticker - Stock ticker symbol (e.g., "AAPL")
 * @returns Promise with status, validated report, and total token usage
 */
export async function runDeepResearch(
  ticker: string
): Promise<{
  status: "completed" | "error";
  report: ValidatedResearchReport;
  totalTokens: number;
  error?: string;
}> {
  let totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  try {
    // Step 1: Deconstruct - Generate 5 deep, critical questions
    const step1Prompt = `You are a senior investment analyst. Given the stock ticker "${ticker}", generate exactly 5 deep, critical research questions that focus on current market narratives and key investment concerns.

Focus on questions like:
- Cash flow sustainability and financial health
- Key catalysts and growth drivers
- Competitive positioning and market share
- Risk factors and potential headwinds
- Valuation and market sentiment

Return ONLY a JSON object with this exact structure:
{
  "questions": ["question1", "question2", "question3", "question4", "question5"]
}

Do not include any other text, markdown, or explanation. Return only valid JSON.`;

    const step1Response = await generateText(step1Prompt);
    totalUsage.inputTokens += step1Response.usage.inputTokens;
    totalUsage.outputTokens += step1Response.usage.outputTokens;

    // Parse questions from Step 1
    let questions: string[] = [];
    try {
      const jsonMatch = step1Response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        questions = parsed.questions || [];
      }
    } catch (error) {
      console.error("Error parsing Step 1 questions:", error);
      // Fallback questions
      questions = [
        `Is ${ticker}'s cash flow sustainable?`,
        `What are the key catalysts for ${ticker}?`,
        `What is ${ticker}'s competitive position?`,
        `What are the main risks for ${ticker}?`,
        `Is ${ticker} fairly valued?`,
      ];
    }

    // Step 2: Data Fetching
    // 2a. Fetch real-time market data using TencentUSAdapter
    const adapter = getAdapterForTicker(ticker);
    const marketData = await adapter.getQuote(ticker);

    // 2b. Mock news search (structured for easy replacement with real API later)
    const mockNewsData = `Recent market developments for ${ticker}:
- Current trading price: $${marketData.price.toFixed(2)}
- ${marketData.change >= 0 ? "Gained" : "Lost"} ${Math.abs(marketData.changePercent).toFixed(2)}% today
- Market sentiment appears ${marketData.change >= 0 ? "positive" : "cautious"}
- Volume activity: ${marketData.volume ? marketData.volume.toLocaleString() : "N/A"}
- Recent analyst coverage suggests mixed opinions on near-term prospects
- Industry trends indicate potential headwinds/tailwinds depending on sector dynamics`;

    // Step 3: Synthesis - Generate structured JSON report
    const step3Prompt = `You are a senior investment analyst. Based on the following information, generate a comprehensive investment research report.

STOCK TICKER: ${ticker}

MARKET DATA:
- Current Price: $${marketData.price.toFixed(2)}
- Change: ${marketData.change >= 0 ? "+" : ""}${marketData.change.toFixed(2)} (${marketData.changePercent >= 0 ? "+" : ""}${marketData.changePercent.toFixed(2)}%)
- Market Cap: ${marketData.marketCap ? `$${marketData.marketCap.toLocaleString()}` : "N/A"}
- Volume: ${marketData.volume ? marketData.volume.toLocaleString() : "N/A"}

RESEARCH QUESTIONS TO ADDRESS:
${questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

RECENT NEWS & MARKET CONTEXT:
${mockNewsData}

Based on this information and your knowledge of the company and market, provide a comprehensive investment analysis.

Return ONLY a valid JSON object with this EXACT structure (no markdown, no code blocks, no explanations):
{
  "verdict": "A concise one-line investment verdict or thesis statement",
  "bullPoints": ["bull point 1", "bull point 2", "bull point 3", ...],
  "bearPoints": ["bear point 1", "bear point 2", "bear point 3", ...],
  "timeline": [
    {
      "date": "YYYY-MM-DD",
      "event": "event description",
      "impact": "positive"
    },
    {
      "date": "YYYY-MM-DD",
      "event": "event description",
      "impact": "negative"
    }
  ]
}

Requirements:
- Provide at least 3 bull points and 3 bear points
- Timeline should include 3-5 relevant events (can be recent or upcoming)
- All dates must be in YYYY-MM-DD format
- Impact must be exactly "positive", "negative", or "neutral"
- Return ONLY the JSON object, nothing else`;

    const step3Response = await generateText(step3Prompt);
    totalUsage.inputTokens += step3Response.usage.inputTokens;
    totalUsage.outputTokens += step3Response.usage.outputTokens;

    // Parse and validate JSON from Step 3
    let report: ValidatedResearchReport;
    try {
      // Extract JSON from response (handle markdown code blocks if present)
      let jsonText = step3Response.text.trim();
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      
      // Extract JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in Step 3 response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate with zod schema
      report = ResearchReportSchema.parse(parsed);
    } catch (error) {
      console.error("Error parsing/validating Step 3 report:", error);
      
      // Fallback report if validation fails
      report = {
        verdict: `Analysis for ${ticker}: Current price $${marketData.price.toFixed(2)} with ${marketData.changePercent >= 0 ? "positive" : "negative"} momentum.`,
        bullPoints: [
          `Current price: $${marketData.price.toFixed(2)}`,
          `Market sentiment appears ${marketData.change >= 0 ? "positive" : "cautious"}`,
          `Requires deeper fundamental analysis`,
        ],
        bearPoints: [
          `Market volatility may impact short-term performance`,
          `Requires deeper fundamental analysis`,
          `Industry headwinds may affect growth`,
        ],
        timeline: [],
      };
    }

    const totalTokens = totalUsage.inputTokens + totalUsage.outputTokens;

    return {
      status: "completed",
      report,
      totalTokens,
    };
  } catch (error) {
    console.error("Error in runDeepResearch:", error);
    return {
      status: "error",
      report: {
        verdict: `Error analyzing ${ticker}`,
        bullPoints: [],
        bearPoints: [],
        timeline: [],
      },
      totalTokens: totalUsage.inputTokens + totalUsage.outputTokens,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

