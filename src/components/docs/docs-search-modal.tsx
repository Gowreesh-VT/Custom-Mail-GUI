"use client";

import * as React from "react";
import { Search, X, Hash, ArrowRight, CornerDownLeft } from "lucide-react";
import { DOC_SECTIONS_DATA } from "@/lib/docs-content";

interface DocsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSection: (sectionId: string, subSectionId?: string) => void;
}

interface SearchResult {
  sectionId: string;
  sectionTitle: string;
  group: string;
  subSectionId?: string;
  subSectionTitle?: string;
  summary: string;
  matchScore: number;
}

export function DocsSearchModal({ isOpen, onClose, onSelectSection }: DocsSearchModalProps) {
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  // Search logic
  const results: SearchResult[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default: show popular / core sections
      return Object.values(DOC_SECTIONS_DATA).slice(0, 8).map((sec) => ({
        sectionId: sec.id,
        sectionTitle: sec.title,
        group: sec.group,
        summary: sec.summary,
        matchScore: 1
      }));
    }

    const matched: SearchResult[] = [];

    Object.values(DOC_SECTIONS_DATA).forEach((sec) => {
      let score = 0;
      if (sec.title.toLowerCase().includes(q)) score += 10;
      if (sec.keywords.some((k) => k.toLowerCase().includes(q))) score += 7;
      if (sec.summary.toLowerCase().includes(q)) score += 4;
      if (sec.group.toLowerCase().includes(q)) score += 3;

      if (score > 0) {
        matched.push({
          sectionId: sec.id,
          sectionTitle: sec.title,
          group: sec.group,
          summary: sec.summary,
          matchScore: score
        });
      }

      // Check sub-sections
      sec.subSections.forEach((sub) => {
        if (sub.title.toLowerCase().includes(q)) {
          matched.push({
            sectionId: sec.id,
            sectionTitle: sec.title,
            group: sec.group,
            subSectionId: sub.id,
            subSectionTitle: sub.title,
            summary: sec.summary,
            matchScore: 8
          });
        }
      });
    });

    return matched.sort((a, b) => b.matchScore - a.matchScore).slice(0, 12);
  }, [query]);

  // Key navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          const item = results[selectedIndex];
          onSelectSection(item.sectionId, item.subSectionId);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose, onSelectSection]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-24 px-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800/80 gap-3">
          <Search className="h-5 w-5 text-primary shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search documentation, guides, APIs, error codes..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-zinc-900 border border-zinc-800 text-zinc-400">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No matching documentation found for &ldquo;<span className="text-zinc-300 font-semibold">{query}</span>&rdquo;.
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${item.sectionId}-${item.subSectionId || ""}-${idx}`}
                  onClick={() => {
                    onSelectSection(item.sectionId, item.subSectionId);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? "bg-primary/10 border border-primary/30 text-white"
                      : "hover:bg-zinc-900/60 text-zinc-300 border border-transparent"
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                        {item.group}
                      </span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {item.sectionTitle}
                      </span>
                    </div>

                    {item.subSectionTitle ? (
                      <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                        <Hash className="h-3.5 w-3.5" />
                        <span>{item.subSectionTitle}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 line-clamp-1">{item.summary}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center pt-1 text-zinc-600">
                    {isSelected ? (
                      <CornerDownLeft className="h-4 w-4 text-primary" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-zinc-800/80 bg-zinc-900/40 px-4 py-2 text-[11px] text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><strong className="text-zinc-400">↑↓</strong> Navigate</span>
            <span><strong className="text-zinc-400">↵</strong> Select</span>
            <span><strong className="text-zinc-400">ESC</strong> Close</span>
          </div>
          <span className="text-zinc-500 font-mono">Postly v2.5 Docs Engine</span>
        </div>
      </div>
    </div>
  );
}
