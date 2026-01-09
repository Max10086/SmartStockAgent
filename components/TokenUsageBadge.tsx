"use client";

import { TokenUsage } from "@/lib/google-ai";

interface TokenUsageBadgeProps {
  usage: TokenUsage;
  className?: string;
}

export function TokenUsageBadge({ usage, className }: TokenUsageBadgeProps) {
  const totalTokens = usage.inputTokens + usage.outputTokens;

  return (
    <div
      className={`fixed bottom-4 right-4 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 shadow-lg z-50 ${className}`}
    >
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-gray-400">Session Cost:</span>
          <span className="ml-2 font-semibold text-white">
            {totalTokens.toLocaleString()} Tokens
          </span>
        </div>
        <div className="h-4 w-px bg-gray-600" />
        <div className="text-xs text-gray-500">
          <span>In: {usage.inputTokens.toLocaleString()}</span>
          <span className="mx-1">•</span>
          <span>Out: {usage.outputTokens.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

