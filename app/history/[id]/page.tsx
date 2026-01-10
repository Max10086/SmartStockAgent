"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DeepDiveReport } from "@/lib/research/workflow-types";
import { ResearchInvestigation } from "@/lib/research/logic-chain-types";
import { LogicChainViewer } from "@/components/LogicChainViewer";
import { CompetitorTable } from "@/components/CompetitorTable";
import { NarrativeSection } from "@/components/NarrativeSection";
import { FinancialRedFlags } from "@/components/FinancialRedFlags";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Coins, Eye, X } from "lucide-react";

interface SavedReport {
  id: string;
  ticker: string;
  language: string;
  createdAt: string;
  report: DeepDiveReport;
  investigation: ResearchInvestigation;
  totalTokens: number;
}

export default function SavedReportPage() {
  const params = useParams();
  const reportId = params.id as string;

  const [data, setData] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogicChains, setShowLogicChains] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/reports/${reportId}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch report");
      } finally {
        setLoading(false);
      }
    };

    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Skeleton className="h-[400px] w-full" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-900/20 border-red-800">
            <CardContent className="pt-6">
              <p className="text-red-400">Error: {error || "Report not found"}</p>
              <Link href="/history">
                <Button
                  variant="outline"
                  className="mt-4 bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to History
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { report, investigation } = data;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/history">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              </Link>
              <h1 className="text-3xl font-bold">
                {data.ticker} Report
              </h1>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowLogicChains(!showLogicChains)}
              className="bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
            >
              {showLogicChains ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Hide Logic Chains
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show Logic Chains
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center gap-4 text-gray-400 text-sm">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDate(data.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Coins className="w-4 h-4" />
              {data.totalTokens.toLocaleString()} tokens
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Logic Chains */}
          <div className="lg:col-span-1 space-y-6">
            {showLogicChains && investigation && (
              <LogicChainViewer chains={investigation.topicChains} />
            )}
          </div>

          {/* Right Column: Report Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Narrative Section */}
            <Card
              className="bg-gray-900 border-gray-800 cursor-pointer hover:border-gray-700 transition-colors"
              onClick={() =>
                setExpandedSection(expandedSection === "narrative" ? null : "narrative")
              }
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Narrative Arc</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedSection(expandedSection === "narrative" ? null : "narrative");
                    }}
                  >
                    {expandedSection === "narrative" ? "Hide Evidence" : "Show Evidence"}
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
                  <h3 className="text-lg font-semibold text-white">Competitor Analysis</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedSection(expandedSection === "competitors" ? null : "competitors");
                    }}
                  >
                    {expandedSection === "competitors" ? "Hide Evidence" : "Show Evidence"}
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
                  <h3 className="text-lg font-semibold text-white">Financial Reality</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedSection(expandedSection === "financial" ? null : "financial");
                    }}
                  >
                    {expandedSection === "financial" ? "Hide Evidence" : "Show Evidence"}
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
                      {expandedSection === "verdict" ? "Hide Full Investigation" : "Show Full Investigation Logic"}
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
          </div>
        </div>
      </div>
    </div>
  );
}

