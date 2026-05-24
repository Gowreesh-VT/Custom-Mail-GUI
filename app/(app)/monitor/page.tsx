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
  const [days, setDays] = useState("30");
  const [events, setEvents] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [s, c, f] = await Promise.all([apiFetch<any>("/api/monitor/stats"), apiFetch<any>(`/api/monitor/chart?days=${days}`), apiFetch<any>("/api/monitor/failed?days=7")]);
    setStats(s.stats); setChart(c.data); setFailed(f.failed);
  }, [days]);
  useEffect(() => { load(); const timer = setInterval(load, 60000); return () => clearInterval(timer); }, [load]);
  useEffect(() => {
    const source = new EventSource("/api/monitor/stream");
    source.onmessage = (event) => setEvents((current) => [JSON.parse(event.data), ...current].slice(0, 100));
    source.onerror = () => setEvents((current) => [{ type: "info", message: "Reconnecting...", at: new Date().toISOString() }, ...current].slice(0, 100));
    return () => source.close();
  }, []);
  useEffect(() => { if (!paused) bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [events, paused]);

  const lastFailed = useMemo(() => failed[0], [failed]);
  async function retry(id: string) {
    try { await apiFetch(`/api/monitor/retry/${id}`, { method: "POST", body: "{}" }); toast.success("Retry sent"); load(); } catch (error: any) { toast.error(error.message); }
  }
  async function dismiss(id: string) {
    await apiFetch(`/api/monitor/dismiss/${id}`, { method: "POST", body: "{}" });
    toast.success("Dismissed");
    load();
  }
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
          <CardContent className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><ChartTooltip /><Legend /><Bar dataKey="sent" fill="hsl(var(--sent))" /><Bar dataKey="failed" fill="hsl(var(--failed))" /></BarChart></ResponsiveContainer></CardContent>
        </Card>
        <Card className={lastFailed ? "border-failed/40" : ""}>
          <CardHeader><CardTitle>SMTP Health</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={lastFailed ? "failed" : "sent"}>{lastFailed ? "Attention Needed" : "Ready"}</Badge>
            <p className="text-sm text-muted-foreground">Use Settings to test the saved SMTP connection and update the live status log.</p>
            <Button variant="outline" onClick={() => apiFetch("/api/smtp/test", { method: "POST", body: "{}" }).then(() => toast.success("SMTP connected")).catch((e) => toast.error(e.message))}>Test Now</Button>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Activity Feed</CardTitle><Button variant="outline" size="sm" onClick={() => setPaused(!paused)}>{paused ? "Resume" : "Pause"}</Button></CardHeader>
          <CardContent className="h-80 overflow-auto rounded-md border p-3 text-sm">
            {events.map((event, index) => <div key={index} className="border-b py-2"><Badge variant={event.type === "failed" ? "failed" : event.type === "sent" ? "sent" : "scheduled"}>{event.type}</Badge> <span className="ml-2">{event.to || event.message || event.subject}</span><span className="text-muted-foreground"> {event.error}</span></div>)}
            <div ref={bottom} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Failed Emails</CardTitle><Button variant="outline" size="sm" onClick={() => apiFetch("/api/monitor/retry-all", { method: "POST", body: JSON.stringify({ days: 7 }) }).then(() => { toast.success("Retry all started"); load(); })}>Retry All</Button></CardHeader>
          <CardContent><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>To</TableHead><TableHead>Subject</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{failed.map((email) => <TableRow key={email._id}><TableCell>{new Date(email.sentAt).toLocaleDateString()}</TableCell><TableCell>{email.to?.join(", ")}</TableCell><TableCell>{email.subject}</TableCell><TableCell className="space-x-2"><Button size="sm" variant="outline" onClick={() => retry(email._id)}>Retry</Button><Button size="sm" variant="ghost" onClick={() => dismiss(email._id)}>Dismiss</Button></TableCell></TableRow>)}</TableBody></Table></CardContent>
        </Card>
      </div>
    </div>
  );
}
