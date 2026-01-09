"use client";

import { useEffect, useRef } from "react";
import { StreamLog } from "@/lib/research/workflow-types";

interface LiveLogProps {
  logs: StreamLog[];
  className?: string;
}

export function LiveLog({ logs, className }: LiveLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const getLogPrefix = (type: StreamLog["type"]) => {
    switch (type) {
      case "strategist_plan":
        return "[PLANNING]";
      case "mission_start":
        return "[MISSION]";
      case "search_query":
        return "[SEARCH]";
      case "search_results":
        return "[READING]";
      case "analysis_progress":
        return "[ANALYZING]";
      case "final_report":
        return "[COMPLETE]";
      default:
        return "[INFO]";
    }
  };

  const getLogColor = (type: StreamLog["type"]) => {
    switch (type) {
      case "strategist_plan":
        return "text-blue-400";
      case "mission_start":
        return "text-purple-400";
      case "search_query":
        return "text-yellow-400";
      case "search_results":
        return "text-green-400";
      case "analysis_progress":
        return "text-cyan-400";
      case "final_report":
        return "text-emerald-400";
      default:
        return "text-gray-400";
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div
      className={`bg-black border border-gray-800 rounded-lg font-mono text-sm overflow-hidden ${className}`}
    >
      {/* Terminal Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-gray-400 text-xs ml-2">Research Terminal</span>
      </div>

      {/* Log Content */}
      <div className="h-[500px] overflow-y-auto p-4 space-y-1">
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">Waiting for research to start...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex gap-3 items-start">
              <span className="text-gray-600 text-xs flex-shrink-0">
                {formatTime(log.timestamp)}
              </span>
              <span className={`${getLogColor(log.type)} flex-shrink-0 font-semibold`}>
                {getLogPrefix(log.type)}
              </span>
              <span className="text-gray-300 flex-1">
                {log.message}
                {log.data && log.type === "search_results" && (
                  <div className="mt-1 ml-4 text-gray-400 text-xs">
                    {log.data.results?.map((r: any, i: number) => (
                      <div key={i} className="truncate">
                        • {r.title}
                      </div>
                    ))}
                  </div>
                )}
                {log.data && log.type === "strategist_plan" && log.data.sector && (
                  <div className="mt-1 ml-4 text-gray-400 text-xs">
                    Sector: {log.data.sector}
                    {log.data.peerGroup && log.data.peerGroup.length > 0 && (
                      <div>Peers: {log.data.peerGroup.join(", ")}</div>
                    )}
                  </div>
                )}
              </span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

