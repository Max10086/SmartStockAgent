"use client";

import { ResearchStep, ResearchStepStatus } from "@/lib/research/types";

interface ResearchLogProps {
  steps: Array<{
    step: ResearchStep;
    status: ResearchStepStatus;
    message?: string;
  }>;
}

const stepLabels: Record<ResearchStep, string> = {
  [ResearchStep.GenerateQuestions]: "Generating Research Questions",
  [ResearchStep.FetchData]: "Fetching Market Data",
  [ResearchStep.AnalyzeFundamentals]: "Analyzing Fundamentals",
  [ResearchStep.GenerateReport]: "Generating Final Report",
};

const statusIcons: Record<ResearchStepStatus, string> = {
  [ResearchStepStatus.Pending]: "○",
  [ResearchStepStatus.InProgress]: "⟳",
  [ResearchStepStatus.Completed]: "✓",
  [ResearchStepStatus.Error]: "✗",
};

const statusColors: Record<ResearchStepStatus, string> = {
  [ResearchStepStatus.Pending]: "text-gray-500",
  [ResearchStepStatus.InProgress]: "text-blue-400 animate-spin",
  [ResearchStepStatus.Completed]: "text-green-400",
  [ResearchStepStatus.Error]: "text-red-400",
};

export function ResearchLog({ steps }: ResearchLogProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-white">Research Log</h2>
      <div className="space-y-4">
        {steps.map((stepInfo, index) => (
          <div key={stepInfo.step} className="flex items-start gap-3">
            <div
              className={`text-xl ${statusColors[stepInfo.status]} mt-0.5`}
            >
              {statusIcons[stepInfo.status]}
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">
                {stepLabels[stepInfo.step]}
              </div>
              {stepInfo.message && (
                <div className="text-sm text-gray-400 mt-1">
                  {stepInfo.message}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

