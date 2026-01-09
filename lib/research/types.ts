import { TokenUsage } from "@/lib/google-ai";
import { MarketQuote } from "@/lib/market-data";

/**
 * Research step status
 */
export enum ResearchStepStatus {
  Pending = "pending",
  InProgress = "in_progress",
  Completed = "completed",
  Error = "error",
}

/**
 * Research steps in the workflow
 */
export enum ResearchStep {
  GenerateQuestions = "generate_questions",
  FetchData = "fetch_data",
  AnalyzeFundamentals = "analyze_fundamentals",
  GenerateReport = "generate_report",
}

/**
 * Research step information
 */
export interface ResearchStepInfo {
  step: ResearchStep;
  status: ResearchStepStatus;
  message?: string;
  data?: any;
}

/**
 * Investigation questions generated in Step 1
 */
export interface InvestigationQuestions {
  questions: string[];
}

/**
 * Research data collected in Step 2
 */
export interface ResearchData {
  marketData: MarketQuote;
  newsData?: any[]; // Mock news data for now
}

/**
 * Analysis result from Step 3
 */
export interface AnalysisResult {
  summary: string;
  bullPoints: string[];
  bearPoints: string[];
  timeline?: Array<{
    date: string;
    event: string;
    impact: "positive" | "negative" | "neutral";
  }>;
}

/**
 * Final research report
 */
export interface ResearchReport {
  ticker: string;
  oneLiner: string;
  bullPoints: string[];
  bearPoints: string[];
  timeline?: Array<{
    date: string;
    event: string;
    impact: "positive" | "negative" | "neutral";
  }>;
  generatedAt: Date;
}

/**
 * Research session state
 */
export interface ResearchState {
  ticker: string;
  steps: ResearchStepInfo[];
  tokenUsage: TokenUsage;
  report?: ResearchReport;
  error?: string;
}

