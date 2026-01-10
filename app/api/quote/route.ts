import { NextRequest, NextResponse } from "next/server";
import { getAdapterForTicker } from "@/lib/market-data";

/**
 * API Route to proxy Tencent Finance API requests
 * This avoids CORS issues when calling from the browser
 * 
 * GET /api/quote?ticker=AAPL
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json(
      { error: "Ticker parameter is required" },
      { status: 400 }
    );
  }

  try {
    const adapter = getAdapterForTicker(ticker);
    const quote = await adapter.getQuote(ticker);

    // Serialize Date object to ISO string for JSON response
    const serializedQuote = {
      ...quote,
      timestamp: quote.timestamp.toISOString(),
    };

    return NextResponse.json(serializedQuote);
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch quote",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

