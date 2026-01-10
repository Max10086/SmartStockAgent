"use client";

import { TopicChain, ResearchNode } from "@/lib/research/logic-chain-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Search, Lightbulb, FileText, ArrowDown } from "lucide-react";
import { useState } from "react";

interface LogicChainViewerProps {
  chains: TopicChain[];
  className?: string;
}

/**
 * Get emoji for topic type
 */
function getTopicEmoji(topic: string): string {
  const lowerTopic = topic.toLowerCase();
  if (lowerTopic.includes("competit") || lowerTopic.includes("rival")) return "⚔️";
  if (lowerTopic.includes("financial") || lowerTopic.includes("cash") || lowerTopic.includes("revenue")) return "💰";
  if (lowerTopic.includes("market") || lowerTopic.includes("size")) return "📊";
  if (lowerTopic.includes("technology") || lowerTopic.includes("tech")) return "🔬";
  if (lowerTopic.includes("regulatory") || lowerTopic.includes("policy")) return "⚖️";
  if (lowerTopic.includes("supply") || lowerTopic.includes("chain")) return "🔗";
  return "📋";
}

/**
 * Research Node Card Component
 */
function ResearchNodeCard({ node, isLast }: { node: ResearchNode; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasFindings = node.findings && node.findings.length > 0;
  const hasReasoning = node.reasoning && node.reasoning.length > 0;

  return (
    <div className="relative">
      {/* Node Card */}
      <Card
        className={`bg-gray-900 border-gray-700 hover:border-gray-600 transition-all cursor-pointer ${
          hasFindings ? "border-l-4 border-l-blue-500" : "border-l-4 border-l-gray-600"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            {/* Status Indicator */}
            <div className="flex-shrink-0 mt-1">
              {hasFindings ? (
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gray-500 animate-pulse"></div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Step Name */}
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold text-white">{node.step_name}</h4>
                {hasFindings && (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                    {node.findings.length} facts
                  </Badge>
                )}
                <button className="ml-auto text-gray-400 hover:text-white">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {/* Intent */}
              {node.intent && (
                <p className="text-xs text-gray-400 mb-2 flex items-start gap-1">
                  <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span className="italic">{node.intent}</span>
                </p>
              )}

              {/* Questions Preview */}
              {node.questions && node.questions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {node.questions.slice(0, 2).map((q, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-gray-800 px-2 py-1 rounded flex items-center gap-1 text-gray-300"
                    >
                      <Search className="w-3 h-3" />
                      <span className="truncate max-w-[200px]">{q}</span>
                    </div>
                  ))}
                  {node.questions.length > 2 && (
                    <div className="text-xs text-gray-500 px-2 py-1">
                      +{node.questions.length - 2} more
                    </div>
                  )}
                </div>
              )}

              {/* Expanded Content */}
              {isExpanded && (
                <div className="mt-3 space-y-3 pt-3 border-t border-gray-800">
                  {/* All Questions */}
                  {node.questions && node.questions.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                        <Search className="w-3 h-3" />
                        Search Queries
                      </div>
                      <div className="space-y-1">
                        {node.questions.map((q, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-gray-800/50 px-2 py-1.5 rounded text-gray-300"
                          >
                            {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Findings */}
                  {hasFindings && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Evidence ({node.findings.length} facts)
                      </div>
                      <div className="space-y-2">
                        {node.findings.map((finding, idx) => (
                          <EvidenceCard key={idx} finding={finding} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reasoning */}
                  {hasReasoning && (
                    <div>
                      <div className="text-xs font-semibold text-gray-400 mb-2">Deduction</div>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-sm text-gray-200 leading-relaxed">{node.reasoning}</p>
                      </div>
                    </div>
                  )}

                  {/* Next Logic Step */}
                  {node.next_logic_step && (
                    <div className="text-xs text-gray-500 italic">
                      → Next: {node.next_logic_step}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connector Line */}
      {!isLast && (
        <div className="flex justify-center my-2">
          <div className="w-0.5 h-6 bg-gray-700"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Evidence Card Component
 */
function EvidenceCard({ finding }: { finding: string }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-2.5 hover:bg-gray-800 transition-colors">
      <p className="text-xs text-gray-200 leading-relaxed">{finding}</p>
    </div>
  );
}

/**
 * Topic Chain Component
 */
function TopicChainCard({ chain, index }: { chain: TopicChain; index: number }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const completedNodes = chain.chain.filter((node) => node.findings && node.findings.length > 0).length;
  const totalNodes = chain.chain.length;
  const progress = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;

  return (
    <Card className="bg-gray-900/50 border-gray-800 mb-4">
      <CardHeader
        className="pb-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getTopicEmoji(chain.topic)}</span>
            <div>
              <CardTitle className="text-lg text-white">{chain.topic}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-xs text-gray-400">
                  {completedNodes}/{totalNodes} steps completed
                </div>
                <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <button className="text-gray-400 hover:text-white">
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          <div className="space-y-0">
            {chain.chain.map((node, nodeIndex) => (
              <ResearchNodeCard
                key={node.id}
                node={node}
                isLast={nodeIndex === chain.chain.length - 1}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Main Logic Chain Viewer Component
 */
export function LogicChainViewer({ chains, className }: LogicChainViewerProps) {
  if (!chains || chains.length === 0) {
    return (
      <Card className={`bg-gray-900 border-gray-800 ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-400 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p>Generating investigation chains...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalNodes = chains.reduce((sum, chain) => sum + chain.chain.length, 0);
  const completedNodes = chains.reduce(
    (sum, chain) => sum + chain.chain.filter((node) => node.findings && node.findings.length > 0).length,
    0
  );

  return (
    <div className={className}>
      {/* Summary Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Investigation Logic Chains</h3>
          <p className="text-sm text-gray-400">
            {chains.length} topics • {completedNodes}/{totalNodes} steps completed
          </p>
        </div>
      </div>

      {/* Chains */}
      <div className="space-y-4">
        {chains.map((chain, index) => (
          <TopicChainCard key={index} chain={chain} index={index} />
        ))}
      </div>
    </div>
  );
}

