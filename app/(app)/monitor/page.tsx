"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Clock, MailCheck, MailX, RefreshCw, Send } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
const icons: any = { today: MailCheck, week: Send, month: MailCheck, failed: MailX, scheduled: Clock, bulk: RefreshCw };

export default function MonitorPage() {
  const [stats, setStats] = useState<any[] | null>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [failed, setFailed] = useState<any[]>([]);
  const [failedPage, setFailedPage] = useState(1);
  const failedPageSize = 7;
  const [days, setDays] = useState("30");
  const [events, setEvents] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const [fallbackEnabled, setFallbackEnabled] = useState(false);
  const [fallbackLogs, setFallbackLogs] = useState<any[]>([]);
  const [loadingFallback, setLoadingFallback] = useState(true);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const load = useCallback(async () => {
    const [s, c, f] = await Promise.all([apiFetch<any>("/api/monitor/stats"), apiFetch<any>(`/api/monitor/chart?days=${days}`), apiFetch<any>("/api/monitor/failed?days=7")]);
    setStats(s.stats); setChart(c.data); setFailed(f.failed);
  }, [days]);

  const loadFallback = useCallback(async () => {
    try {
      const secData = await apiFetch<any>("/api/smtp/settings/secondary");
      setFallbackEnabled(Boolean(secData.enabled));
      if (secData.enabled) {
        const logsData = await apiFetch<any>("/api/smtp/fallback-logs");
        setFallbackLogs(logsData.logs || []);
      }
    } catch (error) {
      console.error("Failed to load fallback details", error);
    } finally {
      setLoadingFallback(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    load();
    loadFallback();
    const timer = setInterval(() => {
      load();
      loadFallback();
    }, 60000);
    return () => clearInterval(timer);
  }, [load, loadFallback]);

  useEffect(() => {
    const source = new EventSource("/api/monitor/stream");
    source.onmessage = (event) => setEvents((current) => [JSON.parse(event.data), ...current].slice(0, 100));
    source.onerror = () => setEvents((current) => [{ type: "info", message: "Reconnecting...", at: new Date().toISOString() }, ...current].slice(0, 100));
    return () => source.close();
  }, []);
  useEffect(() => { if (!paused) bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [events, paused]);

  const lastFailed = useMemo(() => failed[0], [failed]);
  const failedPageCount = Math.max(1, Math.ceil(failed.length / failedPageSize));
  const failedStart = (failedPage - 1) * failedPageSize;
  const failedSlice = failed.slice(failedStart, failedStart + failedPageSize);
  const failedPages = useMemo(() => Array.from({ length: failedPageCount }, (_, index) => index + 1), [failedPageCount]);
  useEffect(() => {
    setFailedPage(1);
  }, [failed.length]);
  async function retry(id: string) {
    try { await apiFetch(`/api/monitor/retry/${id}`, { method: "POST", body: "{}" }); toast.success("Retry sent"); load(); } catch (error: any) { toast.error(error.message); }
  }
  async function dismiss(id: string) {
    await apiFetch(`/api/monitor/dismiss/${id}`, { method: "POST", body: "{}" });
    toast.success("Dismissed");
    load();
  }
  async function dismissAll() {
    if (failed.length === 0) return;
    await Promise.all(failed.map((email) => apiFetch(`/api/monitor/dismiss/${email._id}`, { method: "POST", body: "{}" })));
    toast.success("All dismissed");
    load();
  }
  const timesUsedToday = useMemo(() => {
    const todayStr = new Date().toDateString();
    return fallbackLogs.filter(log => new Date(log.createdAt).toDateString() === todayStr).length;
  }, [fallbackLogs]);

  const successRate = useMemo(() => {
    if (fallbackLogs.length === 0) return "0%";
    const success = fallbackLogs.filter(log => log.fallbackSuccess).length;
    return `${Math.round((success / fallbackLogs.length) * 100)}%`;
  }, [fallbackLogs]);

  const lastSuccess = useMemo(() => {
    const successLogs = fallbackLogs.filter(log => log.fallbackSuccess);
    if (successLogs.length === 0) return "Never";
    return formatHealthTime(successLogs[0].createdAt);
  }, [fallbackLogs]);

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold tracking-normal">Monitor</h1><p className="text-sm text-muted-foreground">Health, activity, failures, and throughput.</p></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {!stats ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />) : stats.map((stat) => {
          const Icon = icons[stat.key] || MailCheck;
          return <Card key={stat.key}><CardHeader className="pb-2"><CardTitle className="flex items-center justify-between text-sm font-medium">{stat.label}<Icon className="h-4 w-4 text-muted-foreground" /></CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{stat.value}</div><p className={stat.delta >= 0 ? "text-xs text-sent" : "text-xs text-failed"}>{stat.delta >= 0 ? "↑" : "↓"} {Math.abs(stat.delta)}% vs previous</p></CardContent></Card>;
        })}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Send Volume</CardTitle><Tabs value={days} onValueChange={setDays}><TabsList><TabsTrigger value="7">7 days</TabsTrigger><TabsTrigger value="30">30 days</TabsTrigger><TabsTrigger value="90">90 days</TabsTrigger></TabsList></Tabs></CardHeader>
          <CardContent className="h-80 min-h-[320px] min-w-0">{mounted ? <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={320}><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><ChartTooltip /><Legend /><Bar dataKey="sent" fill="var(--chart-1)" /><Bar dataKey="failed" fill="var(--chart-3)" /></BarChart></ResponsiveContainer> : null}</CardContent>
        </Card>
        <div className="space-y-4">
          <Card className={lastFailed ? "border-failed/40" : ""}>
            <CardHeader><CardTitle>SMTP Health</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Badge variant={lastFailed ? "failed" : "sent"}>{lastFailed ? "Attention Needed" : "Ready"}</Badge>
              <p className="text-sm text-muted-foreground">Use Settings to test the saved SMTP connection and update the live status log.</p>
              <Button variant="outline" onClick={() => apiFetch("/api/smtp/test", { method: "POST", body: "{}" }).then(() => toast.success("SMTP connected")).catch((e) => toast.error(e.message))}>Test Now</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">🔄 Fallback Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingFallback ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !fallbackEnabled ? (
                <div className="text-center py-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Fallback SMTP not configured</p>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = "/settings"}>
                    Configure in Settings →
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-md border p-2 bg-muted/20">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold">Used Today</p>
                      <p className="text-base font-bold">{timesUsedToday}</p>
                    </div>
                    <div className="rounded-md border p-2 bg-muted/20">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold">Success Rate</p>
                      <p className="text-base font-bold text-sent">{successRate}</p>
                    </div>
                    <div className="rounded-md border p-2 bg-muted/20 col-span-2">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold">Last Success</p>
                      <p className="text-xs font-medium">{lastSuccess}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Recent Triggers (Last 5)</p>
                    {fallbackLogs.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No fallback events logged yet</p>
                    ) : (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {fallbackLogs.slice(0, 5).map((log) => (
                          <div key={log.id} className="rounded border p-2 text-[11px] bg-muted/10 space-y-1 animate-in fade-in">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>{formatHealthTime(log.createdAt)}</span>
                              {log.primaryErrorCode && <span className="font-mono text-[9px] bg-failed/10 text-failed px-1 rounded">{log.primaryErrorCode}</span>}
                            </div>
                            <p className="text-muted-foreground line-clamp-2">
                              Primary failed: <span className="text-foreground font-medium">{log.primaryError}</span>
                            </p>
                            <div className="flex items-center gap-1.5 pt-0.5 border-t border-dashed">
                              <span>→ Fallback:</span>
                              <span className={log.fallbackSuccess ? "text-sent font-semibold" : "text-failed font-semibold"}>
                                {log.fallbackSuccess ? "✅ Succeeded" : "❌ Failed"}
                              </span>
                              {!log.fallbackSuccess && log.fallbackError && (
                                <span className="text-muted-foreground text-[10px] truncate max-w-[120px]" title={log.fallbackError}>({log.fallbackError})</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowLogsModal(true)}>
                    View all fallback logs
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Activity Feed</CardTitle><Button variant="outline" size="sm" onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</Button></CardHeader>
          <CardContent className="h-80 overflow-auto rounded-md border p-3 text-sm">
            {events.map((event, index) => {
              const dateStr = new Date(event.at).toLocaleTimeString();
              if (event.type === "smtp.fallback_used") {
                return (
                  <div key={index} className="border-b py-2 flex items-center justify-between text-amber-600 bg-amber-500/5 px-2 rounded-md my-1 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2">
                      <span>🔄</span>
                      <span className="font-mono text-xs">[{dateStr}]</span>
                      <span className="font-semibold">Fallback triggered</span>
                      <span>→</span>
                      <span>{event.to}</span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">primary: {event.error}</span>
                  </div>
                );
              }
              if (event.type === "smtp.fallback_success") {
                return (
                  <div key={index} className="border-b py-2 flex items-center gap-2 text-emerald-600 bg-emerald-500/5 px-2 rounded-md my-1 animate-in slide-in-from-top duration-300">
                    <span>✅</span>
                    <span className="font-mono text-xs">[{dateStr}]</span>
                    <span className="font-semibold">Fallback succeeded</span>
                    <span>→</span>
                    <span>{event.to}</span>
                  </div>
                );
              }
              if (event.type === "smtp.fallback_failed") {
                return (
                  <div key={index} className="border-b py-2 flex items-center justify-between text-red-600 bg-red-500/5 px-2 rounded-md my-1 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2">
                      <span>❌</span>
                      <span className="font-mono text-xs">[{dateStr}]</span>
                      <span className="font-semibold">Both SMTP failed</span>
                      <span>→</span>
                      <span>{event.to}</span>
                    </div>
                    <span className="text-xs text-red-500 font-medium truncate max-w-[150px]">error: {event.error}</span>
                  </div>
                );
              }

              return (
                <div key={index} className="border-b py-2">
                  <Badge variant={event.type === "failed" ? "failed" : event.type === "sent" ? "sent" : "scheduled"}>
                    {event.type}
                  </Badge>{" "}
                  <span className="ml-2">{event.to || event.message || event.subject}</span>
                  {event.error && <span className="text-muted-foreground text-xs"> ({event.error})</span>}
                </div>
              );
            })}
            <div ref={bottom} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Failed Emails</CardTitle><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => apiFetch("/api/monitor/retry-all", { method: "POST", body: JSON.stringify({ days: 7 }) }).then(() => { toast.success("Retry all started"); load(); })}>Retry All</Button><Button variant="ghost" size="sm" onClick={dismissAll} disabled={failed.length === 0}>Dismiss All</Button></div></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedSlice.map((email) => (
                  <TableRow key={email._id}>
                    <TableCell>{new Date(email.sentAt).toLocaleDateString()}</TableCell>
                    <TableCell>{email.to?.join(", ")}</TableCell>
                    <TableCell>{email.subject}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => retry(email._id)}>Retry</Button>
                      <Button size="sm" variant="ghost" onClick={() => dismiss(email._id)}>Dismiss</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {failedSlice.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No failed emails.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">Showing {failed.length === 0 ? 0 : failedStart + 1}-{Math.min(failedStart + failedPageSize, failed.length)} of {failed.length}</div>
              <div className="flex flex-wrap gap-2">
                {failedPages.map((page) => (
                  <Button key={page} size="sm" variant={page === failedPage ? "default" : "outline"} onClick={() => setFailedPage(page)}>{page}</Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <Card className="w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">🔄 Fallback SMTP Logs</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowLogsModal(false)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto p-4 space-y-3 flex-1">
              {fallbackLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No fallback events found.</p>
              ) : (
                <div className="space-y-3">
                  {fallbackLogs.map((log) => (
                    <div key={log.id} className="rounded-md border p-3 text-xs bg-muted/10 space-y-2">
                      <div className="flex items-center justify-between text-muted-foreground border-b pb-1">
                        <span className="font-semibold text-foreground">{log.recipientEmail ? `To: ${log.recipientEmail}` : "Fallback Run"}</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="space-y-1">
                        <p>
                          <span className="text-muted-foreground font-medium">Primary SMTP Error:</span>{" "}
                          <span className="font-mono bg-muted/40 px-1 py-0.5 rounded text-failed">{log.primaryError}</span>
                          {log.primaryErrorCode && <span className="ml-1 text-muted-foreground font-mono">({log.primaryErrorCode})</span>}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground font-medium">Fallback SMTP Result:</span>
                          <span className={log.fallbackSuccess ? "text-sent font-semibold" : "text-failed font-semibold"}>
                            {log.fallbackSuccess ? "✅ Succeeded" : "❌ Failed"}
                          </span>
                          {!log.fallbackSuccess && log.fallbackError && (
                            <span className="text-muted-foreground font-mono bg-muted/40 px-1 py-0.5 rounded ml-1">({log.fallbackError})</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function formatHealthTime(value: string | Date) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  const relative = minutes < 1 ? "just now" : minutes < 60 ? `${minutes} minutes ago` : minutes < 1440 ? `${Math.round(minutes / 60)} hours ago` : `${Math.round(minutes / 1440)} days ago`;
  return `${relative} · ${date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}
