"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarketQuote } from "@/lib/market-data/types";

interface HeroCardProps {
  ticker: string;
  marketData?: MarketQuote;
  verdict?: string;
}

export function HeroCard({ ticker, marketData, verdict }: HeroCardProps) {
  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-white flex items-center justify-between">
          <span>{ticker}</span>
          {marketData && (
            <div className="text-right">
              <div className="text-2xl font-bold">
                ${marketData.price.toFixed(2)}
              </div>
              <div
                className={`text-sm font-medium ${
                  marketData.change >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {marketData.change >= 0 ? "+" : ""}
                {marketData.change.toFixed(2)} (
                {marketData.changePercent >= 0 ? "+" : ""}
                {marketData.changePercent.toFixed(2)}%)
              </div>
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

