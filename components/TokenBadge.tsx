"use client";

interface TokenBadgeProps {
  tokenCount: number;
  className?: string;
}

export function TokenBadge({ tokenCount, className }: TokenBadgeProps) {
  if (tokenCount === 0) return null;

  return (
    <div
      className={`fixed top-4 right-4 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 shadow-lg z-50 ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Token Usage:</span>
        <span className="text-sm font-semibold text-white">
          {tokenCount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

