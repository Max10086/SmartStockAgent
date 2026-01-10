"use client";

import { useLanguage } from "@/lib/i18n/context";
import { Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "cn" : "en");
  };

  return (
    <Button
      variant="outline"
      onClick={toggleLanguage}
      className={`bg-gray-900 border-gray-700 text-white hover:bg-gray-800 ${className}`}
    >
      <Globe className="w-4 h-4 mr-2" />
      {language === "en" ? "🇺🇸 EN" : "🇨🇳 中文"}
    </Button>
  );
}

interface LanguageTabsProps {
  className?: string;
}

export function LanguageTabs({ className }: LanguageTabsProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`flex items-center gap-1 bg-gray-800 rounded-lg p-1 ${className}`}>
      <button
        onClick={() => setLanguage("en")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          language === "en"
            ? "bg-blue-600 text-white"
            : "text-gray-400 hover:text-white hover:bg-gray-700"
        }`}
      >
        🇺🇸 English
      </button>
      <button
        onClick={() => setLanguage("cn")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          language === "cn"
            ? "bg-blue-600 text-white"
            : "text-gray-400 hover:text-white hover:bg-gray-700"
        }`}
      >
        🇨🇳 中文
      </button>
    </div>
  );
}

