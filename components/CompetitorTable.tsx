"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Competitor {
  name: string;
  market_cap?: string;
  core_difference: string;
  resource_quality?: string;
}

interface CompetitorTableProps {
  competitors: Competitor[];
}

export function CompetitorTable({ competitors }: CompetitorTableProps) {
  if (!competitors || competitors.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white">
            Competitor Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 italic">No competitor data available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-white">
          Competitor Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">
                  Company
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">
                  Market Cap
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">
                  Core Difference
                </th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">
                  Resource Quality
                </th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((competitor, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-3 px-4 text-white font-medium">
                    {competitor.name}
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {competitor.market_cap || "N/A"}
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {competitor.core_difference}
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {competitor.resource_quality || "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

