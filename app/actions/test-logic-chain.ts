"use server";

import { readStreamableValue } from "@/lib/ai/stream-helper";
import { ResearchState, runDeepResearchV3 } from "./research-v3";

/**
 * Test the logical chain architecture
 * This is a simple test to verify the structure works
 */
export async function testLogicChain(ticker: string = "AAPL") {
  console.log(`\n=== Testing Logical Chain Architecture for ${ticker} ===\n`);

  try {
    const { output } = await runDeepResearchV3(ticker);
    
    let result: ResearchState | undefined;
    
    // Consume the stream
    for await (const state of readStreamableValue<ResearchState>(output)) {
      result = state;
      // Optional: log progress
      if (state.logs && state.logs.length > 0) {
        const lastLog = state.logs[state.logs.length - 1];
        process.stdout.write(`\r[${lastLog.type}] ${lastLog.message.substring(0, 50)}...`);
      }
    }
    
    if (!result) throw new Error("No result from research stream");

    console.log(`\n✅ Status: ${result.status}`);
    console.log(`📊 Total Tokens: ${(result.totalTokens || 0).toLocaleString()}`);
    console.log(`📝 Logs: ${result.logs.length} entries`);

    if (result.status === "completed" && result.investigation && result.report) {
      console.log(`\n📋 Investigation Structure:`);
      console.log(`   Total Nodes: ${result.investigation.totalNodes}`);
      console.log(`   Completed Nodes: ${result.investigation.completedNodes}`);
      console.log(`   Topic Chains: ${result.investigation.topicChains.length}`);

      console.log(`\n🔗 Topic Chains:`);
      result.investigation.topicChains.forEach((chain: any, idx: number) => {
        console.log(`\n   ${idx + 1}. ${chain.topic}`);
        chain.chain.forEach((node: any, nodeIdx: number) => {
          const findingsCount = node.findings.length;
          const status = findingsCount > 0 ? "✅" : "⚠️";
          console.log(
            `      ${status} ${node.step_name} (${findingsCount} facts)`
          );
          if (node.reasoning) {
            console.log(
              `         Reasoning: ${node.reasoning.substring(0, 80)}...`
            );
          }
        });
      });

      console.log(`\n📄 Final Report:`);
      console.log(`   Narrative: ${result.report.narrative_arc.substring(0, 100)}...`);
      console.log(`   Competitors: ${result.report.competitor_matrix.length}`);
      console.log(`   Verdict: ${result.report.verdict.substring(0, 100)}...`);

      return {
        success: true,
        investigation: result.investigation,
        report: result.report,
        totalTokens: result.totalTokens || 0,
      };
    } else {
      console.error(`\n❌ Error: ${result.error || "Unknown error"}`);
      return {
        success: false,
        error: result.error,
      };
    }
  } catch (error) {
    console.error(`\n❌ Test failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

