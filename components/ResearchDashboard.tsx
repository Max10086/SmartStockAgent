"use client";

import { ResearchReport } from "@/lib/research/types";

interface ResearchDashboardProps {
  report: ResearchReport;
}

export function ResearchDashboard({ report }: ResearchDashboardProps) {
  return (
    <div className="space-y-6">
      {/* One-liner */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-400 mb-2">Investment Thesis</h2>
        <p className="text-xl text-white font-medium">{report.oneLiner}</p>
      </div>

      {/* Bull/Bear Points */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bull Points */}
        <div className="bg-gray-900 border border-green-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
            <span>📈</span> Bull Points
          </h3>
          <ul className="space-y-2">
            {report.bullPoints.map((point, index) => (
              <li key={index} className="text-gray-300 flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bear Points */}
        <div className="bg-gray-900 border border-red-800/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
            <span>📉</span> Bear Points
          </h3>
          <ul className="space-y-2">
            {report.bearPoints.map((point, index) => (
              <li key={index} className="text-gray-300 flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Timeline */}
      {report.timeline && report.timeline.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
          <div className="space-y-4">
            {report.timeline.map((event, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-400 mt-2" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-400">{event.date}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        event.impact === "positive"
                          ? "bg-green-900/30 text-green-400"
                          : event.impact === "negative"
                          ? "bg-red-900/30 text-red-400"
                          : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {event.impact}
                    </span>
                  </div>
                  <p className="text-gray-300">{event.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

