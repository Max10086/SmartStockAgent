import prisma from "./index";
import {
  TopicChain,
  ResearchInvestigation,
} from "@/lib/research/logic-chain-types";
import { DeepDiveReport } from "@/lib/research/workflow-types";

/**
 * Input for saving a complete research report
 */
export interface SaveReportInput {
  ticker: string;
  language?: string;
  report: DeepDiveReport;
  investigation: ResearchInvestigation;
  totalTokens: number;
}

/**
 * Save a complete research report to the database
 */
export async function saveReport(input: SaveReportInput) {
  const { ticker, language = "en", report, investigation, totalTokens } = input;

  // Create report with nested chains and nodes
  const savedReport = await prisma.report.create({
    data: {
      ticker: ticker.toUpperCase(),
      language,
      summary: report.verdict,
      narrativeArc: report.narrative_arc,
      marginalChanges: report.marginal_changes,
      verdict: report.verdict,
      financialReality: JSON.stringify(report.financial_reality),
      competitorMatrix: JSON.stringify(report.competitor_matrix),
      totalTokens,
      chains: {
        create: investigation.topicChains.map((chain, chainIndex) => ({
          topic: chain.topic,
          orderIndex: chainIndex,
          nodes: {
            create: chain.chain.map((node, nodeIndex) => ({
              stepName: node.step_name,
              intent: node.intent,
              questions: JSON.stringify(node.questions),
              findings: JSON.stringify(node.findings),
              reasoning: node.reasoning,
              orderIndex: nodeIndex,
              rawSearchResults: null, // Can be populated if needed
            })),
          },
        })),
      },
    },
    include: {
      chains: {
        include: {
          nodes: true,
        },
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
  });

  return savedReport;
}

/**
 * Get a report by ID with all chains and nodes
 */
export async function getReportById(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      chains: {
        include: {
          nodes: {
            orderBy: {
              orderIndex: "asc",
            },
          },
        },
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
  });

  return report;
}

/**
 * Get all reports for a ticker
 */
export async function getReportsByTicker(ticker: string) {
  const reports = await prisma.report.findMany({
    where: { ticker: ticker.toUpperCase() },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      chains: {
        include: {
          nodes: {
            orderBy: {
              orderIndex: "asc",
            },
          },
        },
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
  });

  return reports;
}

/**
 * Get the most recent report for a ticker
 */
export async function getLatestReportByTicker(ticker: string) {
  const report = await prisma.report.findFirst({
    where: { ticker: ticker.toUpperCase() },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      chains: {
        include: {
          nodes: {
            orderBy: {
              orderIndex: "asc",
            },
          },
        },
        orderBy: {
          orderIndex: "asc",
        },
      },
    },
  });

  return report;
}

/**
 * Get all reports (paginated)
 */
export async function getAllReports(page: number = 1, pageSize: number = 10) {
  const skip = (page - 1) * pageSize;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      skip,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        ticker: true,
        language: true,
        summary: true,
        totalTokens: true,
        createdAt: true,
        _count: {
          select: { chains: true },
        },
      },
    }),
    prisma.report.count(),
  ]);

  return {
    reports,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Delete a report by ID
 */
export async function deleteReport(reportId: string) {
  return prisma.report.delete({
    where: { id: reportId },
  });
}

/**
 * Convert a database report back to the application types
 */
export function dbReportToAppTypes(dbReport: Awaited<ReturnType<typeof getReportById>>) {
  if (!dbReport) return null;

  const report: DeepDiveReport = {
    narrative_arc: dbReport.narrativeArc || "",
    competitor_matrix: dbReport.competitorMatrix
      ? JSON.parse(dbReport.competitorMatrix)
      : [],
    financial_reality: dbReport.financialReality
      ? JSON.parse(dbReport.financialReality)
      : {},
    marginal_changes: dbReport.marginalChanges || "",
    verdict: dbReport.verdict || "",
  };

  const investigation: ResearchInvestigation = {
    ticker: dbReport.ticker,
    topicChains: dbReport.chains.map((chain) => ({
      topic: chain.topic,
      chain: chain.nodes.map((node) => ({
        id: node.id,
        step_name: node.stepName,
        intent: node.intent,
        questions: JSON.parse(node.questions),
        findings: JSON.parse(node.findings),
        reasoning: node.reasoning,
        next_logic_step: null,
      })),
    })),
    totalNodes: dbReport.chains.reduce(
      (sum, chain) => sum + chain.nodes.length,
      0
    ),
    completedNodes: dbReport.chains.reduce(
      (sum, chain) =>
        sum +
        chain.nodes.filter((node) => {
          const findings = JSON.parse(node.findings);
          return Array.isArray(findings) && findings.length > 0;
        }).length,
      0
    ),
  };

  return {
    report,
    investigation,
    totalTokens: dbReport.totalTokens,
    createdAt: dbReport.createdAt,
  };
}

