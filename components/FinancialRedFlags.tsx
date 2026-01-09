"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FinancialReality {
  cash_burn_rate?: string;
  capex_cycle?: string;
  revenue_trend?: string;
}

interface FinancialRedFlagsProps {
  financialReality: FinancialReality;
}

export function FinancialRedFlags({ financialReality }: FinancialRedFlagsProps) {
  const hasData =
    financialReality.cash_burn_rate ||
    financialReality.capex_cycle ||
    financialReality.revenue_trend;

  if (!hasData) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <span>💰</span>
            Financial Reality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 italic">Financial analysis pending...</div>
        </CardContent>
      </Card>
    );
  }

  // Detect potential red flags in the text
  const redFlagKeywords = [
    "burn",
    "negative",
    "declining",
    "concern",
    "risk",
    "warning",
    "deficit",
    "loss",
  ];

  const hasRedFlags = (text: string) => {
    return redFlagKeywords.some((keyword) =>
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
          <span>💰</span>
          Financial Reality
        </CardTitle>
        <p className="text-sm text-gray-400 mt-2">
          Cash runway, capex cycle, and revenue trends
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {financialReality.cash_burn_rate && (
          <div
            className={`p-4 rounded-lg border-l-4 ${
              hasRedFlags(financialReality.cash_burn_rate)
                ? "bg-red-900/20 border-red-500"
                : "bg-gray-800/50 border-gray-600"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-white">Cash Burn Rate</span>
              {hasRedFlags(financialReality.cash_burn_rate) && (
                <span className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 rounded">
                  ⚠️ Red Flag
                </span>
              )}
            </div>
            <p className="text-gray-300 text-sm">
              {financialReality.cash_burn_rate}
            </p>
          </div>
        )}

        {financialReality.capex_cycle && (
          <div className="p-4 rounded-lg border-l-4 bg-gray-800/50 border-gray-600">
            <div className="text-sm font-semibold text-white mb-2">
              Capital Expenditure Cycle
            </div>
            <p className="text-gray-300 text-sm">{financialReality.capex_cycle}</p>
          </div>
        )}

        {financialReality.revenue_trend && (
          <div
            className={`p-4 rounded-lg border-l-4 ${
              hasRedFlags(financialReality.revenue_trend)
                ? "bg-red-900/20 border-red-500"
                : "bg-gray-800/50 border-gray-600"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-white">Revenue Trend</span>
              {hasRedFlags(financialReality.revenue_trend) && (
                <span className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 rounded">
                  ⚠️ Red Flag
                </span>
              )}
            </div>
            <p className="text-gray-300 text-sm">{financialReality.revenue_trend}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

