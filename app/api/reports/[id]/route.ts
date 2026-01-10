import { NextRequest, NextResponse } from "next/server";
import {
  getReportById,
  deleteReport,
  dbReportToAppTypes,
} from "@/lib/db/report-service";

/**
 * GET /api/reports/[id]
 * 
 * Get a specific report by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = await getReportById(id);

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: "Report not found",
        },
        { status: 404 }
      );
    }

    // Convert to application types
    const appData = dbReportToAppTypes(report);

    return NextResponse.json({
      success: true,
      data: {
        id: report.id,
        ticker: report.ticker,
        language: report.language,
        createdAt: report.createdAt,
        ...appData,
      },
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports/[id]
 * 
 * Delete a report by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteReport(id);

    return NextResponse.json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

