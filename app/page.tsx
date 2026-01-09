"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() || isLoading) return;

    setIsLoading(true);
    const normalizedTicker = ticker.trim().toUpperCase();
    router.push(`/report/${normalizedTicker}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-black">
      <div className="text-center mb-12 max-w-2xl">
        <h1 className="text-6xl font-bold mb-4 text-white">Narrative Alpha</h1>
        <p className="text-xl text-gray-400 mb-2">
          AI-powered investment research dashboard
        </p>
        <p className="text-sm text-gray-500">
          Get deep insights into stocks with autonomous AI analysis
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <div className="flex gap-3">
          <Input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Enter Ticker (e.g., AAPL, NVDA, TSLA)..."
            className="flex-1 h-14 text-lg bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !ticker.trim()}
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "..." : "Research"}
          </Button>
        </div>
      </form>

      <p className="mt-8 text-sm text-gray-500 text-center">
        Enter a stock ticker to begin AI-powered research analysis
      </p>
    </main>
  );
}

