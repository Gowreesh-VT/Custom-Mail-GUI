"use client";

import * as React from "react";
import Link from "next/link";
import { formatDistance } from "date-fns";
import { ArrowLeft, BarChart2, Calendar, Clock, Cpu, Eye, Globe, Laptop, Link2, Loader2 } from "lucide-react";
import { Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/client-api";

type Props = {
  params: Promise<{ emailId: string }>;
};

type EmailAnalyticsData = {
  success: boolean;
  email: {
    id: string;
    toAddresses: string[];
    ccAddresses: string[];
    bccAddresses: string[];
    subject: string;
    bodyHtml: string;
    sentAt: string;
    status: string;
    openCount: number;
    clickCount: number;
    firstOpenedAt: string | null;
    lastOpenedAt: string | null;
    usedFallbackSmtp?: boolean;
  };
  events: Array<{
    id: string;
    type: string;
    timestamp: string;
    ip: string | null;
    url: string | null;
    uaParsed: { browser: string; os: string; device: string };
  }>;
  clickBreakdown: Array<{
    label: string;
    url: string;
    clicks: number;
    uniqueClicks: number;
  }>;
  analytics: {
    deviceStats: Record<string, number>;
    browserStats: Record<string, number>;
    osStats: Record<string, number>;
  };
};

const PIE_COLORS = ["#3b82f6", "#a855f7", "#ec4899", "#10b981", "#f59e0b"];

export default function SingleEmailPage({ params }: Props) {
  const { emailId } = React.use(params);
  const [data, setData] = React.useState<EmailAnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"metrics" | "events" | "preview">("metrics");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<EmailAnalyticsData>(`/api/sent/${emailId}/analytics`);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load email analytics");
    } finally {
      setLoading(false);
    }
  }, [emailId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const devicePieData = React.useMemo(() => {
    if (!data?.analytics?.deviceStats) return [];
    return Object.entries(data.analytics.deviceStats)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [data]);

  const browserPieData = React.useMemo(() => {
    if (!data?.analytics?.browserStats) return [];
    return Object.entries(data.analytics.browserStats)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [data]);

  const osPieData = React.useMemo(() => {
    if (!data?.analytics?.osStats) return [];
    return Object.entries(data.analytics.osStats)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);
  }, [data]);

  const timelineChartData = React.useMemo(() => {
    if (!data?.events || data.events.length === 0) return [];
    // Group events into 6-hour or daily intervals, or list chronological event index count
    // For single email, a simple step-wise accumulation line is excellent.
    let cumulativeOpens = 0;
    let cumulativeClicks = 0;
    return data.events.map((ev) => {
      if (ev.type === "open") cumulativeOpens++;
      if (ev.type === "click") cumulativeClicks++;
      return {
        time: new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        opens: cumulativeOpens,
        clicks: cumulativeClicks
      };
    });
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading email performance analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/5 p-6 text-center">
          <h3 className="text-lg font-medium text-destructive">Error Loading Analytics</h3>
          <p className="text-sm text-muted-foreground mt-1">We couldn&apos;t retrieve stats for this message. Ensure it exists and you have access.</p>
          <Button variant="outline" className="mt-4" onClick={loadData}>Retry</Button>
        </div>
    );
  }

  const { email } = data;
  const timeToOpen = email.firstOpenedAt
    ? formatDistance(new Date(email.firstOpenedAt), new Date(email.sentAt))
    : null;

  return (
    <div className="space-y-6">
      {/* Navigation and Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link href="/sent" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to Sent History
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Email Analytics</h1>
          <p className="text-sm text-muted-foreground max-w-2xl truncate">
            Subject: <strong className="text-foreground">{email.subject}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge variant={email.status === "sent" ? "sent" : "failed"} className="capitalize">
            {email.status}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">ID: {email.id}</span>
        </div>
      </div>

      {email.usedFallbackSmtp && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 text-sm font-medium flex items-center gap-2">
          <span>🔄 This email was sent using the fallback SMTP server because the primary SMTP failed.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab("metrics")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "metrics" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Overview & Charts
        </button>
        <button
          onClick={() => setActiveTab("events")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "events" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Event History ({data.events.length})
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "preview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Message Body Preview
        </button>
      </div>

      {/* TAB CONTENT: METRICS */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          {/* Performance metrics overview */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Opens</CardTitle>
                <Eye className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{email.openCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {email.firstOpenedAt ? `First open: ${new Date(email.firstOpenedAt).toLocaleTimeString()}` : "Not opened yet"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Clicks</CardTitle>
                <Link2 className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{email.clickCount}</div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {email.clickCount > 0 ? "Tracked link interaction detected" : "No links clicked"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time to First Open</CardTitle>
                <Clock className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeToOpen || "—"}</div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Duration between send and initial read
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dispatch Timestamp</CardTitle>
                <Calendar className="h-4 w-4 text-cyan-500" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate">{new Date(email.sentAt).toLocaleDateString()}</div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Sent {formatDistance(new Date(email.sentAt), new Date())} ago
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cumulative timeline chart */}
          {timelineChartData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart2 className="h-4 w-4 text-primary" /> Accumulation Timeline</CardTitle>
                <CardDescription>Visualizes open and click actions chronologically after delivery.</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineChartData}>
                    <XAxis dataKey="time" stroke="#888888" fontSize={11} />
                    <YAxis stroke="#888888" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Line type="monotone" dataKey="opens" stroke="#3b82f6" strokeWidth={2} name="Total Opens" />
                    <Line type="monotone" dataKey="clicks" stroke="#a855f7" strokeWidth={2} name="Total Clicks" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              <Eye className="mx-auto h-8 w-8 mb-2 opacity-50" />
              No interactions recorded for this email yet.
            </Card>
          )}

          {/* Segment breakdown pie charts */}
          {data.events.length > 0 && (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Devices */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-1.5"><Laptop className="h-4 w-4" /> Devices</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  {devicePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={devicePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label>
                          {devicePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No device data</div>}
                </CardContent>
              </Card>

              {/* Browsers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-1.5"><Globe className="h-4 w-4" /> Browsers</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  {browserPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={browserPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label>
                          {browserPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No browser data</div>}
                </CardContent>
              </Card>

              {/* Operating Systems */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-1.5"><Cpu className="h-4 w-4" /> Operating Systems</CardTitle>
                </CardHeader>
                <CardContent className="h-56">
                  {osPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={osPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label>
                          {osPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No OS data</div>}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Links click breakdown table */}
          {data.clickBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Click-Through Link Performance</CardTitle>
                <CardDescription>Breakdown of interaction levels across embedded URLs.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Destination URL</TableHead>
                      <TableHead className="text-right">Total Clicks</TableHead>
                      <TableHead className="text-right">Unique Visitors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.clickBreakdown.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="bg-muted">{row.label}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate font-mono text-xs">
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1 text-primary">
                            {row.url} <Link2 className="h-3 w-3 inline" />
                          </a>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{row.clicks}</TableCell>
                        <TableCell className="text-right">{row.uniqueClicks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Detailed recipient summary */}
          <Card>
            <CardHeader><CardTitle>Recipient Details</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-md">
                <div>
                  <span className="text-muted-foreground block text-xs uppercase font-medium">To Addresses</span>
                  <span className="font-medium">{email.toAddresses.join(", ")}</span>
                </div>
                {email.ccAddresses.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase font-medium">CC Addresses</span>
                    <span className="font-medium">{email.ccAddresses.join(", ")}</span>
                  </div>
                )}
                {email.bccAddresses.length > 0 && (
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase font-medium">BCC Addresses</span>
                    <span className="font-medium">{email.bccAddresses.join(", ")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: EVENT HISTORY */}
      {activeTab === "events" && (
        <Card>
          <CardHeader><CardTitle>Raw Activity Logs</CardTitle></CardHeader>
          <CardContent>
            {data.events.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Client OS/Browser</TableHead>
                    <TableHead>Details / URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ev.type === "open" ? "secondary" : "outline"} className="capitalize">
                          {ev.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{ev.ip || "—"}</TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Laptop className="h-3 w-3 text-muted-foreground" />
                          {ev.uaParsed.os} / {ev.uaParsed.browser}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs font-mono">
                        {ev.url ? (
                          <a href={ev.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                            {ev.url}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-6 text-sm text-muted-foreground">No events recorded yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: PREVIEW */}
      {activeTab === "preview" && (
        <Card>
          <CardHeader><CardTitle>Message Body</CardTitle></CardHeader>
          <CardContent>
            <iframe
              title="Email body render preview"
              srcDoc={email.bodyHtml}
              className="w-full h-[600px] border rounded-md bg-white"
              sandbox=""
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
