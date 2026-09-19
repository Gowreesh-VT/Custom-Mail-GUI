"use client";

import * as React from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CodeTabItem {
  language: string; // e.g. "cURL", "TypeScript", "Python"
  code: string;
  filename?: string;
}

interface CodeTabsProps {
  tabs: CodeTabItem[];
  defaultTab?: string;
  className?: string;
}

export function CodeTabs({ tabs, defaultTab, className = "" }: CodeTabsProps) {
  const [activeTab, setActiveTab] = React.useState<string>(
    defaultTab || tabs[0]?.language || "cURL"
  );
  const [copied, setCopied] = React.useState(false);

  const currentTab = tabs.find((t) => t.language === activeTab) || tabs[0];

  const handleCopy = async () => {
    if (!currentTab) return;
    try {
      await navigator.clipboard.writeText(currentTab.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-950/90 overflow-hidden shadow-xl ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/50 px-3 py-1.5 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 mr-2 text-zinc-500">
            <Terminal className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-mono text-zinc-400">
              {currentTab?.filename || "example"}
            </span>
          </div>

          <div className="flex items-center bg-zinc-950/60 p-0.5 rounded-lg border border-zinc-800/60">
            {tabs.map((tab) => (
              <button
                key={tab.language}
                onClick={() => setActiveTab(tab.language)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  activeTab === tab.language
                    ? "bg-primary/20 text-primary font-semibold shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                {tab.language}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/80 gap-1.5 transition-all"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </Button>
      </div>

      {/* Code Body */}
      <div className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-zinc-300 selection:bg-primary/30">
        <pre className="whitespace-pre">{currentTab?.code}</pre>
      </div>
    </div>
  );
}
