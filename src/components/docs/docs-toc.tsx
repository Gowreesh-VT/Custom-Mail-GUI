"use client";

import * as React from "react";
import { DocSubSection } from "@/lib/docs-content";
import { ThumbsUp, ThumbsDown, ArrowUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocsTocProps {
  subSections: DocSubSection[];
  activeSubSection: string;
  onSubSectionClick: (id: string) => void;
}

export function DocsToc({ subSections, activeSubSection, onSubSectionClick }: DocsTocProps) {
  const [feedbackGiven, setFeedbackGiven] = React.useState<"up" | "down" | null>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const contentEl = document.getElementById("docs-content-container");
    if (contentEl) contentEl.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="w-56 shrink-0 sticky top-24 space-y-6 hidden xl:block text-xs">
      {/* Table of Contents */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
          On this page
        </span>
        <nav className="space-y-1 border-l border-zinc-800/80 pl-3">
          {subSections.map((sub) => {
            const isActive = activeSubSection === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => onSubSectionClick(sub.id)}
                className={`block w-full text-left py-1 text-xs transition-colors truncate ${
                  isActive
                    ? "text-primary font-semibold -ml-3.5 pl-3.5 border-l-2 border-primary"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title={sub.title}
              >
                {sub.title}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Community / Helpful Widget */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 space-y-2.5">
        <span className="text-[11px] font-semibold text-zinc-300 block">Was this page helpful?</span>
        {feedbackGiven ? (
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
            <Check className="h-3.5 w-3.5" />
            <span>Thank you for your feedback!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeedbackGiven("up")}
              className="h-7 px-2.5 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300"
            >
              <ThumbsUp className="h-3 w-3 mr-1.5" /> Yes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFeedbackGiven("down")}
              className="h-7 px-2.5 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300"
            >
              <ThumbsDown className="h-3 w-3 mr-1.5" /> No
            </Button>
          </div>
        )}

        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
          >
            <ArrowUp className="h-3 w-3" /> Back to top
          </button>
        </div>
      </div>
    </div>
  );
}
