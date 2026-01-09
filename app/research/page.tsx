"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { runCompleteResearch } from "@/app/actions/research";
import { ResearchStep, ResearchStepStatus } from "@/lib/research/types";
import { TokenUsage } from "@/lib/google-ai";
import { ResearchLog } from "@/components/ResearchLog";
import { ResearchDashboard } from "@/components/ResearchDashboard";
import { TokenUsageBadge } from "@/components/TokenUsageBadge";
import { ResearchReport } from "@/lib/research/types";

function ResearchContent() {
  const searchParams = useSearchParams();
  const ticker = searchParams.get("ticker") || "";

  const [steps, setSteps] = useState<
    Array<{
      step: ResearchStep;
      status: ResearchStepStatus;
      message?: string;
    }>
  >([
    { step: ResearchStep.GenerateQuestions, status: ResearchStepStatus.Pending },
    { step: ResearchStep.FetchData, status: ResearchStepStatus.Pending },
    { step: ResearchStep.AnalyzeFundamentals, status: ResearchStepStatus.Pending },
    { step: ResearchStep.GenerateReport, status: ResearchStepStatus.Pending },
  ]);

  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    inputTokens: 0,
    outputTokens: 0,
  });

  const [report, setReport] = useState<ResearchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!ticker) {
      setError("No ticker provided");
      return;
    }

    const runResearch = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Generate Questions
        setSteps((prev) =>
          prev.map((s) =>
            s.step === ResearchStep.GenerateQuestions
              ? { ...s, status: ResearchStepStatus.InProgress, message: "Creating research questions..." }
              : s
          )
        );

        // Simulate step-by-step execution
        const result = await runCompleteResearch(ticker);

        // Update all steps to completed
        setSteps((prev) =>
          prev.map((s) => ({
            ...s,
            status: ResearchStepStatus.Completed,
            message: "Completed",
          }))
        );

        setReport(result.report);
        setTokenUsage(result.totalUsage);
      } catch (err) {
        console.error("Research error:", err);
        setError(err instanceof Error ? err.message : "Failed to complete research");
        setSteps((prev) =>
          prev.map((s) =>
            s.status === ResearchStepStatus.InProgress
              ? { ...s, status: ResearchStepStatus.Error, message: "Error occurred" }
              : s
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    runResearch();
  }, [ticker]);

  if (!ticker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">No Ticker Provided</h1>
          <p className="text-gray-400">Please provide a ticker symbol in the URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Research: {ticker}</h1>
          <p className="text-gray-400">
            {isLoading ? "Analyzing..." : report ? "Analysis Complete" : "Starting research..."}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Research Log */}
          <div className="lg:col-span-1">
            <ResearchLog steps={steps} />
          </div>

          {/* Right Column: Dashboard */}
          <div className="lg:col-span-2">
            {report ? (
              <ResearchDashboard report={report} />
            ) : isLoading ? (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Generating research report...</p>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
                <p className="text-gray-400">Waiting to start research...</p>
              </div>
            )}
          </div>
        </div>

        {/* Token Usage Badge */}
        {(tokenUsage.inputTokens > 0 || tokenUsage.outputTokens > 0) && (
          <TokenUsageBadge usage={tokenUsage} />
        )}
      </div>
    </div>
  );
}

export default function ResearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <ResearchContent />
    </Suspense>
  );
}

