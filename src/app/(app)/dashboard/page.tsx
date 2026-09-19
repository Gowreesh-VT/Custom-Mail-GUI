"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  MousePointerClick,
  PenLine,
  RefreshCw,
  Send,
  Server,
  Settings,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis
} from "recharts";
import { apiFetch } from "@/lib/client-api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    dailyLimit: number;
    monthlyLimit: number;
  };
  smtpStatus: {
    isConfigured: boolean;
    relayInfo: {
      label: string;
      host: string;
      port: number;
      fromEmail: string;
      encryption: string;
      lastTestedAt: string | null;
      lastTestSuccess: boolean | null;
      lastTestLatency: number | null;
      isPool: boolean;
    } | null;
    poolCount: number;
  };
  stats: {
    sentToday: number;
    sentThisMonth: number;
    totalSent: number;
    failedToday: number;
    failedThisWeek: number;
    totalFailed: number;
    scheduledPending: number;
    draftsCount: number;
    templatesCount: number;
    qrCampaignsCount: number;
    certificatesCount: number;
    totalOpens: number;
    totalClicks: number;
    deliverabilityRate: number;
    openRate: number;
    clickRate: number;
    dailyLimit: number;
    monthlyLimit: number;
  };
  trendChart: Array<{
    date: string;
    label: string;
    sent: number;
    failed: number;
    opens: number;
    clicks: number;
  }>;
  recentEmails: Array<{
    id: string;
    to: string[];
    subject: string;
    status: string;
    isBulk: boolean;
    sentAt: string;
    openCount: number;
    clickCount: number;
    usedFallbackSmtp: boolean;
  }>;
  upcomingScheduled: Array<{
    id: string;
    to: string[];
    subject: string;
    scheduledAt: string;
    status: string;
  }>;
  recentDrafts: Array<{
    id: string;
    to: string[];
    subject: string;
    updatedAt: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartMetric, setChartMetric] = useState<"volume" | "engagement">("volume");
  const [queueTab, setQueueTab] = useState<"scheduled" | "drafts">("scheduled");
  const [mounted, setMounted] = useState(false);

  const loadDashboard = async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await apiFetch<DashboardData & { success: boolean }>("/api/user/dashboard");
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadDashboard(true);
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric"
    }).format(new Date());
  }, []);

  const userFirstName = data?.user?.name ? data.user.name.split(" ")[0] : "there";

  const trendTotals = useMemo(() => {
    if (!data?.trendChart) return { sent: 0, failed: 0, opens: 0, clicks: 0 };
    return data.trendChart.reduce(
      (acc, d) => ({
        sent: acc.sent + (d.sent || 0),
        failed: acc.failed + (d.failed || 0),
        opens: acc.opens + (d.opens || 0),
        clicks: acc.clicks + (d.clicks || 0)
      }),
      { sent: 0, failed: 0, opens: 0, clicks: 0 }
    );
  }, [data]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Executive Control Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {greeting}, {userFirstName}
            </h1>
            {/* Real-time SMTP operational badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-border/80 bg-secondary/40 text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  data?.smtpStatus?.isConfigured
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-amber-400"
                )}
              />
              <span>
                {data?.smtpStatus?.isConfigured
                  ? `Relay Operational${data.smtpStatus.relayInfo?.lastTestLatency ? ` · ${data.smtpStatus.relayInfo.lastTestLatency}ms` : ""}`
                  : "Relay Not Configured"}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {formattedDate} · Real-time dispatch telemetry, recipient engagement, and delivery engine health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center text-xs font-mono text-muted-foreground px-2.5 py-1 rounded-md border border-border/60 bg-secondary/20">
            Last 14 Days
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadDashboard(false)}
            disabled={refreshing}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
            title="Refresh metrics"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
          <Button
            asChild
            size="sm"
            className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs rounded-lg"
          >
            <Link href="/compose">
              <PenLine className="h-3.5 w-3.5 mr-1.5" />
              New Campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Primary Production KPI Metric Cards */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Dispatched Today */}
        <Card className="border-border/70 bg-card/60 backdrop-blur-xs shadow-2xs hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4.5 space-y-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Dispatched Today
            </span>
            <Send className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4.5 pb-4 space-y-2">
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
                {data?.stats?.sentToday.toLocaleString() ?? 0}
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
              <span>{data?.stats?.sentThisMonth.toLocaleString() ?? 0} this month</span>
              {data?.stats?.dailyLimit && data.stats.dailyLimit > 0 ? (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {Math.round(((data.stats.sentToday || 0) / data.stats.dailyLimit) * 100)}% daily limit
                </span>
              ) : (
                <span className="text-emerald-400 font-medium">Unlimited Relay</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deliverability Rate */}
        <Card className="border-border/70 bg-card/60 backdrop-blur-xs shadow-2xs hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4.5 space-y-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Deliverability
            </span>
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4.5 pb-4 space-y-2">
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
                  {data?.stats?.deliverabilityRate ?? 100}%
                </span>
                <span className="text-[11px] text-muted-foreground">success</span>
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Healthy
              </span>
              <span>{data?.stats?.failedToday ?? 0} failures today</span>
            </div>
          </CardContent>
        </Card>

        {/* Open Rate */}
        <Card className="border-border/70 bg-card/60 backdrop-blur-xs shadow-2xs hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4.5 space-y-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Open Rate
            </span>
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4.5 pb-4 space-y-2">
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold font-mono tracking-tight text-teal-400">
                {data?.stats?.openRate ?? 0}%
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
              <span>{data?.stats?.totalOpens.toLocaleString() ?? 0} opens tracked</span>
              <span className="font-mono text-[10px]">Avg/send</span>
            </div>
          </CardContent>
        </Card>

        {/* Click Rate */}
        <Card className="border-border/70 bg-card/60 backdrop-blur-xs shadow-2xs hover:border-border transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4.5 space-y-0">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Click Rate
            </span>
            <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4.5 pb-4 space-y-2">
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold font-mono tracking-tight text-purple-400">
                {data?.stats?.clickRate ?? 0}%
              </div>
            )}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
              <span>{data?.stats?.totalClicks.toLocaleString() ?? 0} clicks recorded</span>
              <span className="font-mono text-[10px]">Avg/send</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Telemetry Stream & SMTP Relay Health */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left (2/3 Col): 14-Day Delivery & Interaction Telemetry */}
        <Card className="lg:col-span-2 border-border/70 bg-card/60 backdrop-blur-xs flex flex-col justify-between">
          <div>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 pt-4 px-5 space-y-2 sm:space-y-0">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> 14-Day Dispatch & Telemetry Stream
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Daily dispatch volume, failures, and recipient telemetry across your workspace.
                </CardDescription>
              </div>
              <div className="flex items-center p-0.5 rounded-lg border border-border/60 bg-background/80">
                <button
                  onClick={() => setChartMetric("volume")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                    chartMetric === "volume"
                      ? "bg-secondary text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Volume
                </button>
                <button
                  onClick={() => setChartMetric("engagement")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                    chartMetric === "engagement"
                      ? "bg-secondary text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Engagement
                </button>
              </div>
            </CardHeader>

            {/* 14-Day Aggregated Totals Strip */}
            <div className="grid grid-cols-4 border-y border-border/40 bg-secondary/10 px-5 py-2.5 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">14d Dispatched</span>
                <p className="font-mono font-semibold text-foreground mt-0.5">{trendTotals.sent.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">14d Failed</span>
                <p className={cn("font-mono font-semibold mt-0.5", trendTotals.failed > 0 ? "text-rose-400" : "text-muted-foreground")}>
                  {trendTotals.failed.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">14d Opens</span>
                <p className="font-mono font-semibold text-teal-400 mt-0.5">{trendTotals.opens.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">14d Clicks</span>
                <p className="font-mono font-semibold text-purple-400 mt-0.5">{trendTotals.clicks.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <CardContent className="pt-4 px-5 pb-5 flex-1 flex flex-col justify-center">
            <div className="h-64 w-full">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : mounted && data?.trendChart && data.trendChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartMetric === "volume" ? (
                    <AreaChart data={data.trendChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgb(16, 185, 129)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="rgb(16, 185, 129)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="rgb(239, 68, 68)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="rgb(239, 68, 68)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <ChartTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "0.5rem",
                          fontSize: "12px"
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Area type="monotone" dataKey="sent" name="Dispatched" stroke="rgb(16, 185, 129)" strokeWidth={2} fillOpacity={1} fill="url(#sentGrad)" />
                      <Area type="monotone" dataKey="failed" name="Failed" stroke="rgb(239, 68, 68)" strokeWidth={2} fillOpacity={1} fill="url(#failGrad)" />
                    </AreaChart>
                  ) : (
                    <BarChart data={data.trendChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <ChartTooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "0.5rem",
                          fontSize: "12px"
                        }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                      <Bar dataKey="opens" name="Opens" fill="rgb(45, 212, 191)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="clicks" name="Clicks" fill="rgb(168, 85, 247)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No dispatch activity recorded in the last 14 days.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right (1/3 Col): SMTP Relay Node Health & Monthly Quota */}
        <Card className="border-border/70 bg-card/60 backdrop-blur-xs flex flex-col justify-between">
          <CardHeader className="pb-3 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-400" /> SMTP Relay Node
              </CardTitle>
              <Badge
                variant={data?.smtpStatus?.isConfigured ? "sent" : "warning"}
                className="text-[10px] py-0.5 px-2"
              >
                {data?.smtpStatus?.isConfigured ? "Active" : "Not Set"}
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Primary outbound delivery cluster.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3.5 px-5 flex-1">
            <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Host</span>
                <span className="font-mono font-medium text-foreground truncate max-w-[160px]">
                  {data?.smtpStatus?.relayInfo?.host || "No host set"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Port & TLS</span>
                <span className="font-mono text-muted-foreground">
                  {data?.smtpStatus?.relayInfo
                    ? `${data.smtpStatus.relayInfo.port} (${data.smtpStatus.relayInfo.encryption})`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Sender Email</span>
                <span className="font-mono text-foreground truncate max-w-[160px]">
                  {data?.smtpStatus?.relayInfo?.fromEmail || "—"}
                </span>
              </div>
              {data?.smtpStatus?.relayInfo?.lastTestLatency && (
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border/40">
                  <span className="text-muted-foreground">Latency</span>
                  <span className="font-mono text-emerald-400 font-medium flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {data.smtpStatus.relayInfo.lastTestLatency}ms
                  </span>
                </div>
              )}
            </div>

            {/* Monthly Quota */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Monthly Quota</span>
                <span className="font-mono text-muted-foreground text-[11px]">
                  {data?.stats?.sentThisMonth.toLocaleString() ?? 0} /{" "}
                  {data?.stats?.monthlyLimit && data.stats.monthlyLimit > 0
                    ? data.stats.monthlyLimit.toLocaleString()
                    : "Unlimited"}
                </span>
              </div>
              {data?.stats?.monthlyLimit && data.stats.monthlyLimit > 0 ? (
                <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        Math.round(((data.stats.sentThisMonth || 0) / data.stats.monthlyLimit) * 100),
                        100
                      )}%`
                    }}
                  />
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" /> No throughput ceiling enforced
                </div>
              )}
            </div>
          </CardContent>

          <div className="p-4 pt-0 border-t border-border/50 mt-auto">
            <Link
              href="/settings"
              className="flex items-center justify-between text-xs text-muted-foreground hover:text-foreground pt-3 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5" /> Configure Relay & Failover Pool
              </span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* High-Density Dispatch Activity Table & Pipeline Manager */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left (2/3 Col): Dispatch Activity Log */}
        <Card className="lg:col-span-2 border-border/70 bg-card/60 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-5">
            <div>
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-400" /> Recent Email Dispatches
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Latest outgoing messages processed through your SMTP relay cluster.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-7 px-2">
              <Link href="/sent">
                All History <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data?.recentEmails && data.recentEmails.length > 0 ? (
              <div className="divide-y divide-border/40 text-xs">
                {/* Table Header */}
                <div className="grid grid-cols-12 px-5 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-secondary/15">
                  <span className="col-span-2 sm:col-span-2">Status</span>
                  <span className="col-span-5 sm:col-span-4">Recipient</span>
                  <span className="hidden sm:block sm:col-span-3">Subject</span>
                  <span className="col-span-3 sm:col-span-2 text-right sm:text-center">Opens / Clicks</span>
                  <span className="col-span-2 sm:col-span-1 text-right">Time</span>
                </div>

                {data.recentEmails.map((email) => {
                  const recipientStr = email.to.length > 0 ? email.to[0] : "Recipient";
                  const additionalRecipients = email.to.length > 1 ? ` +${email.to.length - 1}` : "";
                  return (
                    <Link
                      key={email.id}
                      href={`/sent/${email.id}`}
                      className="group grid grid-cols-12 items-center px-5 py-2.5 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="col-span-2 sm:col-span-2 flex items-center">
                        <Badge
                          variant={email.status === "sent" ? "sent" : "failed"}
                          className="text-[9px] uppercase font-bold py-0 h-4"
                        >
                          {email.status}
                        </Badge>
                      </div>
                      <div className="col-span-5 sm:col-span-4 truncate pr-2">
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {recipientStr}
                        </span>
                        <span className="text-muted-foreground">{additionalRecipients}</span>
                      </div>
                      <div className="hidden sm:flex sm:col-span-3 items-center gap-1.5 truncate pr-2">
                        <span className="truncate text-muted-foreground">
                          {email.subject}
                        </span>
                        {email.isBulk && (
                          <span className="text-[9px] px-1 py-0.2 rounded border border-teal-500/30 text-teal-400 bg-teal-500/5 shrink-0">
                            Bulk
                          </span>
                        )}
                      </div>
                      <div className="col-span-3 sm:col-span-2 flex items-center justify-end sm:justify-center gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-0.5" title="Opens">
                          <Eye className="h-3 w-3 text-muted-foreground/70" /> {email.openCount}
                        </span>
                        <span className="flex items-center gap-0.5" title="Clicks">
                          <MousePointerClick className="h-3 w-3 text-muted-foreground/70" /> {email.clickCount}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1 text-right font-mono text-[11px] text-muted-foreground">
                        {new Date(email.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-3">
                <p>No emails dispatched yet.</p>
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs">
                  <Link href="/compose">Send First Email</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right (1/3 Col): Pipeline Queue Manager */}
        <Card className="border-border/70 bg-card/60 backdrop-blur-xs flex flex-col">
          <CardHeader className="pb-2 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Pipeline Manager</CardTitle>
              <div className="flex items-center p-0.5 rounded-lg border border-border/60 bg-background/80">
                <button
                  onClick={() => setQueueTab("scheduled")}
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors",
                    queueTab === "scheduled"
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Scheduled ({data?.stats?.scheduledPending ?? 0})
                </button>
                <button
                  onClick={() => setQueueTab("drafts")}
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors",
                    queueTab === "drafts"
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Drafts ({data?.stats?.draftsCount ?? 0})
                </button>
              </div>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {queueTab === "scheduled"
                ? "Pending deliveries queued for automated dispatch."
                : "Saved draft messages ready to resume."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            {loading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : queueTab === "scheduled" ? (
              data?.upcomingScheduled && data.upcomingScheduled.length > 0 ? (
                <div className="divide-y divide-border/40">
                  {data.upcomingScheduled.map((item) => (
                    <Link
                      key={item.id}
                      href="/scheduled"
                      className="group block p-3 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground truncate max-w-[170px] group-hover:text-primary transition-colors">
                          {item.to?.[0] || "Recipient"}
                        </span>
                        <Badge variant="scheduled" className="text-[9px] py-0">
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.subject}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-indigo-400" />
                          {new Date(item.scheduledAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                          })}
                        </span>
                        <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Manage →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <Clock className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
                  No emails currently scheduled.
                </div>
              )
            ) : (
              data?.recentDrafts && data.recentDrafts.length > 0 ? (
                <div className="divide-y divide-border/40">
                  {data.recentDrafts.map((draft) => (
                    <Link
                      key={draft.id}
                      href="/drafts"
                      className="group block p-3 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground truncate max-w-[180px] group-hover:text-primary transition-colors">
                          {draft.to?.[0] || "No recipient yet"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(draft.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {draft.subject || "Untitled draft"}
                      </p>
                      <div className="mt-1 flex justify-end">
                        <span className="text-[11px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                          Resume draft →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <FileText className="h-5 w-5 text-muted-foreground/30 mx-auto mb-2" />
                  No saved drafts.
                </div>
              )
            )}
          </CardContent>
          <div className="p-3 border-t border-border/50 mt-auto bg-secondary/10 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Queue Explorer</span>
            <Link
              href={queueTab === "scheduled" ? "/scheduled" : "/drafts"}
              className="text-primary font-medium hover:underline text-xs flex items-center gap-1"
            >
              View All {queueTab === "scheduled" ? "Scheduled" : "Drafts"} →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
