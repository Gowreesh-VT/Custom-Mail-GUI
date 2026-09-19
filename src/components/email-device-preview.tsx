"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Battery,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Eye,
  FileText,
  Info,
  Laptop,
  Maximize2,
  Moon,
  Paperclip,
  Smartphone,
  Sparkles,
  Sun,
  Tablet,
  Wifi
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";

export interface EmailDevicePreviewProps {
  html: string;
  subject?: string;
  fromName?: string;
  fromEmail?: string;
  toAddresses?: string[] | string;
  attachments?: Array<{ name: string; size?: number; mimeType?: string }>;
  sampleRows?: Record<string, any>[];
  currentSampleIndex?: number;
  onSampleIndexChange?: (index: number) => void;
  className?: string;
  initialDevice?: "desktop" | "mobile" | "tablet";
  initialTheme?: "light" | "dark";
  showPreflight?: boolean;
}

export function EmailDevicePreview({
  html,
  subject = "(No Subject)",
  fromName = "Sender",
  fromEmail = "sender@example.com",
  toAddresses = ["recipient@example.com"],
  attachments = [],
  sampleRows = [],
  currentSampleIndex = 0,
  onSampleIndexChange,
  className,
  initialDevice = "desktop",
  initialTheme = "light",
  showPreflight = true
}: EmailDevicePreviewProps) {
  const [device, setDevice] = useState<"desktop" | "mobile" | "tablet">(initialDevice);
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
  const [activeTab, setActiveTab] = useState<"preview" | "notification" | "text" | "preflight">("preview");
  const [zoom, setZoom] = useState<100 | 85 | 75>(100);
  const [copiedText, setCopiedText] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const formattedTo = useMemo(() => {
    if (Array.isArray(toAddresses)) return toAddresses.join(", ") || "recipient@example.com";
    return toAddresses || "recipient@example.com";
  }, [toAddresses]);

  // Extract clean plain text for text/plain preview and preheader snippet
  const plainText = useMemo(() => {
    if (!html) return "";
    if (typeof window === "undefined") {
      return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = DOMPurify.sanitize(html);
    return (tempDiv.textContent || tempDiv.innerText || "").replace(/\s+/g, " ").trim();
  }, [html]);

  const preheaderSnippet = useMemo(() => {
    return plainText.slice(0, 110) + (plainText.length > 110 ? "..." : "");
  }, [plainText]);

  // Mobile subject line cutoff analysis (standard mobile clients truncate at ~42-45 chars)
  const subjectCutoff = useMemo(() => {
    const safeSubject = subject || "";
    const cutoffLimit = 42;
    const isTruncated = safeSubject.length > cutoffLimit;
    const visiblePart = isTruncated ? safeSubject.slice(0, cutoffLimit) : safeSubject;
    const truncatedPart = isTruncated ? safeSubject.slice(cutoffLimit) : "";
    return {
      length: safeSubject.length,
      cutoffLimit,
      isTruncated,
      visiblePart,
      truncatedPart
    };
  }, [subject]);

  // Pre-flight health and dark-mode contrast auditor
  const preflightResults = useMemo(() => {
    const issues: Array<{ id: string; type: "warning" | "error" | "info" | "success"; label: string; details: string }> = [];

    // 1. Merge placeholder check
    const unmergedMatches = html.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g) || [];
    if (unmergedMatches.length > 0) {
      const uniqueUnmerged = Array.from(new Set(unmergedMatches));
      issues.push({
        id: "unmerged_placeholders",
        type: "warning",
        label: `${uniqueUnmerged.length} Unmerged Placeholders Detected`,
        details: `Found tags like ${uniqueUnmerged.slice(0, 3).join(", ")}. Ensure your recipient data maps to these fields.`
      });
    } else {
      issues.push({
        id: "merge_clean",
        type: "success",
        label: "Dynamic Merge Fields Validated",
        details: "No raw unmapped curly placeholders remain in this preview."
      });
    }

    // 2. Subject Line Length Check
    if (subjectCutoff.isTruncated) {
      issues.push({
        id: "subject_length",
        type: "info",
        label: `Subject is ${subjectCutoff.length} Characters (Mobile Truncation Warning)`,
        details: `Most iOS & Android notification screens truncate subjects after ~42 characters. Recipients may see: "${subjectCutoff.visiblePart}..."`
      });
    } else if (subjectCutoff.length === 0 || subject === "(No Subject)") {
      issues.push({
        id: "subject_missing",
        type: "error",
        label: "Missing Subject Line",
        details: "Emails without subject lines have extremely high spam rates."
      });
    } else {
      issues.push({
        id: "subject_optimal",
        type: "success",
        label: `Optimal Subject Length (${subjectCutoff.length} chars)`,
        details: "Fits comfortably within mobile lock screens and notifications without truncation."
      });
    }

    // 3. Dark Mode Contrast Check
    const hasInlineBlack = /color\s*:\s*(#000000|#000|black)\b/i.test(html);
    const hasWhiteBg = /background(-color)?\s*:\s*(#ffffff|#fff|white)\b/i.test(html);
    if (hasInlineBlack && !hasWhiteBg) {
      issues.push({
        id: "dark_mode_contrast",
        type: "warning",
        label: "Potential Dark Mode Low-Contrast Risk",
        details: "Found inline black text styles without explicit background colors. On dark-mode clients, this text may become hard to read."
      });
    } else {
      issues.push({
        id: "dark_mode_ready",
        type: "success",
        label: "Dark Mode Compatibility Checked",
        details: "Color palette and container backgrounds adapt smoothly in dark mode."
      });
    }

    // 4. Missing Image Alt Check
    const imgMatches = html.match(/<img\s+[^>]*>/gi) || [];
    let missingAlt = 0;
    for (const imgTag of imgMatches) {
      if (!/alt\s*=\s*["'][^"']*["']/i.test(imgTag)) {
        missingAlt++;
      }
    }
    if (missingAlt > 0) {
      issues.push({
        id: "img_alt",
        type: "info",
        label: `${missingAlt} Image${missingAlt === 1 ? "" : "s"} Missing Alt Text`,
        details: "Adding descriptive alt text improves accessibility and prevents spam-filter penalties."
      });
    }

    // 5. Insecure HTTP link check
    const httpLinks = html.match(/href\s*=\s*["']http:\/\//gi) || [];
    if (httpLinks.length > 0) {
      issues.push({
        id: "http_links",
        type: "warning",
        label: `${httpLinks.length} Insecure HTTP Link${httpLinks.length === 1 ? "" : "s"}`,
        details: "Use HTTPS for all links to maintain sender reputation and avoid browser security warnings."
      });
    }

    return issues;
  }, [html, subject, subjectCutoff]);

  // Construct iframe srcDoc with injected responsive & dark-mode CSS
  const renderedSrcDoc = useMemo(() => {
    const isDark = theme === "dark";
    const darkStyles = `
      :root {
        color-scheme: ${isDark ? "dark" : "light"};
      }
      ${
        isDark
          ? `
        html, body {
          background-color: #121214 !important;
          color: #f3f4f6 !important;
        }
        /* Smart inversion for white containers and cards */
        table[bgcolor="#ffffff"], table[bgcolor="#fff"], table[bgcolor="white"],
        td[bgcolor="#ffffff"], td[bgcolor="#fff"], td[bgcolor="white"],
        div[style*="background-color: #ffffff"], div[style*="background-color: #fff"],
        div[style*="background: #ffffff"], div[style*="background: #fff"],
        div[style*="background-color: white"], div[style*="background: white"],
        table[style*="background-color: #ffffff"], table[style*="background-color: #fff"],
        table[style*="background: #ffffff"], table[style*="background: #fff"],
        table[style*="background-color: white"], table[style*="background: white"] {
          background-color: #1a1a20 !important;
          color: #f3f4f6 !important;
        }
        /* Ensure table borders don't glare */
        table, td, th {
          border-color: #2e2e38 !important;
        }
        /* Convert pure dark fonts to readable off-white */
        p, span, td, th, li {
          color: inherit;
        }
        /* Protect photos, logos, QR codes and SVG from negative distortion */
        img, svg, button {
          isolation: isolate;
        }
      `
          : `
        html, body {
          background-color: #ffffff;
          color: #111827;
        }
      `
      }
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * {
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
    }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.5;
      word-break: break-word;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    table {
      max-width: 100% !important;
    }
    ${darkStyles}
  </style>
</head>
<body class="${isDark ? "dark-theme" : "light-theme"}">
  ${typeof window !== "undefined" ? DOMPurify.sanitize(html) : html}
</body>
</html>`;
  }, [html, theme]);

  const copyPlainTextToClipboard = () => {
    navigator.clipboard.writeText(plainText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className={cn("flex flex-col space-y-3", className)}>
      {/* Control Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-2.5 text-xs shadow-xs">
        {/* Left: Device & Viewport Switcher */}
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={device === "desktop" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDevice("desktop")}
                  className="h-8 px-2.5 text-xs gap-1.5"
                >
                  <Laptop className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desktop Client (Full Canvas)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={device === "mobile" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDevice("mobile")}
                  className="h-8 px-2.5 text-xs gap-1.5"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mobile</span>
                  <Badge variant="secondary" className="px-1 py-0 text-[10px] font-normal">
                    375px
                  </Badge>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mobile Smartphone Shell (iPhone / Android)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={device === "tablet" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDevice("tablet")}
                  className="h-8 px-2.5 text-xs gap-1.5"
                >
                  <Tablet className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tablet</span>
                  <Badge variant="secondary" className="px-1 py-0 text-[10px] font-normal">
                    600px
                  </Badge>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Tablet Viewport (600px)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Middle: Tab Switcher (Preview / Notification / Text / Pre-flight) */}
        <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors cursor-pointer",
              activeTab === "preview" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-3 w-3" />
            <span>Interactive View</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notification")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors cursor-pointer",
              activeTab === "notification" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="h-3 w-3" />
            <span>Lock Screen</span>
            {subjectCutoff.isTruncated && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("text")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors cursor-pointer",
              activeTab === "text" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-3 w-3" />
            <span>Plain-Text</span>
          </button>
          {showPreflight && (
            <button
              type="button"
              onClick={() => setActiveTab("preflight")}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors cursor-pointer",
                activeTab === "preflight" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Pre-Flight</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 bg-primary/10 text-primary border-primary/20">
                {preflightResults.length}
              </Badge>
            </button>
          )}
        </div>

        {/* Right: Theme Toggle (Light / Dark Mode Simulator) & Zoom */}
        <div className="flex items-center gap-2">
          {/* Dark Mode Simulator Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className={cn(
                    "h-8 px-2.5 text-xs gap-1.5 font-medium transition-all cursor-pointer",
                    theme === "dark" ? "bg-zinc-900 text-yellow-400 border-zinc-700 hover:bg-zinc-800" : "hover:bg-muted"
                  )}
                >
                  {theme === "dark" ? (
                    <>
                      <Moon className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span>Dark Mode Active</span>
                    </>
                  ) : (
                    <>
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                      <span>Simulate Dark Mode</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Simulate how dark-mode email clients (Apple Mail, Outlook, Gmail) adapt this email
              </TooltipContent>
            </Tooltip>

            {/* Zoom dropdown */}
            <div className="hidden md:flex items-center border rounded-md overflow-hidden bg-background">
              <button
                type="button"
                onClick={() => setZoom(zoom === 100 ? 85 : zoom === 85 ? 75 : 100)}
                className="px-2 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="h-3 w-3" />
                {zoom}%
              </button>
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Optional Sample Recipient Carousel (When in Bulk Mode) */}
      {sampleRows.length > 0 && onSampleIndexChange && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Sampling Recipient:</span>
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-primary font-medium">
              {sampleRows[currentSampleIndex]?.email ||
                sampleRows[currentSampleIndex]?.[Object.keys(sampleRows[currentSampleIndex])[0]] ||
                `Row ${currentSampleIndex + 1}`}
            </code>
            <span className="text-muted-foreground hidden sm:inline">
              ({currentSampleIndex + 1} of {sampleRows.length} total recipients)
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentSampleIndex <= 0}
              onClick={() => onSampleIndexChange(currentSampleIndex - 1)}
              className="h-6 px-2 text-xs"
            >
              <ChevronLeft className="h-3 w-3 mr-0.5" />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentSampleIndex >= sampleRows.length - 1}
              onClick={() => onSampleIndexChange(currentSampleIndex + 1)}
              className="h-6 px-2 text-xs"
            >
              Next
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT CONTAINER */}
      <div className="relative min-h-[560px] rounded-xl border bg-muted/20 p-4 flex items-center justify-center overflow-x-auto">
        {/* TAB 1: INTERACTIVE VIEW */}
        {activeTab === "preview" && (
          <div
            className="transition-all duration-300 ease-out flex justify-center w-full"
            style={{ transform: zoom < 100 ? `scale(${zoom / 100})` : undefined, transformOrigin: "top center" }}
          >
            {/* DESKTOP VIEWPORT */}
            {device === "desktop" && (
              <div className="w-full max-w-4xl rounded-xl border bg-card shadow-lg overflow-hidden transition-colors">
                {/* Simulated macOS / Webmail Window Header */}
                <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                      <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                      <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="ml-3 font-medium text-foreground truncate max-w-[320px]">
                      {subject}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                    <span className="rounded bg-background/80 px-2 py-0.5 border font-mono">
                      Desktop Client View
                    </span>
                  </div>
                </div>

                {/* Email Client Header Metadata */}
                <div className="border-b bg-background px-5 py-3 space-y-1.5 text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-semibold text-base text-foreground tracking-tight">{subject}</h2>
                    <span className="text-[11px] text-muted-foreground font-mono">Today, 9:41 AM</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-muted-foreground">
                    <div>
                      From: <span className="text-foreground font-medium">{fromName}</span>{" "}
                      <span className="text-muted-foreground font-mono">&lt;{fromEmail}&gt;</span>
                    </div>
                    <div>
                      To: <span className="text-foreground font-mono">{formattedTo}</span>
                    </div>
                  </div>
                  {attachments.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <Paperclip className="h-3 w-3" /> {attachments.length} attachment{attachments.length > 1 ? "s" : ""}:
                      </span>
                      {attachments.map((att, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-muted text-[11px] font-medium"
                        >
                          {att.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Iframe Canvas */}
                <iframe
                  ref={iframeRef}
                  title="Desktop email preview"
                  srcDoc={renderedSrcDoc}
                  className="w-full h-[580px] bg-background border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            )}

            {/* MOBILE VIEWPORT (Authentic iPhone Device Shell) */}
            {device === "mobile" && (
              <div className="relative mx-auto w-[375px] shrink-0 rounded-[52px] border-[12px] border-zinc-900 bg-zinc-950 p-2 shadow-2xl ring-1 ring-white/15 dark:border-zinc-800">
                {/* Dynamic Island / Speaker Pill */}
                <div className="relative z-20 mx-auto -mt-0.5 mb-2 h-6 w-28 rounded-full bg-zinc-900 flex items-center justify-between px-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-950/90 ring-1 ring-zinc-800" />
                  <div className="h-2 w-2 rounded-full bg-blue-900/60 ring-1 ring-blue-500/20" />
                </div>

                {/* iPhone Screen Area */}
                <div className="relative overflow-hidden rounded-[38px] bg-background shadow-inner">
                  {/* iOS Status Bar */}
                  <div className="flex items-center justify-between px-6 pt-1 pb-1 text-[12px] font-semibold tracking-tight text-foreground select-none">
                    <span>9:41</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold">5G</span>
                      <Wifi className="h-3 w-3" />
                      <Battery className="h-3.5 w-3.5 fill-foreground" />
                    </div>
                  </div>

                  {/* Mail App Navigation Header */}
                  <div className="border-b bg-background/95 px-3 py-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-primary font-medium cursor-pointer">
                      <ChevronLeft className="h-4 w-4" />
                      <span>Inbox</span>
                    </div>
                    <div className="font-semibold text-foreground text-[11px] truncate max-w-[160px]">
                      {subject}
                    </div>
                    <div className="w-8 text-right text-muted-foreground text-[11px]">1 of 1</div>
                  </div>

                  {/* Email Sender Card inside Mail App */}
                  <div className="border-b bg-muted/20 px-3.5 py-2.5 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {fromName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate">{fromName}</div>
                          <div className="text-[10px] text-muted-foreground truncate">To: {formattedTo}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-mono">9:41 AM</span>
                    </div>
                    <div className="font-semibold text-foreground text-xs pt-1 truncate">{subject}</div>
                  </div>

                  {/* Body Iframe */}
                  <iframe
                    ref={iframeRef}
                    title="Mobile email preview"
                    srcDoc={renderedSrcDoc}
                    className="w-full h-[480px] bg-background border-0"
                    sandbox="allow-same-origin"
                  />

                  {/* iPhone Home Indicator */}
                  <div className="py-2 flex justify-center bg-background">
                    <div className="h-1 w-32 rounded-full bg-foreground/30" />
                  </div>
                </div>
              </div>
            )}

            {/* TABLET VIEWPORT */}
            {device === "tablet" && (
              <div className="relative mx-auto w-[620px] shrink-0 rounded-[36px] border-[10px] border-zinc-900 bg-zinc-950 p-2 shadow-2xl ring-1 ring-white/15 dark:border-zinc-800">
                <div className="relative overflow-hidden rounded-[26px] bg-background shadow-inner">
                  {/* Tablet Status Bar */}
                  <div className="flex items-center justify-between px-6 pt-1.5 pb-1 text-[11px] font-semibold text-muted-foreground">
                    <span>iPad • 9:41 AM</span>
                    <div className="flex items-center gap-1.5">
                      <Wifi className="h-3 w-3" />
                      <Battery className="h-3 w-3 fill-current" />
                    </div>
                  </div>

                  {/* Tablet App Header */}
                  <div className="border-b px-5 py-3 flex items-center justify-between bg-card text-xs">
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{subject}</h3>
                      <p className="text-muted-foreground text-[11px] mt-0.5">
                        From: <span className="text-foreground">{fromName}</span> &bull; To: {formattedTo}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Tablet View
                    </Badge>
                  </div>

                  {/* Body Iframe */}
                  <iframe
                    ref={iframeRef}
                    title="Tablet email preview"
                    srcDoc={renderedSrcDoc}
                    className="w-full h-[520px] bg-background border-0"
                    sandbox="allow-same-origin"
                  />

                  {/* Home Bar */}
                  <div className="py-1.5 flex justify-center bg-background">
                    <div className="h-1 w-36 rounded-full bg-foreground/30" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MOBILE LOCK SCREEN & NOTIFICATION SIMULATOR */}
        {activeTab === "notification" && (
          <div className="w-full max-w-sm mx-auto space-y-4 py-4">
            <div className="text-center space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Mobile Notification & Lock Screen</h3>
              <p className="text-xs text-muted-foreground">
                How this campaign appears when arriving on a recipient&apos;s phone lock screen or notification shade.
              </p>
            </div>

            {/* iOS Lock Screen Notification Mockup */}
            <div className="rounded-2xl border border-border/80 bg-card/90 p-4 shadow-xl backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="h-4 w-4 rounded-md bg-primary flex items-center justify-center text-[9px] font-black text-primary-foreground">
                    ✉
                  </div>
                  <span className="font-semibold text-foreground">MAIL</span>
                  <span>&bull;</span>
                  <span>now</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Notification</span>
              </div>

              <div className="space-y-1 pt-0.5">
                <div className="font-bold text-sm text-foreground">{fromName}</div>
                <div className="font-semibold text-xs text-foreground leading-tight">
                  {subjectCutoff.isTruncated ? (
                    <>
                      <span>{subjectCutoff.visiblePart}</span>
                      <span className="text-amber-500 font-mono font-normal">... (cut off)</span>
                    </>
                  ) : (
                    subject
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {preheaderSnippet || "Hello, this is an automated dispatch from Custom Mail."}
                </p>
              </div>
            </div>

            {/* Subject Truncation Analysis Card */}
            <Card className="border-border">
              <CardHeader className="p-3.5 pb-2">
                <CardTitle className="text-xs font-semibold flex items-center justify-between">
                  <span>Subject Line Length Analyzer</span>
                  <Badge
                    variant={subjectCutoff.isTruncated ? "outline" : "secondary"}
                    className={cn(
                      "text-[10px] font-mono",
                      subjectCutoff.isTruncated
                        ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                        : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    )}
                  >
                    {subjectCutoff.length} / {subjectCutoff.cutoffLimit} chars
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-0 space-y-2.5 text-xs">
                {subjectCutoff.isTruncated ? (
                  <div className="space-y-1.5 text-muted-foreground">
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Subject line exceeds standard 42-character mobile cutoff.
                    </p>
                    <div className="rounded-md border bg-muted/30 p-2 font-mono text-[11px] leading-relaxed">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {subjectCutoff.visiblePart}
                      </span>
                      <span className="bg-amber-500/20 text-amber-600 dark:text-amber-300 line-through">
                        {subjectCutoff.truncatedPart}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Tip: Keep the most compelling keywords within the first 35-40 characters so recipients don&apos;t miss them on mobile.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Great length! Will display in full across almost all smartphone lock screens.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 3: PLAIN-TEXT FALLBACK VIEW */}
        {activeTab === "text" && (
          <div className="w-full max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">MIME Plain-Text Version</h3>
                <p className="text-xs text-muted-foreground">
                  Delivered to text-only email clients, screen readers, and scanned by antispam engines.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyPlainTextToClipboard}
                className="h-8 text-xs gap-1.5"
              >
                {copiedText ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Clipboard className="h-3.5 w-3.5" />
                    Copy Plain Text
                  </>
                )}
              </Button>
            </div>

            <div className="rounded-lg border bg-zinc-950 text-zinc-200 p-4 font-mono text-xs leading-relaxed max-h-[480px] overflow-y-auto whitespace-pre-wrap selection:bg-primary/30">
              {plainText || "(No plain-text body generated)"}
            </div>
          </div>
        )}

        {/* TAB 4: PRE-FLIGHT AUDIT */}
        {activeTab === "preflight" && (
          <div className="w-full max-w-2xl mx-auto space-y-4 py-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Pre-Flight Deliverability & Quality Checklist
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automated heuristics checking your content, formatting, and dark-mode resilience before dispatch.
              </p>
            </div>

            <div className="grid gap-2.5">
              {preflightResults.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-xs transition-colors",
                    item.type === "success" && "border-emerald-500/20 bg-emerald-500/5 text-foreground",
                    item.type === "warning" && "border-amber-500/20 bg-amber-500/5 text-foreground",
                    item.type === "error" && "border-rose-500/20 bg-rose-500/5 text-foreground",
                    item.type === "info" && "border-blue-500/20 bg-blue-500/5 text-foreground"
                  )}
                >
                  {item.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
                  {item.type === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                  {item.type === "error" && <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />}
                  {item.type === "info" && <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />}

                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">{item.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
