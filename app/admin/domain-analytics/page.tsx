"use client";

import { useEffect, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Globe } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/client-api";

type DomainStat = {
  domain: string;
  sent: number;
  failed: number;
  bulk: number;
  total: number;
  deliveryRate: number;
  lastSentAt: string | null;
};

type Summary = {
  totalSent: number;
  totalFailed: number;
  overallDeliveryRate: number;
  uniqueDomains: number;
  days: number;
};

type AnalyticsData = {
  summary: Summary;
  domains: DomainStat[];
  trend: Array<Record<string, number | string>>;
  top10Domains: string[];
};

const COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c084fc",
  "#e879f9", "#f472b6", "#fb7185", "#f97316",
  "#facc15", "#4ade80",
];

export default function DomainAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");
  const [mounted, setMounted] = useState(false);

  async function load(d: string) {
    setLoading(true);
    try {
      const res = await apiFetch<AnalyticsData>(`/api/admin/domain-analytics?days=${d}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
    load(days);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDaysChange(val: string) {
    setDays(val);
    load(val);
  }

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Domain & Delivery Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Delivery performance broken down by recipient email domain
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={handleDaysChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => load(days)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Sent</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-emerald-400">{s?.totalSent?.toLocaleString() ?? "—"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Failed</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-red-400">{s?.totalFailed?.toLocaleString() ?? "—"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              Overall Delivery Rate
              {(s?.overallDeliveryRate ?? 0) >= 90 ? (
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(s?.overallDeliveryRate ?? 0) >= 90 ? "text-emerald-400" : "text-amber-400"}`}>
              {s?.overallDeliveryRate ?? "—"}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Globe className="h-4 w-4" /> Unique Domains</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{s?.uniqueDomains ?? "—"}</div></CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Top Domains Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Domains by Volume</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {mounted && data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.domains.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="domain" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(v, name) => [v, name === "sent" ? "Sent" : "Failed"]}
                  />
                  <Bar dataKey="sent" stackId="a" fill="hsl(var(--sent))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failed" stackId="a" fill="hsl(var(--failed))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
            )}
          </CardContent>
        </Card>

        {/* Trend Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Volume Trend (Top Domains)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {mounted && data ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
                  />
                  {data.top10Domains.map((domain, i) => (
                    <Area
                      key={domain}
                      type="monotone"
                      dataKey={domain}
                      stackId="1"
                      stroke={COLORS[i % COLORS.length]}
                      fill={COLORS[i % COLORS.length]}
                      fillOpacity={0.4}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Domain Table */}
      <Card>
        <CardHeader>
          <CardTitle>Domain Delivery Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Domain</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium">Failed</th>
                  <th className="px-4 py-3 font-medium">Bulk</th>
                  <th className="px-4 py-3 font-medium min-w-[180px]">Delivery Rate</th>
                  <th className="px-4 py-3 font-medium">Last Sent</th>
                </tr>
              </thead>
              <tbody>
                {(data?.domains ?? []).map((d, i) => (
                  <tr key={d.domain} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 rounded-full items-center justify-center text-white text-[9px] font-bold shrink-0"
                          style={{ background: COLORS[i % COLORS.length] }}>
                          {d.domain[0]?.toUpperCase()}
                        </span>
                        <span className="font-mono font-medium">{d.domain}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">{d.total.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-emerald-400">{d.sent.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-red-400">{d.failed.toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{d.bulk.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              d.deliveryRate >= 95 ? "bg-emerald-500" : d.deliveryRate >= 80 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${d.deliveryRate}%` }}
                          />
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            d.deliveryRate >= 95
                              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                              : d.deliveryRate >= 80
                              ? "border-amber-500/30 text-amber-400 bg-amber-500/5"
                              : "border-red-500/30 text-red-400 bg-red-500/5"
                          }`}
                        >
                          {d.deliveryRate}%
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {d.lastSentAt ? new Date(d.lastSentAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {(data?.domains ?? []).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No data for selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
