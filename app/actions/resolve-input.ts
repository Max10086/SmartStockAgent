"use server";

import { generateTextWithModel } from "@/lib/ai";
import { z } from "zod";

const ResolvedTargetSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  market: z.enum(["US", "CN", "HK", "OTHER"]),
});

const ResolverResponseSchema = z.array(ResolvedTargetSchema);

export type ResolvedTarget = z.infer<typeof ResolvedTargetSchema>;

/**
 * Resolves a user query into valid stock tickers.
 *
 * Checks regex first, then calls LLM for names/concepts.
 */
export async function resolveUserQuery(query: string): Promise<{
    candidates: ResolvedTarget[],
    error?: string 
}> {
  const trimmed = query.trim();

  // 1. Fast Path: Regex for standard Tickers
  // US: AAPL (all caps, 1-5 chars)
  if (/^[A-Z]{1,5}$/.test(trimmed)) {
    return { candidates: [{ symbol: trimmed, name: trimmed, market: "US" }] };
  }
  
  // CN: 600519 (6 digits)
  if (/^\d{6}$/.test(trimmed)) {
    return { candidates: [{ symbol: trimmed, name: trimmed, market: "CN" }] };
  }
  
  // HK: 9988 or 9988.HK (4-5 digits, optional .HK)
  if (/^\d{4,5}(\.HK)?$/i.test(trimmed)) {
     // Normalize to Ticker.HK format if strictly 4-5 digits
     let symbol = trimmed.toUpperCase();
     if (/^\d{4,5}$/.test(symbol)) {
         symbol = `${symbol}.HK`;
     }
     return { candidates: [{ symbol, name: symbol, market: "HK" }] };
  }

  // 2. LLM Path: Name or Concept
  try {
    const prompt = `You are a financial entity resolver.
User Input: '${trimmed}'.
Task: Identify the public company or companies associated with this input.

Rules:
1. If it's a specific company name (e.g. "Pop Mart", "Tencent"), return its main listing ticker.
2. If it's a sector or concept (e.g. "Lithium Battery Leaders"), return the top 3-5 most representative public companies (Leaders).
3. Market Priority: US > CN (A-Share) > HK. 
   - Exception: If the user inputs Chinese text or a Chinese company name, prioritize CN (A-Share) or HK listings.
4. Format tickers correctly:
   - US: Symbol only (e.g. "AAPL")
   - CN: 6-digit code (e.g. "600519")
   - HK: 4-digit code + .HK (e.g. "9988.HK")
5. Return ONLY a JSON array structure: 
   [{ "symbol": "...", "name": "...", "market": "US" | "CN" | "HK" }]

Do not include markdown formatting or explanations.`;

    const response = await generateTextWithModel("RESOLVER", prompt); // Using "RESOLVER" as dummy ticker for logging if needed
    
    // Clean potential markdown
    const jsonText = response.text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    const candidates = JSON.parse(jsonText);
    const result = ResolverResponseSchema.parse(candidates);
    
    return { candidates: result };
    
  } catch (err) {
    console.error("Input resolution failed:", err);
    return { candidates: [], error: "Failed to resolve input" };
  }
}
