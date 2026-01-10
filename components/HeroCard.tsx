"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketQuote } from "@/lib/market-data/types";

interface HeroCardProps {
  ticker: string;
  marketData?: MarketQuote;
  verdict?: string;
}

function getCurrencySymbol(currency?: string): string {
  switch (currency) {
    case "CNY":
      return "¥";
    case "HKD":
      return "HK$";
    case "USD":
    default:
      return "$";
  }
}

export function HeroCard({ ticker, marketData, verdict }: HeroCardProps) {
  const currencySymbol = getCurrencySymbol(marketData?.currency);
  
  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-white flex items-center justify-between">
          <span>{ticker}</span>
          {marketData && (
            <div className="text-right">
              <div className="text-2xl font-bold">
                {currencySymbol}{marketData.price.toFixed(2)}
              </div>
              <div
                className={`text-sm font-medium ${
                  marketData.change >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {marketData.change >= 0 ? "+" : ""}
                {currencySymbol}{Math.abs(marketData.change).toFixed(2)} (
                {marketData.changePercent >= 0 ? "+" : ""}
                {marketData.changePercent.toFixed(2)}%)
              </div>
              {/* Historical changes */}
              {(marketData.change1D !== undefined || marketData.change1W !== undefined || marketData.change1M !== undefined) && (
                <div className="text-xs text-gray-400 mt-2 space-y-1">
                  {marketData.change1D !== undefined && (
                    <div>
                      1日: <span className={marketData.change1D >= 0 ? "text-green-400" : "text-red-400"}>
                        {marketData.change1D >= 0 ? "+" : ""}{marketData.change1D.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {marketData.change1W !== undefined && (
                    <div>
                      1周: <span className={marketData.change1W >= 0 ? "text-green-400" : "text-red-400"}>
                        {marketData.change1W >= 0 ? "+" : ""}{marketData.change1W.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {marketData.change1M !== undefined && (
                    <div>
                      1月: <span className={marketData.change1M >= 0 ? "text-green-400" : "text-red-400"}>
                        {marketData.change1M >= 0 ? "+" : ""}{marketData.change1M.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {verdict ? (
          <p className="text-lg text-gray-200 leading-relaxed">{verdict}</p>
        ) : (
          <div className="text-gray-400 italic">Generating verdict...</div>
        )}
      </CardContent>
    </Card>
  );
}
