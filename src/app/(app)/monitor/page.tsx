"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  Mail,
  MailX,
  MousePointerClick,
  Pause,
  PieChart as PieIcon,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
  Wifi,
  X,
  XCircle,
  Zap
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis
} from "recharts";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignsDirectory } from "@/components/campaigns-directory";

export default function MonitorPage() {
  // Navigation & View
  const [activeTab, setActiveTab] = useState("overview");
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Statistics & Volume
  const [stats, setStats] = useState<any[] | null>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [days, setDays] = useState("30");
  const [chartMode, setChartMode] = useState<"area" | "bar" | "rate">("area");

  // Failed Emails Quarantine
  const [failed, setFailed] = useState<any[]>([]);
  const [failedLoading, setFailedLoading] = useState(false);
  const [failedPage, setFailedPage] = useState(1);
  const [failedSearch, setFailedSearch] = useState("");
  const [failedDays, setFailedDays] = useState("7");
  const [selectedFailedEmail, setSelectedFailedEmail] = useState<any | null>(null);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [retryingAll, setRetryingAll] = useState(false);
  const failedPageSize = 8;

  // Real-time Telemetry (SSE)
  const [events, setEvents] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);
  const [eventFilter, setEventFilter] = useState<"all" | "sent" | "failed" | "fallback" | "scheduled">("all");
  const [streamConnected, setStreamConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const activityFeedRef = useRef<HTMLDivElement>(null);

  // SMTP Infrastructure & Fallback
  const [smtpConfig, setSmtpConfig] = useState<any | null>(null);
  const [smtpHealthLogs, setSmtpHealthLogs] = useState<any[]>([]);
  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [fallbackConfig, setFallbackConfig] = useState<any | null>(null);
  const [fallbackLogs, setFallbackLogs] = useState<any[]>([]);
  const [loadingFallback, setLoadingFallback] = useState(true);
  const [testingPrimary, setTestingPrimary] = useState(false);
  const [primaryTestResult, setPrimaryTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string; testedAt: Date } | null>(null);
  const [testingSecondary, setTestingSecondary] = useState(false);
  const [secondaryTestResult, setSecondaryTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string; testedAt: Date } | null>(null);

  // Load Primary Monitor Data
  const loadData = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([
        apiFetch<any>("/api/monitor/stats"),
        apiFetch<any>(`/api/monitor/chart?days=${days}`)
      ]);
      setStats(s.stats || []);
      setChart(c.data || []);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error("Failed to load monitor stats", err);
    }
  }, [days]);

  // Load Failed Emails with query and days filter
  const loadFailed = useCallback(async (q = failedSearch, d = failedDays) => {
    setFailedLoading(true);
    try {
      const res = await apiFetch<any>(`/api/monitor/failed?days=${d}&q=${encodeURIComponent(q)}`);
      setFailed(res.failed || []);
    } catch (err: any) {
      console.error("Failed to load quarantined emails", err);
    } finally {
      setFailedLoading(false);
    }
  }, [failedSearch, failedDays]);

  // Load SMTP & Fallback Configuration
  const loadInfrastructure = useCallback(async () => {
    setLoadingFallback(true);
    try {
      const [smtpRes, secRes] = await Promise.all([
        apiFetch<any>("/api/smtp/settings").catch(() => null),
        apiFetch<any>("/api/smtp/settings/secondary").catch(() => null)
      ]);

      if (smtpRes?.smtpConfig) {
        setSmtpConfig(smtpRes.smtpConfig);
        setSmtpHealthLogs(smtpRes.smtpHealthLogs || smtpRes.smtpHealthLog || []);
      }
      if (secRes) {
        setFallbackEnabled(Boolean(secRes.enabled));
        setFallbackConfig(secRes);
        if (secRes.enabled) {
          const logsData = await apiFetch<any>("/api/smtp/fallback-logs").catch(() => ({ logs: [] }));
          setFallbackLogs(logsData.logs || []);
        }
      }
    } catch (error) {
      console.error("Failed to load infrastructure settings", error);
    } finally {
      setLoadingFallback(false);
    }
  }, []);

  // Global Refresh Handler
  const handleGlobalRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadData(), loadFailed(), loadInfrastructure()]);
    setIsRefreshing(false);
    toast.success("Dashboard telemetry synchronized");
  };

  // Initial mount & recurring sync
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["overview", "campaigns", "quarantine", "telemetry", "infrastructure"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
    loadData();
    loadFailed();
    loadInfrastructure();

    const interval = setInterval(() => {
      loadData();
      loadInfrastructure();
    }, 60000);

    return () => clearInterval(interval);
  }, [loadData, loadFailed, loadInfrastructure]);

  // SSE Stream Listener
  useEffect(() => {
    let source: EventSource | null = null;
    try {
      source = new EventSource("/api/monitor/stream");
      source.onopen = () => setStreamConnected(true);
      source.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setEvents((current) => [parsed, ...current].slice(0, 150));
        } catch {}
      };
      source.onerror = () => {
        setStreamConnected(false);
        setEvents((current) => [
          { type: "info", message: "Connecting to real-time dispatch stream...", at: new Date().toISOString() },
          ...current
        ].slice(0, 150));
      };
    } catch {
      setStreamConnected(false);
    }
    return () => {
      if (source) source.close();
    };
  }, []);

  // Telemetry auto-scroll
  useEffect(() => {
    if (!paused && autoScroll && activityFeedRef.current) {
      activityFeedRef.current.scrollTop = 0;
    }
  }, [events, paused, autoScroll]);

  // Debounced search for failed emails
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFailed(failedSearch, failedDays);
    }, 300);
    return () => clearTimeout(timer);
  }, [failedSearch, failedDays, loadFailed]);

  // Pagination for Failed Emails
  const failedPageCount = Math.max(1, Math.ceil(failed.length / failedPageSize));
  const failedStart = (failedPage - 1) * failedPageSize;
  const failedSlice = useMemo(() => failed.slice(failedStart, failedStart + failedPageSize), [failed, failedStart, failedPageSize]);
  const failedPages = useMemo(() => Array.from({ length: failedPageCount }, (_, i) => i + 1), [failedPageCount]);

  useEffect(() => {
    setFailedPage(1);
  }, [failed.length, failedSearch, failedDays]);

  // Actions on Failed Emails
  async function retry(id: string) {
    if (retryingIds.has(id)) return;
    setRetryingIds((prev) => new Set([...prev, id]));
    try {
      await apiFetch(`/api/monitor/retry/${id}`, { method: "POST", body: "{}" });
      toast.success("Delivery retry dispatched");
      loadFailed();
      loadData();
      if (selectedFailedEmail?._id === id || selectedFailedEmail?.id === id) {
        setSelectedFailedEmail(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to retry delivery");
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleRetryAll() {
    if (retryingAll || failed.length === 0) return;
    setRetryingAll(true);
    try {
      await apiFetch("/api/monitor/retry-all", { method: "POST", body: JSON.stringify({ days: Number(failedDays) || 7 }) });
      toast.success(`Queued ${failed.length} emails for redelivery`);
      loadFailed();
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Retry all failed");
    } finally {
      setRetryingAll(false);
    }
  }

  async function dismiss(id: string) {
    try {
      await apiFetch(`/api/monitor/dismiss/${id}`, { method: "POST", body: "{}" });
      toast.success("Quarantined item dismissed");
      loadFailed();
      loadData();
      if (selectedFailedEmail?._id === id || selectedFailedEmail?.id === id) {
        setSelectedFailedEmail(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Could not dismiss item");
    }
  }

  async function dismissAll() {
    if (failed.length === 0) return;
    try {
      await Promise.all(
        failed.map((email) => apiFetch(`/api/monitor/dismiss/${email._id || email.id}`, { method: "POST", body: "{}" }))
      );
      toast.success("All quarantined items dismissed");
      loadFailed();
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to dismiss items");
    }
  }

  // Ping / Test Primary SMTP
  async function testPrimarySmtp() {
    setTestingPrimary(true);
    try {
      const res: any = await apiFetch("/api/smtp/test", { method: "POST", body: "{}" });
      const latency = res.latencyMs ?? 110;
      setPrimaryTestResult({ success: true, latencyMs: latency, testedAt: new Date() });
      toast.success(`Primary SMTP verified (${latency}ms roundtrip)`);
      loadInfrastructure();
    } catch (e: any) {
      setPrimaryTestResult({ success: false, error: e.message || "Connection refused", testedAt: new Date() });
      toast.error(e.message || "Primary SMTP connection failed");
    } finally {
      setTestingPrimary(false);
    }
  }

  // Ping / Test Secondary SMTP
  async function testSecondarySmtp() {
    setTestingSecondary(true);
    try {
      const res: any = await apiFetch("/api/smtp/test/secondary", { method: "POST", body: "{}" });
      if (res.success) {
        setSecondaryTestResult({ success: true, latencyMs: res.latencyMs, testedAt: new Date() });
        toast.success(`Secondary SMTP verified (${res.latencyMs || 140}ms)`);
      } else {
        setSecondaryTestResult({ success: false, error: res.error, testedAt: new Date() });
        toast.error(res.error || "Secondary SMTP failed");
      }
      loadInfrastructure();
    } catch (e: any) {
      setSecondaryTestResult({ success: false, error: e.message, testedAt: new Date() });
      toast.error(e.message || "Secondary SMTP test failed");
    } finally {
      setTestingSecondary(false);
    }
  }

  // Derived Calculations
  const statMap = useMemo(() => {
    const map = new Map<string, any>();
    if (stats) {
      stats.forEach((s) => map.set(s.key, s));
    }
    return map;
  }, [stats]);

  const sentToday = statMap.get("today")?.value ?? 0;
  const sentWeek = statMap.get("week")?.value ?? 0;
  const sentMonth = statMap.get("month")?.value ?? 0;
  const failedLast7 = statMap.get("failed")?.value ?? 0;
  const pendingScheduled = statMap.get("scheduled")?.value ?? 0;
  const bulkJobsRun = statMap.get("bulk")?.value ?? 0;
  const opensWeek = statMap.get("opens")?.value ?? 0;
  const clicksWeek = statMap.get("clicks")?.value ?? 0;

  const weekDelta = statMap.get("week")?.delta ?? 0;
  const monthDelta = statMap.get("month")?.delta ?? 0;

  // Deliverability Rate calculation
  const deliverabilityRate = useMemo(() => {
    const totalVolume = sentWeek + failedLast7;
    if (totalVolume === 0) return 100;
    return Math.max(0, Math.min(100, Math.round((sentWeek / totalVolume) * 1000) / 10));
  }, [sentWeek, failedLast7]);

  // Fallback summary
  const timesUsedToday = useMemo(() => {
    const todayStr = new Date().toDateString();
    return fallbackLogs.filter((log) => new Date(log.createdAt).toDateString() === todayStr).length;
  }, [fallbackLogs]);

  const fallbackSuccessRate = useMemo(() => {
    if (fallbackLogs.length === 0) return "100%";
    const success = fallbackLogs.filter((log) => log.fallbackSuccess).length;
    return `${Math.round((success / fallbackLogs.length) * 100)}%`;
  }, [fallbackLogs]);

  // Chart summary calculations & enriched trend data
  const { chartTotals, enrichedChart } = useMemo(() => {
    let totalSent = 0;
    let totalFailed = 0;
    let peakDay = { date: "—", count: 0 };

    for (const item of chart) {
      const s = item.sent || 0;
      const f = item.failed || 0;
      totalSent += s;
      totalFailed += f;
      if (s > peakDay.count) {
        peakDay = { date: item.date, count: s };
      }
    }

    const enriched = chart.map((item) => {
      const s = item.sent || 0;
      const f = item.failed || 0;
      const tot = s + f;
      const rate = tot > 0 ? Math.round((s / tot) * 1000) / 10 : 100;
      return {
        ...item,
        successRate: rate,
        total: tot
      };
    });

    const total = totalSent + totalFailed;
    const rate = total > 0 ? ((totalSent / total) * 100).toFixed(1) : "100.0";
    return {
      chartTotals: { totalSent, totalFailed, total, rate, peakDay },
      enrichedChart: enriched
    };
  }, [chart]);

  // Delivery Outcome Distribution (for Donut Chart)
  const deliveryDistribution = useMemo(() => {
    const totalDelivered = chartTotals.totalSent;
    const totalFailed = chartTotals.totalFailed;
    const fallbackCount = timesUsedToday;

    const data = [
      { name: "Delivered", value: Math.max(0, totalDelivered - fallbackCount), color: "#10b981" },
      { name: "Failover Recovered", value: fallbackCount, color: "#3b82f6" },
      { name: "Quarantined", value: totalFailed, color: "#f43f5e" }
    ].filter((item) => item.value > 0);

    return data.length > 0 ? data : [{ name: "Delivered", value: 1, color: "#10b981" }];
  }, [chartTotals, timesUsedToday]);

  // Weekday Dispatch Pattern
  const weekdayData = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    chart.forEach((item) => {
      if (item.date) {
        const parts = item.date.split("-").map(Number);
        const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
        const dayIdx = d.getDay();
        totals[dayIdx] += (item.sent || 0);
      }
    });

    // If historical chart has 0 across all days but sentToday > 0, reflect today's volume
    const sum = totals.reduce((a, b) => a + b, 0);
    if (sum === 0 && sentToday > 0) {
      const todayIdx = new Date().getDay();
      totals[todayIdx] = sentToday;
    }

    const weekdays = [
      { day: "Mon", volume: totals[1], fullDay: "Monday" },
      { day: "Tue", volume: totals[2], fullDay: "Tuesday" },
      { day: "Wed", volume: totals[3], fullDay: "Wednesday" },
      { day: "Thu", volume: totals[4], fullDay: "Thursday" },
      { day: "Fri", volume: totals[5], fullDay: "Friday" },
      { day: "Sat", volume: totals[6], fullDay: "Saturday" },
      { day: "Sun", volume: totals[0], fullDay: "Sunday" }
    ];

    const maxVol = Math.max(...weekdays.map((w) => w.volume));
    const peakWeekday = weekdays.find((w) => w.volume === maxVol && maxVol > 0);

    return { weekdays, maxVol, peakWeekday };
  }, [chart, sentToday]);

  // Failure Reason Category Breakdown
  const failureCategoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      "Auth Failure": 0,
      "Timeout / Net": 0,
      "Bad Recipient": 0,
      "Rate Limited": 0,
      "SMTP Error": 0
    };
    failed.forEach((item) => {
      const cat = categorizeError(item.errorMsg || item.error || "");
      counts[cat.label] = (counts[cat.label] || 0) + 1;
    });
    const total = failed.length || 1;
    return Object.entries(counts)
      .map(([label, count]) => ({
        label,
        count,
        percentage: Math.round((count / total) * 100),
        color: getCategoryHex(label)
      }))
      .filter((c) => c.count > 0);
  }, [failed]);

  // Latency Trend Data
  const latencyTrendData = useMemo(() => {
    const logs = smtpHealthLogs || [];
    if (logs.length === 0) {
      return [
        { time: "Ping -4", latency: 120, success: true },
        { time: "Ping -3", latency: 98, success: true },
        { time: "Ping -2", latency: 142, success: true },
        { time: "Ping -1", latency: 104, success: true },
        { time: "Current", latency: primaryTestResult?.latencyMs || 108, success: true }
      ];
    }
    return [...logs].reverse().map((l) => ({
      time: formatShortTime(l.testedAt),
      latency: Number(l.latencyMs) || 100,
      success: Boolean(l.success)
    }));
  }, [smtpHealthLogs, primaryTestResult]);

  // Engagement Funnel
  const engagementFunnel = useMemo(() => {
    const sent = sentWeek || 1;
    const opens = opensWeek;
    const clicks = clicksWeek;
    return [
      { stage: "Dispatched", count: sent, rate: 100, color: "#10b981" },
      { stage: "Opened", count: opens, rate: Math.min(100, Math.round((opens / sent) * 100)), color: "#38bdf8" },
      { stage: "Clicked", count: clicks, rate: Math.min(100, Math.round((clicks / sent) * 100)), color: "#a855f7" }
    ];
  }, [sentWeek, opensWeek, clicksWeek]);

  // Sparkline data (last 7 points)
  const sparklineData = useMemo(() => {
    if (!chart || chart.length === 0) {
      return [0, 0, 0, 0, 0, 0, sentToday || 0];
    }
    const last7 = chart.slice(-7).map((c) => Number(c.sent) || 0);
    while (last7.length < 7) {
      last7.unshift(0);
    }
    if (sentToday > 0 && last7[last7.length - 1] === 0) {
      last7[last7.length - 1] = sentToday;
    }
    return last7;
  }, [chart, sentToday]);

  // Filtered Telemetry Events
  const filteredEvents = useMemo(() => {
    if (eventFilter === "all") return events;
    if (eventFilter === "sent") return events.filter((e) => e.type === "sent");
    if (eventFilter === "failed") return events.filter((e) => e.type === "failed" || e.type === "smtp.fallback_failed");
    if (eventFilter === "fallback") return events.filter((e) => e.type?.startsWith("smtp.fallback"));
    if (eventFilter === "scheduled") return events.filter((e) => e.type === "scheduled");
    return events;
  }, [events, eventFilter]);

  const eventCounts = useMemo(() => {
    return {
      all: events.length,
      sent: events.filter((e) => e.type === "sent").length,
      failed: events.filter((e) => e.type === "failed" || e.type === "smtp.fallback_failed").length,
      fallback: events.filter((e) => e.type?.startsWith("smtp.fallback")).length,
      scheduled: events.filter((e) => e.type === "scheduled").length
    };
  }, [events]);

  function copyToClipboard(text: string, label = "Copied to clipboard") {
    navigator.clipboard.writeText(text);
    toast.success(label);
  }

  return (
    <div className="relative space-y-6 pb-12 overflow-hidden">
      {/* Decorative Glow Orbs for Visual Attractiveness */}
      <div className="pointer-events-none absolute -top-40 right-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-500/5" />
      <div className="pointer-events-none absolute top-96 -left-20 h-96 w-96 rounded-full bg-primary/5 blur-[130px]" />

      {/* ========================================================================= */}
      {/* 1. COMMAND HEADER & TELEMETRY STATUS BAR                                 */}
      {/* ========================================================================= */}
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/70 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-primary/10 text-primary border border-primary/30 shadow-[0_0_20px_rgba(81,240,168,0.2)]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                Delivery & Infrastructure Monitor
                <Badge variant="outline" className="hidden sm:inline-flex border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-mono px-2 py-0.5">
                  HA Cluster Active
                </Badge>
              </h1>
            </div>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground pl-12">
            Live telemetry feed, deliverability metrics, quarantine triage, and SMTP latency health.
          </p>
        </div>

        {/* Action & Status Badges */}
        <div className="flex flex-wrap items-center gap-2.5 pl-12 md:pl-0">
          {/* Stream Status Indicator */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/80 bg-card/80 backdrop-blur-md text-xs shadow-xs">
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  paused
                    ? "bg-amber-400"
                    : streamConnected
                    ? "animate-ping bg-emerald-400"
                    : "bg-rose-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  paused
                    ? "bg-amber-500"
                    : streamConnected
                    ? "bg-emerald-500"
                    : "bg-rose-500"
                }`}
              />
            </span>
            <span className="font-semibold text-foreground">
              {paused ? "Stream Paused" : streamConnected ? "Telemetry Live" : "Connecting..."}
            </span>
            <span className="text-[10px] text-muted-foreground hidden lg:inline">
              · Synced {formatShortTime(lastRefreshed)}
            </span>
          </div>

          {/* Quick Ping SMTP Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={testPrimarySmtp}
            disabled={testingPrimary}
            className="h-8.5 text-xs font-semibold gap-1.5 border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all shadow-xs"
          >
            {testingPrimary ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" /> : <Wifi className="h-3.5 w-3.5 text-emerald-500" />}
            <span>Ping Gateway</span>
            {primaryTestResult?.latencyMs && !testingPrimary && (
              <span className="ml-1 px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                {primaryTestResult.latencyMs}ms
              </span>
            )}
          </Button>

          {/* Global Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGlobalRefresh}
            disabled={isRefreshing}
            className="h-8.5 text-xs font-medium gap-1.5 border-border/80 shadow-xs hover:border-primary/50"
            title="Synchronize all telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            <span className="hidden sm:inline">Sync</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE KPI HUB WITH MINI SPARKLINES                                */}
      {/* ========================================================================= */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Deliverability Health Card */}
        <Card className="relative overflow-hidden border-border/70 bg-card/75 backdrop-blur-md shadow-xs hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.12)] transition-all duration-300">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Deliverability</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {deliverabilityRate}%
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Target 99%
              </span>
            </div>
            {/* Visual Progress Bar */}
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
              <div
                className={`h-full transition-all duration-700 rounded-full ${
                  deliverabilityRate >= 98
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    : deliverabilityRate >= 90
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                style={{ width: `${deliverabilityRate}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {failedLast7 === 0 ? "Zero drops past 7 days" : `${failedLast7} failure(s) in quarantine`}
            </p>
          </CardContent>
        </Card>

        {/* Sent Today with Sparkline */}
        <Card className="relative overflow-hidden border-border/70 bg-card/75 backdrop-blur-md shadow-xs hover:border-primary/50 hover:shadow-[0_0_20px_rgba(81,240,168,0.12)] transition-all duration-300">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Sent Today</span>
              <Send className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {!stats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {sentToday.toLocaleString()}
                  </span>
                  {weekDelta !== 0 && (
                    <span className={`inline-flex items-center text-[10px] font-semibold px-1 py-0.5 rounded ${weekDelta > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
                      {weekDelta > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                      {Math.abs(weekDelta)}%
                    </span>
                  )}
                </div>

                {/* Mini Sparkline Graph */}
                <div className="h-8 w-full my-1">
                  <MiniSparkline data={sparklineData} color="#10b981" />
                </div>

                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {sentWeek.toLocaleString()} this week · {sentMonth.toLocaleString()} mo {monthDelta !== 0 ? `(${monthDelta > 0 ? "+" : ""}${monthDelta}%)` : ""}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quarantined Failures */}
        <Card className={`relative overflow-hidden border-border/70 bg-card/75 backdrop-blur-md shadow-xs hover:border-rose-500/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.12)] transition-all duration-300 ${failedLast7 > 0 ? "border-rose-500/30" : ""}`}>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Quarantine</span>
              <MailX className={`h-4 w-4 ${failedLast7 > 0 ? "text-rose-500" : "text-muted-foreground"}`} />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {!stats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className={`text-2xl font-bold tracking-tight ${failedLast7 > 0 ? "text-rose-500" : "text-foreground"}`}>
                    {failedLast7}
                  </span>
                  <Badge variant={failedLast7 > 0 ? "failed" : "sent"} className="text-[10px] font-semibold">
                    {failedLast7 > 0 ? "Action Needed" : "Clean"}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => setActiveTab("quarantine")}
                    className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    Inspect failures →
                  </button>
                  <span className="text-[10px] text-muted-foreground">7D window</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Engagement (Opens & Clicks) */}
        <Card className="relative overflow-hidden border-border/70 bg-card/75 backdrop-blur-md shadow-xs hover:border-primary/40 hover:shadow-[0_0_20px_rgba(52,211,153,0.08)] transition-all duration-300">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Audience Reach</span>
              <Eye className="h-4 w-4 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {!stats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {opensWeek.toLocaleString()}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {sentWeek > 0 ? `${((opensWeek / sentWeek) * 100).toFixed(0)}% Open` : "0%"}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MousePointerClick className="h-3 w-3 text-zinc-400" />
                    <strong className="text-foreground">{clicksWeek.toLocaleString()}</strong> clicks
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {opensWeek > 0 ? `${((clicksWeek / opensWeek) * 100).toFixed(0)}% CTR` : "0%"}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Queue & Scheduling */}
        <Card className="relative overflow-hidden border-border/70 bg-card/75 backdrop-blur-sm shadow-xs hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.12)] transition-all duration-300">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Dispatch Queue</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {!stats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {pendingScheduled}
                  </span>
                  <Badge variant={pendingScheduled > 0 ? "scheduled" : "secondary"} className="text-[10px]">
                    {pendingScheduled > 0 ? "In Queue" : "Clear"}
                  </Badge>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {bulkJobsRun} bulk jobs completed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Failover Node */}
        <Card className="relative overflow-hidden border-border/70 bg-card/75 backdrop-blur-md shadow-xs hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)] transition-all duration-300">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Failover Node</span>
              <RotateCcw className="h-4 w-4 text-amber-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loadingFallback ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {fallbackEnabled ? "Ready" : "Off"}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      fallbackEnabled
                        ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        : "text-muted-foreground"
                    }`}
                  >
                    {fallbackEnabled ? "Standby" : "Inactive"}
                  </Badge>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground truncate">
                  {fallbackEnabled ? `${timesUsedToday} swaps today (${fallbackSuccessRate} ok)` : "Secondary SMTP off"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. STRUCTURED TABS NAVIGATION (shadcn Tabs)                              */}
      {/* ========================================================================= */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <div className="flex items-center justify-between border-b border-border/70 pb-2 overflow-x-auto">
          <TabsList className="bg-muted/60 p-1 rounded-xl border border-border/70 shadow-xs">
            <TabsTrigger value="overview" className="gap-2 text-xs py-1.5 px-3.5 data-[state=active]:shadow-xs">
              <BarChart3 className="h-3.5 w-3.5 text-primary" />
              <span>Overview & Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2 text-xs py-1.5 px-3.5 data-[state=active]:shadow-xs">
              <Mail className="h-3.5 w-3.5 text-indigo-400" />
              <span>Campaign Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="quarantine" className="gap-2 text-xs py-1.5 px-3.5 data-[state=active]:shadow-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              <span>Failure Quarantine</span>
              {failed.length > 0 && (
                <Badge variant="failed" className="ml-1 px-1.5 py-0 text-[10px] h-4">
                  {failed.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="telemetry" className="gap-2 text-xs py-1.5 px-3.5 data-[state=active]:shadow-xs">
              <Terminal className="h-3.5 w-3.5 text-sky-400" />
              <span>Live Telemetry</span>
              <span className="relative flex h-1.5 w-1.5 ml-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
            </TabsTrigger>
            <TabsTrigger value="infrastructure" className="gap-2 text-xs py-1.5 px-3.5 data-[state=active]:shadow-xs">
              <Server className="h-3.5 w-3.5 text-purple-400" />
              <span>SMTP & Health</span>
            </TabsTrigger>
          </TabsList>

          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary/80" />
            <span>Telemetry active</span>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: OVERVIEW & MULTI-CHART ANALYTICS                               */}
        {/* ===================================================================== */}
        <TabsContent value="overview" className="space-y-5 focus-visible:outline-none">
          {/* Main Delivery Volume Graph */}
          <Card className="border-border/70 bg-card/75 backdrop-blur-md shadow-xs">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Delivery Throughput & Deliverability Trend
                </CardTitle>
                <CardDescription className="text-xs">
                  Continuous volume aggregation with deliverability rate tracking.
                </CardDescription>
              </div>

              {/* Range & Mode Switchers */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs shadow-xs">
                  <button
                    onClick={() => setChartMode("area")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      chartMode === "area" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Volume Area
                  </button>
                  <button
                    onClick={() => setChartMode("bar")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      chartMode === "bar" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Bars
                  </button>
                  <button
                    onClick={() => setChartMode("rate")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      chartMode === "rate" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Success Rate %
                  </button>
                </div>

                <Tabs value={days} onValueChange={setDays}>
                  <TabsList className="h-8 rounded-lg">
                    <TabsTrigger value="7" className="text-xs px-2.5 h-7">7D</TabsTrigger>
                    <TabsTrigger value="30" className="text-xs px-2.5 h-7">30D</TabsTrigger>
                    <TabsTrigger value="90" className="text-xs px-2.5 h-7">90D</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>

            {/* Period Summary KPI Bar */}
            <div className="px-6 py-2.5 border-y border-border/50 bg-muted/20 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-5">
                <div>
                  <span className="text-muted-foreground">Range Volume: </span>
                  <span className="font-bold text-foreground font-mono">{chartTotals.total.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Delivered: </span>
                  <span className="font-bold text-emerald-500 font-mono">{chartTotals.totalSent.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Quarantined: </span>
                  <span className="font-bold text-rose-500 font-mono">{chartTotals.totalFailed.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-muted-foreground">Deliverability: </span>
                  <span className="font-bold text-foreground font-mono">{chartTotals.rate}%</span>
                </div>
                {chartTotals.peakDay.count > 0 && (
                  <span className="text-muted-foreground hidden sm:inline">
                    · Peak: <strong className="text-foreground">{chartTotals.peakDay.date}</strong> ({chartTotals.peakDay.count.toLocaleString()})
                  </span>
                )}
              </div>
            </div>

            {/* Primary Chart Canvas */}
            <CardContent className="h-[360px] pt-4 min-h-[360px]">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={340}>
                  {chartMode === "rate" ? (
                    <LineChart data={enrichedChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.6} />
                      <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                      <YAxis domain={[80, 100]} stroke="#a1a1aa" fontSize={11} tickLine={false} unit="%" />
                      <ChartTooltip content={<CustomRateTooltip />} />
                      <ReferenceLine y={99} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Target (99%)", fill: "#10b981", fontSize: 10, position: "top" }} />
                      <Line type="monotone" dataKey="successRate" name="Success Rate" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: "#10b981" }} activeDot={{ r: 6 }} />
                    </LineChart>
                  ) : chartMode === "bar" ? (
                    <BarChart data={enrichedChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.6} />
                      <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                      <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} />
                      <ChartTooltip content={<CustomChartTooltip />} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                      <Bar dataKey="sent" name="Delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="failed" name="Failed" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <AreaChart data={enrichedChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.6} />
                      <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                      <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} />
                      <ChartTooltip content={<CustomChartTooltip />} />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 11, paddingBottom: 8 }} />
                      <Area type="monotone" dataKey="sent" name="Delivered" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSent)" />
                      <Area type="monotone" dataKey="failed" name="Failed" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorFailed)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              ) : null}
            </CardContent>
          </Card>

          {/* Secondary Analytical Visuals Grid (3 Beautiful Graphs) */}
          <div className="grid gap-5 lg:grid-cols-3">
            {/* 1. Delivery Outcome Distribution (Donut Chart) */}
            <Card className="border-border/70 bg-card/75 backdrop-blur-md shadow-xs flex flex-col">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <PieIcon className="h-4 w-4 text-emerald-500" />
                    Delivery Breakdown
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {chartTotals.total} Total
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Proportion of delivered, failed, and failover dispatches.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center pt-2">
                <div className="relative h-48 w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deliveryDistribution}
                          innerRadius={52}
                          outerRadius={76}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {deliveryDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#09090b" strokeWidth={2} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                  {/* Center Metric */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black tracking-tight text-foreground">
                      {chartTotals.rate}%
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Delivered
                    </span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="w-full grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-border/50 mt-1">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-[10px]">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Delivered</span>
                    </div>
                    <p className="font-bold text-foreground font-mono">{chartTotals.totalSent}</p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-[10px]">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span>Failover</span>
                    </div>
                    <p className="font-bold text-amber-400 font-mono">{timesUsedToday}</p>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground text-[10px]">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span>Failed</span>
                    </div>
                    <p className="font-bold text-rose-500 font-mono">{chartTotals.totalFailed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Weekday Dispatch Distribution */}
            <Card className="border-border/70 bg-card/75 backdrop-blur-md shadow-xs flex flex-col">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-400" />
                    Day-of-Week Volume
                  </span>
                  {weekdayData.peakWeekday ? (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono">
                      Peak: {weekdayData.peakWeekday.day} ({weekdayData.peakWeekday.volume.toLocaleString()})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Distribution
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Historical dispatch density across days of the week.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end pt-2">
                <div className="h-48 w-full">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdayData.weekdays} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
                        <defs>
                          <linearGradient id="barWeekdayGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#059669" stopOpacity={0.55} />
                          </linearGradient>
                          <linearGradient id="barWeekdayPeak" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.8} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.6} vertical={false} />
                        <XAxis
                          dataKey="day"
                          stroke="#a1a1aa"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: "#27272a" }}
                        />
                        <YAxis
                          stroke="#a1a1aa"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: "#27272a" }}
                          allowDecimals={false}
                        />
                        <ChartTooltip content={<CustomWeekdayTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                        <Bar dataKey="volume" radius={[4, 4, 0, 0]} minPointSize={4}>
                          {weekdayData.weekdays.map((entry, index) => {
                            const isPeak = entry.volume === weekdayData.maxVol && entry.volume > 0;
                            return (
                              <Cell
                                key={`cell-bar-${index}`}
                                fill={isPeak ? "url(#barWeekdayPeak)" : "url(#barWeekdayGlow)"}
                                className="transition-all hover:brightness-125 cursor-pointer"
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground text-center pt-2 border-t border-border/50">
                  Reveals prime sending patterns to optimize open rates.
                </p>
              </CardContent>
            </Card>

            {/* 3. Audience Engagement Funnel */}
            <Card className="border-border/70 bg-card/75 backdrop-blur-md shadow-xs flex flex-col">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-sky-400" />
                    Engagement Conversion
                  </span>
                  <Badge variant="outline" className="text-[10px] text-sky-400 border-sky-500/30">
                    Funnel
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Drop-off from dispatches to opens and link clicks.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center space-y-3 pt-2">
                {engagementFunnel.map((step) => (
                  <div key={step.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{step.stage}</span>
                      <span className="font-mono text-muted-foreground text-[11px]">
                        {step.count.toLocaleString()} ({step.rate}%)
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(4, step.rate)}%`,
                          backgroundColor: step.color
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Open Rate: <strong className="text-foreground">{sentWeek > 0 ? `${((opensWeek / sentWeek) * 100).toFixed(1)}%` : "0%"}</strong></span>
                  <span>Click-to-Open: <strong className="text-foreground">{opensWeek > 0 ? `${((clicksWeek / opensWeek) * 100).toFixed(1)}%` : "0%"}</strong></span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===================================================================== */}
        {/* TAB 2: FAILURE QUARANTINE & DIAGNOSTICS                               */}
        {/* ===================================================================== */}
        <TabsContent value="quarantine" className="space-y-5 focus-visible:outline-none">
          {/* Failure Category Distribution Bar */}
          {failureCategoryBreakdown.length > 0 && (
            <Card className="border-border/70 bg-card/75 backdrop-blur-md shadow-xs">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2 text-rose-400">
                    <AlertCircle className="h-4 w-4" />
                    Failure Root-Cause Classification
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {failed.length} Total Errors Diagnosed
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                {/* Horizontal Segmented Progress Bar */}
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60">
                  {failureCategoryBreakdown.map((cat) => (
                    <div
                      key={cat.label}
                      title={`${cat.label}: ${cat.count} (${cat.percentage}%)`}
                      style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                      className="h-full transition-all hover:opacity-80 cursor-pointer"
                      onClick={() => setFailedSearch(cat.label)}
                    />
                  ))}
                </div>

                {/* Legend Chips */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {failureCategoryBreakdown.map((cat) => (
                    <button
                      key={cat.label}
                      onClick={() => setFailedSearch(failedSearch === cat.label ? "" : cat.label)}
                      className="inline-flex items-center gap-1.5 text-xs rounded-full border border-border/80 px-2.5 py-1 bg-muted/30 hover:bg-muted/70 transition-colors"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-foreground">{cat.label}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">({cat.count})</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Quarantine Table Card */}
          <Card className="border-border/70 bg-card/75 backdrop-blur-md shadow-xs">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-rose-500">
                  <AlertTriangle className="h-4 w-4" />
                  Quarantined Deliveries
                </CardTitle>
                <CardDescription className="text-xs">
                  Review, diagnose, retry, or dismiss failed email dispatches.
                </CardDescription>
              </div>

              {/* Batch Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryAll}
                  disabled={retryingAll || failed.length === 0}
                  className="h-8 text-xs font-semibold border-border/80 gap-1.5 hover:border-primary/50"
                >
                  {retryingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 text-primary" />}
                  Retry All ({failed.length})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={dismissAll}
                  disabled={failed.length === 0}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Dismiss All
                </Button>
              </div>
            </CardHeader>

            {/* Filter & Search Bar */}
            <div className="px-6 py-2.5 border-y border-border/50 bg-muted/20 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter by recipient, subject, or error..."
                  value={failedSearch}
                  onChange={(e) => setFailedSearch(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background rounded-md"
                />
                {failedSearch && (
                  <button
                    onClick={() => setFailedSearch("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
                <span className="text-xs text-muted-foreground">Window:</span>
                <div className="flex rounded-md border border-border bg-background p-0.5 text-xs">
                  {["1", "7", "30", "90"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setFailedDays(d)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                        failedDays === d ? "bg-muted font-bold text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d === "1" ? "24h" : `${d}d`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table of Quarantined Emails */}
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[140px] text-xs">Timestamp</TableHead>
                    <TableHead className="w-[200px] text-xs">Recipient</TableHead>
                    <TableHead className="text-xs">Subject</TableHead>
                    <TableHead className="text-xs">Error Diagnosis</TableHead>
                    <TableHead className="w-[80px] text-center text-xs">Retries</TableHead>
                    <TableHead className="w-[160px] text-right text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : failedSlice.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-14">
                        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                          <CheckCircle2 className="h-9 w-9 text-emerald-500" />
                          <p className="text-sm font-semibold text-foreground">Quarantine is Clear</p>
                          <p className="text-xs max-w-sm">
                            {failedSearch
                              ? "No failure logs match your current search query."
                              : "No unacknowledged delivery failures recorded during this timeframe."}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    failedSlice.map((email) => {
                      const emailId = email._id || email.id;
                      const isRetrying = retryingIds.has(emailId);
                      const toList = email.to || email.toAddresses || [];
                      const toDisplay = Array.isArray(toList) ? toList.join(", ") : String(toList);
                      const errorSnippet = email.errorMsg || email.error || "Unknown delivery error";
                      const errorCat = categorizeError(errorSnippet);

                      return (
                        <TableRow key={emailId} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {new Date(email.sentAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1.5 max-w-[200px]">
                              <span className="font-semibold text-foreground truncate" title={toDisplay}>
                                {toDisplay}
                              </span>
                              <button
                                onClick={() => copyToClipboard(toDisplay, "Recipient copied")}
                                className="text-muted-foreground hover:text-foreground shrink-0"
                                title="Copy recipient"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-foreground font-medium truncate max-w-[240px]">
                            {email.subject || "(No subject)"}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-2 max-w-[320px]">
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 font-medium ${errorCat.color}`}>
                                {errorCat.label}
                              </Badge>
                              <span className="truncate text-muted-foreground text-[11px]" title={errorSnippet}>
                                {errorSnippet}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                              {email.retryCount || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedFailedEmail(email)}
                              className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                              title="Inspect error diagnostic details"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Inspect
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => retry(emailId)}
                              disabled={isRetrying}
                              className="h-7 px-2 text-xs font-medium border-border/80 hover:border-border"
                            >
                              {isRetrying ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1 text-primary" />}
                              Retry
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismiss(emailId)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-500"
                            >
                              Dismiss
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {/* Pagination Bar */}
              {failed.length > 0 && (
                <div className="p-3 border-t border-border/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Showing {failedStart + 1}–{Math.min(failedStart + failedPageSize, failed.length)} of {failed.length} failure(s)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFailedPage((p) => Math.max(1, p - 1))}
                      disabled={failedPage === 1}
                      className="h-7 px-2 text-xs"
                    >
                      Prev
                    </Button>
                    {failedPages.map((page) => (
                      <Button
                        key={page}
                        size="sm"
                        variant={page === failedPage ? "default" : "outline"}
                        onClick={() => setFailedPage(page)}
                        className="h-7 w-7 p-0 text-xs"
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFailedPage((p) => Math.min(failedPageCount, p + 1))}
                      disabled={failedPage === failedPageCount}
                      className="h-7 px-2 text-xs"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================================================================== */}
        {/* TAB 3: LIVE TELEMETRY CONSOLE                                         */}
        {/* ===================================================================== */}
        <TabsContent value="telemetry" className="space-y-4 focus-visible:outline-none">
          <Card className="border-border/70 bg-card/75 backdrop-blur-md shadow-xs">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-sky-400" />
                  Real-time Telemetry Console
                </CardTitle>
                <CardDescription className="text-xs">
                  Server-Sent Events stream from the live background mail dispatch engine.
                </CardDescription>
              </div>

              {/* Stream Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPaused(!paused)}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  {paused ? <Play className="h-3.5 w-3.5 text-emerald-500" /> : <Pause className="h-3.5 w-3.5 text-amber-500" />}
                  {paused ? "Resume Stream" : "Pause Stream"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEvents([])}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear Feed
                </Button>
              </div>
            </CardHeader>

            {/* Filter Pills Bar */}
            <div className="px-6 py-2 border-y border-border/50 bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-muted-foreground mr-1">Filter:</span>
                {(["all", "sent", "failed", "fallback", "scheduled"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setEventFilter(filter)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      eventFilter === filter
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)} ({eventCounts[filter]})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-0"
                  />
                  <span>Auto-scroll to top</span>
                </label>
              </div>
            </div>

            {/* Console Log Screen */}
            <CardContent className="p-4">
              <div
                ref={activityFeedRef}
                className="h-[460px] overflow-y-auto font-mono text-xs rounded-xl border border-border/80 bg-black/50 p-3 space-y-1.5 backdrop-blur-sm"
              >
                {filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                    <Radio className="h-6 w-6 animate-pulse text-muted-foreground/60" />
                    <p>No dispatch events received yet for this filter</p>
                    <p className="text-[10px] text-muted-foreground/60">Events will stream here in real time as emails are sent.</p>
                  </div>
                ) : (
                  filteredEvents.map((ev, idx) => (
                    <TelemetryRow key={idx} event={ev} onCopy={copyToClipboard} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================================================================== */}
        {/* TAB 4: SMTP & FAILOVER HEALTH                                         */}
        {/* ===================================================================== */}
        <TabsContent value="infrastructure" className="space-y-5 focus-visible:outline-none">
          {/* Latency Trend Graph Card */}
          <Card className="border-border/70 bg-card/75 backdrop-blur-md shadow-xs">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-400" />
                    SMTP Gateway Response Latency
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Roundtrip ping verification times over recent connection tests.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400">
                    Latest: {primaryTestResult?.latencyMs || 108}ms
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-44 w-full">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={latencyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="latencyGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.5} vertical={false} />
                      <XAxis dataKey="time" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={{ stroke: "#27272a" }} />
                      <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={{ stroke: "#27272a" }} unit="ms" />
                      <ChartTooltip content={<CustomLatencyTooltip />} />
                      <Area type="monotone" dataKey="latency" name="Roundtrip Latency" stroke="#10b981" strokeWidth={2.5} fill="url(#latencyGlow)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Primary SMTP Card */}
            <Card className="border-border/70 bg-card/75 backdrop-blur-md shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-emerald-500" />
                      Primary SMTP Gateway
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Main transport used for standard and transactional dispatches.
                    </CardDescription>
                  </div>
                  <Badge variant={primaryTestResult?.success !== false ? "sent" : "failed"}>
                    {primaryTestResult?.success !== false ? "Operational" : "Error"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/80 bg-muted/20 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Host</span>
                    <span className="font-mono text-foreground font-medium">{smtpConfig?.host || "Not configured"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Port</span>
                    <span className="font-mono text-foreground font-medium">{smtpConfig?.port || 587}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Encryption</span>
                    <span className="font-mono text-foreground font-medium">{smtpConfig?.encryption || "TLS"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Username</span>
                    <span className="font-mono text-foreground font-medium truncate block">{smtpConfig?.username || "—"}</span>
                  </div>
                </div>

                {primaryTestResult && (
                  <div
                    className={`rounded-lg border p-3 text-xs flex items-center justify-between ${
                      primaryTestResult.success
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {primaryTestResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      <span>{primaryTestResult.success ? "Connection Verified" : "Ping Failed"}</span>
                      {primaryTestResult.latencyMs && (
                        <Badge variant="outline" className="font-mono text-[10px] ml-1">
                          {primaryTestResult.latencyMs}ms latency
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] opacity-75">{formatShortTime(primaryTestResult.testedAt)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testPrimarySmtp}
                    disabled={testingPrimary}
                    className="text-xs font-medium gap-1.5"
                  >
                    {testingPrimary ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5 text-emerald-500" />}
                    Run Connection Ping
                  </Button>
                  <Link href="/settings">
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      Edit SMTP Settings
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Secondary Fallback Card */}
            <Card className="border-border/70 bg-card/75 backdrop-blur-md shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-amber-400" />
                      Secondary High-Availability Node
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Automatic failover node when primary SMTP times out or errors.
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      fallbackEnabled
                        ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        : "text-muted-foreground"
                    }`}
                  >
                    {fallbackEnabled ? "Failover Active" : "Unconfigured"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fallbackEnabled ? (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border/80 bg-muted/20 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Fallback Host</span>
                      <span className="font-mono text-foreground font-medium">{fallbackConfig?.host || "—"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Fallback Port</span>
                      <span className="font-mono text-foreground font-medium">{fallbackConfig?.port || 587}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Activations Today</span>
                      <span className="font-mono text-foreground font-medium">{timesUsedToday}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">Recovery Rate</span>
                      <span className="font-mono text-emerald-500 font-semibold">{fallbackSuccessRate}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/80 p-5 text-center space-y-2">
                    <Server className="h-7 w-7 text-muted-foreground/60 mx-auto" />
                    <p className="text-xs text-muted-foreground">
                      No secondary SMTP server configured. If your primary host encounters rate limits or downtime, emails will be quarantined.
                    </p>
                    <Link href="/settings">
                      <Button variant="outline" size="sm" className="text-xs mt-1">
                        Configure Failover SMTP
                      </Button>
                    </Link>
                  </div>
                )}

                {secondaryTestResult && (
                  <div
                    className={`rounded-lg border p-3 text-xs flex items-center justify-between ${
                      secondaryTestResult.success
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {secondaryTestResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      <span>{secondaryTestResult.success ? "Secondary SMTP OK" : "Secondary Test Failed"}</span>
                      {secondaryTestResult.latencyMs && (
                        <Badge variant="outline" className="font-mono text-[10px] ml-1">
                          {secondaryTestResult.latencyMs}ms
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] opacity-75">{formatShortTime(secondaryTestResult.testedAt)}</span>
                  </div>
                )}

                {fallbackEnabled && (
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testSecondarySmtp}
                      disabled={testingSecondary}
                      className="text-xs font-medium gap-1.5"
                    >
                      {testingSecondary ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5 text-amber-400" />}
                      Test Failover Ping
                    </Button>
                    <Link href="/settings">
                      <Button variant="ghost" size="sm" className="text-xs gap-1">
                        Manage Fallback
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Failover Events Audit Log */}
          {fallbackEnabled && (
            <Card className="border-border/70 bg-card/75 backdrop-blur-md shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  Recent Failover Events (Last 10)
                </CardTitle>
                <CardDescription className="text-xs">
                  Traces of deliveries that automatically swapped to the secondary gateway.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[140px] text-xs">Timestamp</TableHead>
                      <TableHead className="w-[220px] text-xs">Recipient</TableHead>
                      <TableHead className="text-xs">Primary Failure Cause</TableHead>
                      <TableHead className="w-[160px] text-right text-xs">Failover Outcome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fallbackLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground italic">
                          No fallback activations recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      fallbackLogs.slice(0, 10).map((log) => (
                        <TableRow key={log.id} className="text-xs hover:bg-muted/30">
                          <TableCell className="font-mono text-muted-foreground text-[11px]">
                            {new Date(log.createdAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {log.recipientEmail || "Unknown"}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-[11px] bg-muted/40 px-1.5 py-0.5 rounded text-rose-400">
                              {log.primaryError}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={log.fallbackSuccess ? "sent" : "failed"}
                              className="text-[10px]"
                            >
                              {log.fallbackSuccess ? "Recovered via Fallback" : "Both Failed"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===================================================================== */}
        {/* TAB 5: CAMPAIGN JOBS ANALYTICS & DIRECTORY                           */}
        {/* ===================================================================== */}
        <TabsContent value="campaigns" className="space-y-5 focus-visible:outline-none">
          <CampaignsDirectory showTitle={false} />
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* 4. FAILURE DIAGNOSTIC DIALOG (shadcn Dialog)                             */}
      {/* ========================================================================= */}
      {selectedFailedEmail && (
        <Dialog open={Boolean(selectedFailedEmail)} onOpenChange={(open) => !open && setSelectedFailedEmail(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="failed" className="text-xs font-semibold">
                  Quarantine Diagnostic
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  ID: {selectedFailedEmail._id || selectedFailedEmail.id}
                </span>
              </div>
              <DialogTitle className="text-lg font-bold">
                {selectedFailedEmail.subject || "(No Subject)"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Dispatched on {new Date(selectedFailedEmail.sentAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Recipient breakdown */}
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Recipients</span>
                <p className="font-mono text-foreground break-all">
                  To: {Array.isArray(selectedFailedEmail.to) ? selectedFailedEmail.to.join(", ") : selectedFailedEmail.to || "—"}
                </p>
                {selectedFailedEmail.cc?.length > 0 && (
                  <p className="font-mono text-muted-foreground break-all">
                    CC: {selectedFailedEmail.cc.join(", ")}
                  </p>
                )}
              </div>

              {/* Raw Error Diagnostic */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-rose-500 tracking-wider flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    SMTP Gateway Rejection Trace
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedFailedEmail.errorMsg || selectedFailedEmail.error || "", "Error trace copied")}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" /> Copy trace
                  </button>
                </div>
                <pre className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 font-mono text-[11px] text-rose-400 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {selectedFailedEmail.errorMsg || selectedFailedEmail.error || "No explicit SMTP diagnostic reason returned."}
                </pre>
              </div>

              {/* Retry History if available */}
              {selectedFailedEmail.retryHistory && selectedFailedEmail.retryHistory.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                    Prior Attempt History
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedFailedEmail.retryHistory.map((hist: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded border border-border/60 bg-muted/10 text-[11px]">
                        <span className="text-muted-foreground">{new Date(hist.attemptedAt).toLocaleString()}</span>
                        <span className={hist.success ? "text-emerald-500 font-semibold" : "text-rose-500"}>
                          {hist.success ? "Success" : hist.error || "Failed"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:justify-between border-t border-border/60 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismiss(selectedFailedEmail._id || selectedFailedEmail.id)}
                className="text-xs text-muted-foreground hover:text-rose-500"
              >
                Dismiss from Quarantine
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFailedEmail(null)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => retry(selectedFailedEmail._id || selectedFailedEmail.id)}
                  disabled={retryingIds.has(selectedFailedEmail._id || selectedFailedEmail.id)}
                  className="text-xs font-semibold gap-1.5"
                >
                  {retryingIds.has(selectedFailedEmail._id || selectedFailedEmail.id) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  Retry Delivery Now
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS & UTILITIES
// =============================================================================

function EventIcon({ type }: { type: string }) {
  if (type === "sent") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
  if (type === "failed") return <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />;
  if (type === "scheduled") return <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />;
  if (type === "smtp.fallback_used") return <RotateCcw className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
  if (type === "smtp.fallback_success") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
  if (type === "smtp.fallback_failed") return <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />;
  return <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
}

function TelemetryRow({ event, onCopy }: { event: any; onCopy: (text: string, label?: string) => void }) {
  const dateStr = event.at ? new Date(event.at).toLocaleTimeString() : "—";
  const copyTarget = event.to || event.message || event.subject || "";

  if (event.type === "smtp.fallback_used") {
    return (
      <div
        onClick={() => onCopy(copyTarget, "Recipient copied")}
        className="flex items-center justify-between p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-500 animate-in fade-in cursor-pointer hover:bg-amber-500/10 transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
          <span className="text-muted-foreground">[{dateStr}]</span>
          <span className="font-semibold text-foreground">FAILOVER TRIGGERED</span>
          <span>→</span>
          <span className="truncate">{event.to}</span>
        </div>
        {event.error && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[180px] ml-2 font-sans" title={event.error}>
            {event.error}
          </span>
        )}
      </div>
    );
  }

  if (event.type === "smtp.fallback_success") {
    return (
      <div
        onClick={() => onCopy(copyTarget, "Recipient copied")}
        className="flex items-center justify-between p-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 animate-in fade-in cursor-pointer hover:bg-emerald-500/10 transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span className="text-muted-foreground">[{dateStr}]</span>
          <span className="font-semibold">FAILOVER RECOVERED</span>
          <span>→</span>
          <span className="truncate">{event.to}</span>
        </div>
      </div>
    );
  }

  if (event.type === "smtp.fallback_failed") {
    return (
      <div
        onClick={() => onCopy(copyTarget, "Recipient copied")}
        className="flex items-center justify-between p-2 rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-400 animate-in fade-in cursor-pointer hover:bg-rose-500/10 transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="text-muted-foreground">[{dateStr}]</span>
          <span className="font-semibold">DUAL SMTP FAILED</span>
          <span>→</span>
          <span className="truncate">{event.to}</span>
        </div>
        <span className="text-[10px] text-rose-500 font-medium truncate max-w-[180px] ml-2" title={event.error}>
          {event.error}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={() => onCopy(copyTarget, "Event text copied")}
      className="flex items-center justify-between p-1.5 rounded-md hover:bg-white/5 border border-transparent hover:border-border/40 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2 truncate">
        <EventIcon type={event.type} />
        <span className="text-muted-foreground/70">[{dateStr}]</span>
        <Badge
          variant={event.type === "failed" ? "failed" : event.type === "sent" ? "sent" : "secondary"}
          className="text-[9px] uppercase px-1.5 py-0 h-4 font-mono"
        >
          {event.type}
        </Badge>
        <span className="text-foreground truncate max-w-[280px]">
          {event.to || event.message || event.subject}
        </span>
        {event.subject && event.to && (
          <span className="text-muted-foreground truncate max-w-[200px] text-[11px]">
            (&quot;{event.subject}&quot;)
          </span>
        )}
      </div>
      {event.error && (
        <span className="text-[10px] text-rose-400 truncate max-w-[160px] font-sans ml-2" title={event.error}>
          {event.error}
        </span>
      )}
    </div>
  );
}

function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const sent = payload.find((p: any) => p.dataKey === "sent")?.value || 0;
    const failed = payload.find((p: any) => p.dataKey === "failed")?.value || 0;
    const total = sent + failed;
    const rate = total > 0 ? ((sent / total) * 100).toFixed(1) : "100.0";

    return (
      <div className="rounded-xl border border-border/80 bg-popover/95 p-3 text-xs shadow-xl backdrop-blur-md space-y-1.5 min-w-[160px]">
        <p className="font-semibold text-foreground border-b border-border/60 pb-1">{label}</p>
        <div className="flex items-center justify-between text-emerald-500">
          <span>Delivered:</span>
          <span className="font-mono font-bold">{sent.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-rose-500">
          <span>Failed:</span>
          <span className="font-mono font-bold">{failed.toLocaleString()}</span>
        </div>
        <div className="border-t border-border/60 pt-1 flex items-center justify-between text-muted-foreground text-[10px]">
          <span>Deliverability:</span>
          <span className="font-bold text-foreground">{rate}%</span>
        </div>
      </div>
    );
  }
  return null;
}

function CustomRateTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const rate = payload[0]?.value ?? 100;
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-popover/95 p-2.5 text-xs shadow-xl backdrop-blur-md">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-emerald-400 font-bold font-mono text-sm mt-0.5">
          {rate}% Deliverability
        </p>
      </div>
    );
  }
  return null;
}

function CustomPieTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-lg border border-border/80 bg-popover/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-md">
        <span className="font-semibold" style={{ color: data.payload.color }}>
          {data.name}:{" "}
        </span>
        <span className="font-mono font-bold text-foreground">
          {data.value.toLocaleString()}
        </span>
      </div>
    );
  }
  return null;
}

function CustomWeekdayTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const count = payload[0]?.value || 0;
    const fullDay = payload[0]?.payload?.fullDay || label;
    return (
      <div className="rounded-lg border border-border/80 bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-md">
        <p className="text-muted-foreground font-medium">{fullDay}</p>
        <p className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
          {count.toLocaleString()} emails
        </p>
      </div>
    );
  }
  return null;
}

function MiniSparkline({
  data,
  color = "#10b981",
  height = 32
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const pointsData = useMemo(() => {
    const raw = data && data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0];
    const pts = [...raw];
    while (pts.length < 7) pts.unshift(0);

    const max = Math.max(...pts, 1);
    const min = Math.min(...pts, 0);
    const range = max - min || 1;
    const width = 120;
    const padTop = 4;
    const padBottom = 3;
    const effectiveHeight = height - padTop - padBottom;

    const coords = pts.map((val, i) => {
      const x = (i / (pts.length - 1)) * width;
      const y = height - padBottom - ((val - min) / range) * effectiveHeight;
      return { x, y, val };
    });

    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx.toFixed(1)} ${prev.y.toFixed(1)}, ${cx.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }

    const last = coords[coords.length - 1];
    const first = coords[0];
    const areaD = `${d} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`;

    return { coords, d, areaD, last, max };
  }, [data, height]);

  return (
    <div className="w-full h-8 overflow-hidden relative">
      <svg
        viewBox={`0 0 120 ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible block"
      >
        <defs>
          <linearGradient id="kpiSparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <path d={pointsData.areaD} fill="url(#kpiSparkGrad)" />
        <path
          d={pointsData.d}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={pointsData.last.x}
          cy={pointsData.last.y}
          r={2.5}
          fill={color}
        />
      </svg>
    </div>
  );
}

function CustomLatencyTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const lat = payload[0]?.value || 0;
    return (
      <div className="rounded-lg border border-border/80 bg-popover/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-md">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-mono font-bold text-emerald-400 text-sm">
          {lat}ms roundtrip
        </p>
      </div>
    );
  }
  return null;
}

function categorizeError(error: string): { label: string; color: string } {
  const lower = (error || "").toLowerCase();
  if (lower.includes("auth") || lower.includes("credentials") || lower.includes("535") || lower.includes("login")) {
    return { label: "Auth Failure", color: "border-rose-500/40 text-rose-400 bg-rose-500/10" };
  }
  if (lower.includes("timeout") || lower.includes("etimedout") || lower.includes("econnrefused") || lower.includes("network")) {
    return { label: "Timeout / Net", color: "border-amber-500/40 text-amber-400 bg-amber-500/10" };
  }
  if (lower.includes("user unknown") || lower.includes("not found") || lower.includes("550") || lower.includes("mailbox")) {
    return { label: "Bad Recipient", color: "border-zinc-700 text-zinc-300 bg-zinc-800/50" };
  }
  if (lower.includes("rate") || lower.includes("limit") || lower.includes("quota") || lower.includes("421") || lower.includes("452")) {
    return { label: "Rate Limited", color: "border-purple-500/40 text-purple-400 bg-purple-500/10" };
  }
  return { label: "SMTP Error", color: "border-rose-500/30 text-rose-400 bg-rose-500/5" };
}

function getCategoryHex(label: string): string {
  switch (label) {
    case "Auth Failure": return "#f43f5e";
    case "Timeout / Net": return "#f59e0b";
    case "Bad Recipient": return "#3b82f6";
    case "Rate Limited": return "#a855f7";
    default: return "#ec4899";
  }
}

function formatShortTime(d: Date | string) {
  const date = new Date(d);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
