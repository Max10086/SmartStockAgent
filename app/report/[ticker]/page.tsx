"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { runDeepResearch } from "@/app/actions/research-v2";
import { getAdapterForTicker, MarketQuote } from "@/lib/market-data";
import { DeepDiveReport, StreamLog } from "@/lib/research/workflow-types";
import { HeroCard } from "@/components/HeroCard";
import { LiveLog } from "@/components/LiveLog";
import { CompetitorTable } from "@/components/CompetitorTable";
import { NarrativeSection } from "@/components/NarrativeSection";
import { FinancialRedFlags } from "@/components/FinancialRedFlags";
import { TokenBadge } from "@/components/TokenBadge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

function ReportContent() {
  const params = useParams();
  const ticker = (params.ticker as string) || "";

  const [logs, setLogs] = useState<StreamLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [marketData, setMarketData] = useState<MarketQuote | null>(null);
  const [report, setReport] = useState<DeepDiveReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!ticker) return;

    const runResearch = async () => {
      try {
        // Fetch market data first
        const adapter = getAdapterForTicker(ticker);
        const marketDataResult = await adapter.getQuote(ticker);
        setMarketData(marketDataResult);

        // Add initial log
        setLogs([
          {
            type: "strategist_plan",
            message: `Starting deep research for ${ticker}...`,
            timestamp: new Date(),
          },
        ]);

        // Run deep research
        const result = await runDeepResearch(ticker);

        // Set logs from result
        if (result.logs) {
          setLogs(result.logs);
        }
        
        // Update progress based on status
        if (result.status === "completed") {
          setProgress(100);
          setReport(result.report);
          setTokenCount(result.totalTokens);
          setShowReport(true);
        } else {
          setError(result.error || "Failed to complete research");
        }
      } catch (err) {
        console.error("Research error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setLogs((prev) => [
          ...prev,
          {
            type: "analysis_progress",
            message: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
            timestamp: new Date(),
          },
        ]);
      }
    };

    runResearch();
  }, [ticker]);

  // Simulate progress updates based on logs
  useEffect(() => {
    if (logs.length === 0) return;

    const lastLog = logs[logs.length - 1];
    let newProgress = 0;

    switch (lastLog.type) {
      case "strategist_plan":
        newProgress = 20;
        break;
      case "mission_start":
        newProgress = 30;
        break;
      case "search_query":
        newProgress = 50;
        break;
      case "search_results":
        newProgress = 70;
        break;
      case "analysis_progress":
        newProgress = 80;
        setShowReport(true); // Show report at 80%
        break;
      case "final_report":
        newProgress = 100;
        break;
    }

    setProgress(newProgress);
  }, [logs]);

  if (!ticker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">No Ticker Provided</h1>
          <p className="text-gray-400">Please provide a ticker symbol</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Deep Research: {ticker}</h1>
          <p className="text-gray-400">
            {progress < 100 ? `Research in progress... ${progress}%` : "Research complete"}
          </p>
        </div>

        {/* Progress Bar */}
        {progress < 100 && (
          <div className="mb-6">
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-red-900/20 border-red-800 mb-6">
            <CardContent className="pt-6">
              <p className="text-red-400">Error: {error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Live Log */}
          <div className="lg:col-span-1">
            <LiveLog logs={logs} />
          </div>

          {/* Right Column: Dashboard */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Card */}
            {marketData && (
              <HeroCard
                ticker={ticker}
                marketData={marketData}
                verdict={report?.verdict}
              />
            )}

            {/* Report Content - Show at 80% progress */}
            {showReport && report ? (
              <>
                {/* Narrative Section */}
                <NarrativeSection narrativeArc={report.narrative_arc} />

                {/* Competitor Table */}
                <CompetitorTable competitors={report.competitor_matrix} />

                {/* Financial Red Flags */}
                <FinancialRedFlags financialReality={report.financial_reality} />

                {/* Marginal Changes */}
                {report.marginal_changes && (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        Recent Changes (Last 3 Months)
                      </h3>
                      <div className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-yellow-500">
                        <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                          {report.marginal_changes}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Final Verdict */}
                <Card className="bg-gray-900 border-2 border-blue-500">
                  <CardContent className="pt-6">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span>⚖️</span>
                      The Verdict
                    </h3>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-lg text-gray-200 leading-relaxed">
                        {report.verdict}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              // Loading Skeleton
              <div className="space-y-6">
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-6">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="pt-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Token Badge */}
        {tokenCount > 0 && <TokenBadge tokenCount={tokenCount} />}
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ReportContent />
    </Suspense>
  );
}
