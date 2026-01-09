import { z } from "zod";

/**
 * Zod schema for validating the research report JSON structure
 */
export const ResearchReportSchema = z.object({
  verdict: z.string().describe("A one-line investment verdict or thesis"),
  bullPoints: z
    .array(z.string())
    .min(2)
    .describe("Array of bullish points supporting the investment"),
  bearPoints: z
    .array(z.string())
    .min(2)
    .describe("Array of bearish points or risks"),
  timeline: z
    .array(
      z.object({
        date: z.string().describe("Date in YYYY-MM-DD format"),
        event: z.string().describe("Description of the event"),
        impact: z
          .enum(["positive", "negative", "neutral"])
          .describe("Impact of the event"),
      })
    )
    .optional()
    .describe("Timeline of relevant events"),
});

export type ValidatedResearchReport = z.infer<typeof ResearchReportSchema>;

