import { z } from "zod";

/**
 * Research Mission - A specific research task
 */
export interface ResearchMission {
  id: string;
  title: string;
  description: string;
  searchQueries: string[];
}

/**
 * Stage 1 Output: Strategist Plan
 */
export const StrategistPlanSchema = z.object({
  sector: z.string().describe("The industry sector"),
  peerGroup: z.array(z.string()).describe("List of peer companies/tickers"),
  missions: z
    .array(
      z.object({
        title: z.string().describe("Mission title"),
        description: z.string().describe("Detailed mission description"),
        searchQueries: z
          .array(z.string())
          .describe("Specific search queries for this mission"),
      })
    )
    .length(4)
    .describe("Exactly 4 research missions"),
});

export type StrategistPlan = z.infer<typeof StrategistPlanSchema>;

/**
 * Search Result with Mission Context
 */
export interface MissionSearchResult {
  missionId: string;
  missionTitle: string;
  query: string;
  results: Array<{
    title: string;
    snippet: string;
    link: string;
  }>;
}

/**
 * Stage 3 Output: Deep Dive Analysis
 */
export const DeepDiveReportSchema = z.object({
  narrative_arc: z
    .string()
    .describe("What is the hype? (Policy? Tech? Market narrative?)"),
  competitor_matrix: z
    .array(
      z.object({
        name: z.string(),
        market_cap: z.string().optional(),
        core_difference: z.string(),
        resource_quality: z.string().optional(),
      })
    )
    .describe("Array of competitor analysis"),
  financial_reality: z.object({
    cash_burn_rate: z.string().optional(),
    capex_cycle: z.string().optional(),
    revenue_trend: z.string().optional(),
  }),
  marginal_changes: z
    .string()
    .describe("What changed in the last 3 months?"),
  verdict: z.string().describe("The brutal truth - honest investment verdict"),
});

export type DeepDiveReport = z.infer<typeof DeepDiveReportSchema>;

/**
 * Stream log types
 */
export type StreamLogType =
  | "strategist_plan"
  | "mission_start"
  | "search_query"
  | "search_results"
  | "analysis_progress"
  | "final_report";

export interface StreamLog {
  type: StreamLogType;
  message: string;
  data?: any;
  timestamp: Date;
}

