import { NextRequest, NextResponse } from "next/server";
import {
  getAllReports,
  getReportsByTicker,
} from "@/lib/db/report-service";

/**
 * GET /api/reports
 * 
 * Query params:
 * - ticker: Filter by ticker symbol
 * - page: Page number (default: 1)
 * - pageSize: Number of items per page (default: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get("ticker");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);

    if (ticker) {
      // Get reports for specific ticker
      const reports = await getReportsByTicker(ticker);
      return NextResponse.json({
        success: true,
        data: reports,
        count: reports.length,
      });
    }

    // Get paginated list of all reports
    const result = await getAllReports(page, pageSize);
    return NextResponse.json({
      success: true,
      data: result.reports,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

