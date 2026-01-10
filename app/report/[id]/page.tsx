"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSavedReport } from "@/app/actions/report-actions";
import { MarketQuote } from "@/lib/market-data";
import { DeepDiveReport, StreamLog } from "@/lib/research/workflow-types";
import { ResearchInvestigation, TopicChain } from "@/lib/research/logic-chain-types";
import { readStreamableValue } from "@/lib/ai/stream-helper";
import { ResearchState } from "@/app/actions/research-v3";
import { useLanguage } from "@/lib/i18n/context";
import { Language } from "@/lib/i18n";
import { HeroCard } from "@/components/HeroCard";
import { LiveLog } from "@/components/LiveLog";
import { LogicChainViewer } from "@/components/LogicChainViewer";
import { CompetitorTable } from "@/components/CompetitorTable";
import { NarrativeSection } from "@/components/NarrativeSection";
import { FinancialRedFlags } from "@/components/FinancialRedFlags";
import { TokenBadge } from "@/components/TokenBadge";
import { LanguageTabs } from "@/components/LanguageToggle";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, X, ArrowLeft } from "lucide-react";
import Link from "next/link";

function ReportContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  // Get ID or Ticker from URL
  const rawParam = (params.id as string) || "";
  const paramValue = decodeURIComponent(rawParam);
  
  // Check if it's likely a UUID (saved report)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramValue);
  
  const urlLang = searchParams.get("lang") as Language | null;
  const { language: contextLang, t } = useLanguage();
  
  // Use URL param if available, otherwise use context
  const language: Language = urlLang === "en" || urlLang === "cn" ? urlLang : contextLang;

  const [logs, setLogs] = useState<StreamLog[]>([]);
  const [progress, setProgress] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [marketData, setMarketData] = useState<MarketQuote | null>(null);
  const [report, setReport] = useState<DeepDiveReport | null>(null);
  const [investigation, setInvestigation] = useState<ResearchInvestigation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showLogicChains, setShowLogicChains] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [ticker, setTicker] = useState<string>(isUuid ? "" : paramValue);

  // Effect to load data (either saved report or running new research)
  useEffect(() => {
    if (!paramValue) return;

    const loadData = async () => {
      try {
        if (isUuid) {
          // Load saved report
          const savedData = await getSavedReport(paramValue);
          
          if (savedData) {
            setReport(savedData.report);
            setInvestigation(savedData.investigation);
            setTokenCount(savedData.totalTokens);
            setTicker(savedData.investigation.ticker);
            setProgress(100);
            setShowReport(true);
            
            // Add a log to indicate loaded from history
            setLogs([
              {
                type: "final_report",
                message: language === "cn" ? "已加载历史报告" : "Loaded saved report",
                timestamp: new Date(savedData.createdAt),
              }
            ]);
            
            // Fetch market data for the ticker found in the report
            fetchMarketData(savedData.investigation.ticker);
          } else {
            setError("Report not found");
          }
        } else {
          // Run new research
          await startNewResearch(paramValue);
        }
      } catch (err) {
        console.error("Error loading report:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    loadData();
  }, [paramValue, isUuid, language]);

  const fetchMarketData = async (tickerSymbol: string) => {
    try {
      const quoteResponse = await fetch(`/api/quote?ticker=${encodeURIComponent(tickerSymbol)}`);
      if (!quoteResponse.ok) {
        throw new Error("Failed to fetch market data");
      }
      const marketDataResult = await quoteResponse.json();
      if (marketDataResult.timestamp) {
        marketDataResult.timestamp = new Date(marketDataResult.timestamp);
      }
      setMarketData(marketDataResult);
    } catch (fetchError) {
      console.error("Error fetching market data:", fetchError);
      // Non-fatal error
    }
  };


  const startNewResearch = async (tickerSymbol: string) => {
    // Fetch market data first
    fetchMarketData(tickerSymbol);

    // Add initial log
    const startMessage = language === "cn" 
      ? `正在启动 ${tickerSymbol} 的深度逻辑链研究...`
      : `Starting deep research with logical chains for ${tickerSymbol}...`;
    setLogs([
      {
        type: "strategist_plan",
        message: startMessage,
        timestamp: new Date(),
      },
    ]);

    try {
      // Run deep research V3 with streaming via API
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: tickerSymbol, lang: language }),
      });

      if (!response.ok || !response.body) {
        throw new Error(response.statusText || "Failed to start research");
      }

      for await (const state of readStreamableValue<ResearchState>(response.body)) {
        if (!state) continue;

        if (state.logs) {
          setLogs(state.logs);
        }

        if (state.status === "error") {
          setError(state.error || "Unknown error");
          break;
        }

        // Construct investigation object for progressive rendering
        if (state.plan) {
          const mergedChains: TopicChain[] = state.plan.map((plannedChain: TopicChain) => {
            const completed = state.completedChains.find((c: TopicChain) => c.topic === plannedChain.topic);
            return completed || plannedChain;
          });

          const totalNodes = state.plan.reduce((sum: number, c: TopicChain) => sum + c.chain.length, 0);
          const completedNodes = state.completedChains.reduce(
            (sum: number, c: TopicChain) => 
              sum + c.chain.filter((n: any) => n.findings.length > 0).length, 
            0
          );

          const currentInvestigation: ResearchInvestigation = {
            ticker: tickerSymbol,
            topicChains: mergedChains,
            totalNodes,
            completedNodes,
          };
          
          setInvestigation(currentInvestigation);
        }

        if (state.status === "completed" && state.report && state.investigation) {
          setProgress(100);
          setReport(state.report);
          setInvestigation(state.investigation);
          setTokenCount(state.totalTokens || 0);
          setShowReport(true);
        }
      }
    } catch (err) {
      console.error("Error in research stream:", err);
      setError(err instanceof Error ? err.message : "Stream error");
    }
  };

  // Simulate progress updates based on logs and investigation
  useEffect(() => {
    if (investigation) {
      const progressValue = investigation.totalNodes > 0
        ? (investigation.completedNodes / investigation.totalNodes) * 100
        : 0;
      setProgress(Math.min(progressValue, 100));
      
      // Show report at 80% completion
      if (progressValue >= 80) {
        setShowReport(true);
      }
    } else if (logs.length > 0) {
      const lastLog = logs[logs.length - 1];
      let newProgress = 0;

      switch (lastLog.type) {
        case "strategist_plan":
          newProgress = 10;
          break;
        case "mission_start":
          newProgress = 20;
          break;
        case "search_query":
          newProgress = 40;
          break;
        case "search_results":
          newProgress = 60;
          break;
        case "analysis_progress":
          newProgress = 80;
          setShowReport(true);
          break;
        case "final_report":
          newProgress = 100;
          break;
      }

      setProgress(newProgress);
    }
  }, [logs, investigation]);

  // Show loading state while initializing
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Mark as initialized after component mounts
    setIsInitializing(false);
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!ticker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{t("noTickerProvided")}</h1>
          <p className="text-gray-400">{t("pleaseProvideTicker")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  {language === "cn" ? "返回" : "Back"}
                </Button>
              </Link>
              <h1 className="text-3xl font-bold">{t("deepResearch")}: {marketData?.name || ticker}</h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageTabs />
              <Button
                variant="outline"
                onClick={() => setShowLogicChains(!showLogicChains)}
                className="bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
              >
                {showLogicChains ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    {t("hideLogicChains")}
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    {t("showLogicChains")}
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="text-gray-400">
            {progress < 100
              ? `${t("researchInProgress")} ${Math.round(progress)}%`
              : t("researchComplete")}
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
          {/* Left Column: Logic Chains or Live Log */}
          <div className="lg:col-span-1 space-y-6">
            {showLogicChains && investigation ? (
              <LogicChainViewer chains={investigation.topicChains} />
            ) : (
              <LiveLog logs={logs} />
            )}
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
                {/* Narrative Section - Clickable to show evidence */}
                <Card
                  className="bg-gray-900 border-gray-800 cursor-pointer hover:border-gray-700 transition-colors"
                  onClick={() =>
                    setExpandedSection(expandedSection === "narrative" ? null : "narrative")
                  }
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">{t("narrativeArc")}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSection(expandedSection === "narrative" ? null : "narrative");
                        }}
                      >
                        {expandedSection === "narrative" ? t("hideEvidence") : t("showEvidence")}
                      </Button>
                    </div>
                    <NarrativeSection narrativeArc={report.narrative_arc} />
                    {expandedSection === "narrative" && investigation && (
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <LogicChainViewer chains={investigation.topicChains} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Competitor Table */}
                <Card
                  className="bg-gray-900 border-gray-800 cursor-pointer hover:border-gray-700 transition-colors"
                  onClick={() =>
                    setExpandedSection(expandedSection === "competitors" ? null : "competitors")
                  }
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">{t("competitorAnalysis")}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSection(expandedSection === "competitors" ? null : "competitors");
                        }}
                      >
                        {expandedSection === "competitors" ? t("hideEvidence") : t("showEvidence")}
                      </Button>
                    </div>
                    <CompetitorTable competitors={report.competitor_matrix} />
                    {expandedSection === "competitors" && investigation && (
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <LogicChainViewer chains={investigation.topicChains} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Financial Red Flags */}
                <Card
                  className="bg-gray-900 border-gray-800 cursor-pointer hover:border-gray-700 transition-colors"
                  onClick={() =>
                    setExpandedSection(expandedSection === "financial" ? null : "financial")
                  }
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">{t("financialReality")}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSection(expandedSection === "financial" ? null : "financial");
                        }}
                      >
                        {expandedSection === "financial" ? t("hideEvidence") : t("showEvidence")}
                      </Button>
                    </div>
                    <FinancialRedFlags financialReality={report.financial_reality} />
                    {expandedSection === "financial" && investigation && (
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <LogicChainViewer chains={investigation.topicChains} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Marginal Changes */}
                {report.marginal_changes && (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        {t("recentChanges")}
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
                      {t("theVerdict")}
                    </h3>
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-lg text-gray-200 leading-relaxed">{report.verdict}</p>
                    </div>
                    {investigation && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <Button
                          variant="outline"
                          onClick={() =>
                            setExpandedSection(expandedSection === "verdict" ? null : "verdict")
                          }
                          className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                        >
                          {expandedSection === "verdict" ? t("hideFullInvestigation") : t("showFullInvestigation")}
                        </Button>
                        {expandedSection === "verdict" && (
                          <div className="mt-4">
                            <LogicChainViewer chains={investigation.topicChains} />
                          </div>
                        )}
                      </div>
                    )}
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
