"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NarrativeSectionProps {
  narrativeArc: string;
}

export function NarrativeSection({ narrativeArc }: NarrativeSectionProps) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
          <span>📖</span>
          Narrative Arc
        </CardTitle>
        <p className="text-sm text-gray-400 mt-2">
          The market story vs. the underlying reality
        </p>
      </CardHeader>
      <CardContent>
        <div className="prose prose-invert max-w-none">
          <div className="bg-gray-800/50 rounded-lg p-4 border-l-4 border-blue-500">
            <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
              {narrativeArc || "Narrative analysis pending..."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

