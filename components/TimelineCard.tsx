"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TimelineEvent {
  date: string;
  event: string;
  impact: "positive" | "negative" | "neutral";
}

interface TimelineCardProps {
  timeline?: TimelineEvent[];
}

export function TimelineCard({ timeline }: TimelineCardProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white">
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500 italic">No timeline events available</div>
        </CardContent>
      </Card>
    );
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "positive":
        return "bg-green-900/30 text-green-400 border-green-800/30";
      case "negative":
        return "bg-red-900/30 text-red-400 border-red-800/30";
      default:
        return "bg-gray-800 text-gray-400 border-gray-700";
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-white">
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {timeline.map((event, index) => (
            <div key={index} className="flex items-start gap-4 relative">
              {/* Timeline line */}
              {index < timeline.length - 1 && (
                <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-700" />
              )}
              
              {/* Timeline dot */}
              <div
                className={`relative z-10 w-6 h-6 rounded-full border-2 ${
                  event.impact === "positive"
                    ? "bg-green-900/30 border-green-400"
                    : event.impact === "negative"
                    ? "bg-red-900/30 border-red-400"
                    : "bg-gray-800 border-gray-400"
                } flex-shrink-0 mt-0.5`}
              />

              {/* Event content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-400">
                    {event.date}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded border ${getImpactColor(
                      event.impact
                    )}`}
                  >
                    {event.impact}
                  </span>
                </div>
                <p className="text-gray-300">{event.event}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

