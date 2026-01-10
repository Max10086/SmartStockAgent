
import { runDeepResearchV3 } from "@/app/actions/research-v3";
import { type NextRequest } from "next/server";

export const maxDuration = 300; // 5 minutes max duration for research

export async function POST(req: NextRequest) {
  try {
    const { ticker, lang } = await req.json();

    if (!ticker) {
      return new Response("Ticker is required", { status: 400 });
    }

    // Call research logic (now running as standard function on server)
    const { output } = await runDeepResearchV3(ticker, lang || "en");

    // Return the stream directly
    return new Response(output.stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in research API:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
