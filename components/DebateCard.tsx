"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DebateCardProps {
  bullPoints: string[];
  bearPoints: string[];
}

export function DebateCard({ bullPoints, bearPoints }: DebateCardProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Bull Case */}
      <Card className="bg-gray-900 border-green-800/30">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-green-400 flex items-center gap-2">
            <span className="text-2xl">📈</span>
            Bull Case
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bullPoints.length > 0 ? (
            <ul className="space-y-3">
              {bullPoints.map((point, index) => (
                <li
                  key={index}
                  className="text-gray-300 flex items-start gap-3"
                >
                  <span className="text-green-400 mt-1 font-bold">•</span>
                  <span className="flex-1">{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500 italic">No bull points available</div>
          )}
        </CardContent>
      </Card>

      {/* Bear Case */}
      <Card className="bg-gray-900 border-red-800/30">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-red-400 flex items-center gap-2">
            <span className="text-2xl">📉</span>
            Bear Case
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bearPoints.length > 0 ? (
            <ul className="space-y-3">
              {bearPoints.map((point, index) => (
                <li
                  key={index}
                  className="text-gray-300 flex items-start gap-3"
                >
                  <span className="text-red-400 mt-1 font-bold">•</span>
                  <span className="flex-1">{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500 italic">No bear points available</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

