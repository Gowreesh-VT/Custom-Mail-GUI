"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart2, CheckCircle2, ChevronRight, Cpu, Eye, Globe, Laptop, Link2, Loader2, Search, Send
} from "lucide-react";
import { Area, AreaChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/client-api";

type Props = {
  params: Promise<{ bulkJobId: string }>;
};

type CampaignAnalyticsData = {
  success: boolean;
  campaign: {
    bulkJobId: string;
    subject: string;
    sentAt: string;
    templateName: string;
    totalSent: number;
    totalSuccessful: number;
    totalFailed: number;
    totalOpened: number;
    totalClicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  };
  timeSeries: Array<{
    time: string;
    opens: number;
    clicks: number;
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
  recipients: Array<{
    id: string;
    email: string;
    status: string;
    openCount: number;
    clickCount: number;
    sentAt: string;
    firstOpenedAt: string | null;
    usedFallbackSmtp?: boolean;
    bothFailed?: boolean;
    primaryError?: string | null;
    fallbackError?: string | null;
    errorMsg?: string | null;
  }>;
};

const PIE_COLORS = ["#3b82f6", "#a855f7", "#ec4899", "#10b981", "#f59e0b"];

export default function CampaignAnalyticsPage({ params }: Props) {
  const { bulkJobId } = React.use(params);
  const [data, setData] = React.useState<CampaignAnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<CampaignAnalyticsData>(`/api/sent/campaign/${bulkJobId}`);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load campaign analytics");
    } finally {
      setLoading(false);
    }
  }, [bulkJobId]);

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

  const filteredRecipients = React.useMemo(() => {
    if (!data?.recipients) return [];
    return data.recipients.filter((r) =>
      r.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading campaign analytics dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/5 p-6 text-center">
          <h3 className="text-lg font-medium text-destructive">Error Loading Campaign Analytics</h3>
          <p className="text-sm text-muted-foreground mt-1">We couldn&apos;t retrieve stats for this bulk campaign. Ensure it exists.</p>
          <Button variant="outline" className="mt-4" onClick={loadData}>Retry</Button>
        </div>
    );
  }

  const { campaign } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link href="/sent" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Send className="h-3 w-3" /> Back to Sent History
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Campaign Analytics</h1>
          <p className="text-sm text-muted-foreground max-w-2xl truncate">
            Subject: <strong className="text-foreground">{campaign.subject}</strong> · Template: <strong className="text-foreground">{campaign.templateName}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
            Campaign ID: {bulkJobId.slice(0, 8)}...
          </Badge>
          <Button variant="outline" size="sm" onClick={loadData}>Refresh</Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dispatched</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.totalSent}</div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
              <span>Success: {campaign.totalSuccessful}</span>
              <span className="text-red-400">Failed: {campaign.totalFailed}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1 mt-2 overflow-hidden">
              <div className="bg-muted-foreground h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, campaign.deliveryRate))}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery Success</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.deliveryRate.toFixed(1)}%</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Percentage of emails delivered successfully
            </p>
            <div className="w-full bg-muted rounded-full h-1 mt-2 overflow-hidden">
              <div className="bg-green-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, campaign.deliveryRate))}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Unique Open Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unique Opens</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.openRate.toFixed(1)}%</div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
              <span>Opened: {campaign.totalOpened} recipients</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1 mt-2 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, campaign.openRate))}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Unique Click Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Click-Through Rate</CardTitle>
            <Link2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.clickRate.toFixed(1)}%</div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
              <span>Clicked: {campaign.totalClicked} recipients</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1 mt-2 overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, campaign.clickRate))}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Timeline Area Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart2 className="h-4 w-4 text-primary" /> Hourly Interaction Series</CardTitle>
          <CardDescription>Track opens and clicks hourly across the first 24 hours of the campaign lifecycle.</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.timeSeries}>
              <defs>
                <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#888888" fontSize={11} />
              <YAxis stroke="#888888" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Area type="monotone" dataKey="opens" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOpens)" name="Opens" />
              <Area type="monotone" dataKey="clicks" stroke="#a855f7" fillOpacity={1} fill="url(#colorClicks)" name="Clicks" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Breakdowns Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5"><Laptop className="h-4 w-4" /> Recipient Devices</CardTitle>
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
            ) : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No device data logged</div>}
          </CardContent>
        </Card>

        {/* Browsers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5"><Globe className="h-4 w-4" /> Recipient Browsers</CardTitle>
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
            ) : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No browser data logged</div>}
          </CardContent>
        </Card>

        {/* Operating Systems */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-1.5"><Cpu className="h-4 w-4" /> Recipient Operating Systems</CardTitle>
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
            ) : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No OS data logged</div>}
          </CardContent>
        </Card>
      </div>

      {/* Top Clicked Links breakdown table */}
      {data.clickBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Link Performance Summary</CardTitle>
            <CardDescription>Visualizes clicked URLs across the entire campaign list.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Destination Link</TableHead>
                  <TableHead className="text-right font-medium">Clicks</TableHead>
                  <TableHead className="text-right font-medium">Unique Clicks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.clickBreakdown.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant="secondary">{row.label}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate font-mono text-xs text-primary">
                      <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                        {row.url} <Link2 className="h-3 w-3 inline" />
                      </a>
                    </TableCell>
                    <TableCell className="text-right font-bold">{row.clicks}</TableCell>
                    <TableCell className="text-right">{row.uniqueClicks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recipients Log table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle>Recipients List</CardTitle>
            <CardDescription>Individual metrics and dispatch statuses for each recipient.</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Search recipient email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Opens</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead>First Opened</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecipients.map((rec) => (
                <TableRow key={rec.id} className={rec.bothFailed ? "bg-red-500/5 hover:bg-red-500/10" : ""}>
                  <TableCell className="font-medium text-sm">
                    <div>{rec.email}</div>
                    {rec.bothFailed && (
                      <div className="mt-1.5 space-y-1 rounded border border-red-500/10 bg-red-500/5 p-2.5 text-[10px] font-mono leading-normal text-red-600 dark:text-red-400 max-w-md">
                        <div><strong className="text-red-500">Primary SMTP Error:</strong> {rec.primaryError}</div>
                        <div><strong className="text-orange-500">Fallback SMTP Error:</strong> {rec.fallbackError}</div>
                      </div>
                    )}
                    {!rec.bothFailed && rec.status === "failed" && rec.errorMsg && (
                      <div className="mt-1 text-[10px] font-mono text-destructive">
                        Reason: {rec.errorMsg}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={rec.status === "sent" ? "sent" : "failed"} className="text-[10px] py-0.5">
                        {rec.bothFailed ? "❌❌ failed" : rec.status}
                      </Badge>
                      {rec.usedFallbackSmtp && (
                        <span className="text-sm cursor-help" title="Sent via fallback SMTP — primary failed, secondary was used">🔄</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">{rec.openCount}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{rec.clickCount}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {rec.firstOpenedAt ? new Date(rec.firstOpenedAt).toLocaleString() : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <Link href={`/sent/${rec.id}`}><ChevronRight className="h-4 w-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRecipients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-sm text-muted-foreground">
                    No recipients matching filter found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
