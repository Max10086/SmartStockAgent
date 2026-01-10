"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LanguageTabs } from "@/components/LanguageToggle";
import { useLanguage } from "@/lib/i18n/context";
import { History } from "lucide-react";
import { resolveUserQuery } from "@/app/actions/resolve-input";

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(""); // New state for granular status
  const router = useRouter();
  const { language, t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() || isLoading) return;

    setIsLoading(true);
    setStatusMessage(t("identifying") || "Identifying targets..."); // Add translation key later or fallback

    try {
      const result = await resolveUserQuery(ticker);
      
      if (result.error || !result.candidates || result.candidates.length === 0) {
        // Fallback or error
        console.error("Resolution failed:", result.error);
        alert("Could not identify a valid company. Please try a ticker symbol.");
        setIsLoading(false);
        setStatusMessage("");
        return;
      }

      // Option A: Pick top candidate
      const bestMatch = result.candidates[0];
      const symbol = bestMatch.symbol;
      
      setStatusMessage(`Analyzing ${bestMatch.name} (${symbol})...`);
      
      // Encode ticker for URL
      const encodedTicker = encodeURIComponent(symbol);
      router.push(`/report/${encodedTicker}?lang=${language}`);
      
    } catch (err) {
      console.error("Search error:", err);
      setIsLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-black relative">
      {/* Top Right Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <LanguageTabs />
        <Link href="/history">
          <Button
            variant="outline"
            className="bg-gray-900 border-gray-700 text-white hover:bg-gray-800"
          >
            <History className="w-4 h-4 mr-2" />
            {t("history")}
          </Button>
        </Link>
      </div>

      <div className="text-center mb-12 max-w-2xl">
        <h1 className="text-6xl font-bold mb-4 text-white">{t("title")}</h1>
        <p className="text-xl text-gray-400 mb-2">{t("subtitle")}</p>
        <p className="text-sm text-gray-500">{t("description")}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <div className="flex gap-3">
          <Input
            type="text"
            value={ticker}
            onChange={(e) => {
              // Allow free input - don't modify Chinese characters
              // Only convert to uppercase on blur or submit for non-Chinese text
              setTicker(e.target.value);
            }}
            onBlur={(e) => {
              // Only uppercase non-Chinese text when losing focus
              const value = e.target.value;
              if (value && !/[\u4e00-\u9fa5]/.test(value)) {
                setTicker(value.toUpperCase());
              }
            }}
            placeholder="Enter Ticker, Company Name, or Investment Theme..."
            className="flex-1 h-14 text-lg bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !ticker.trim()}
            className="h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (statusMessage || "...") : t("research")}
          </Button>
        </div>
      </form>

      <p className="mt-8 text-sm text-gray-500 text-center">{t("enterTicker")}</p>
    </main>
  );
}

