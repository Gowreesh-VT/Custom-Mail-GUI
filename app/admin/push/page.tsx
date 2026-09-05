"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Bell, BellOff, Send, Smartphone, Monitor, Apple } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { apiFetch } from "@/lib/client-api";

type DeviceEntry = {
  id: string;
  deviceName: string | null;
  platform: string | null;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string;
};

type UserDevices = {
  userId: string;
  name: string;
  email: string;
  devices: DeviceEntry[];
};

type Summary = {
  total: number;
  active: number;
  inactive: number;
  byPlatform: Record<string, number>;
  uniqueUsers: number;
};

type Subscription = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  deviceName: string | null;
  platform: string | null;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string;
};

type PushData = {
  summary: Summary;
  subscriptions: Subscription[];
  byUser: UserDevices[];
};

const PLATFORM_COLORS: Record<string, string> = {
  iOS: "#6366f1",
  Android: "#4ade80",
  Desktop: "#f97316",
};

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  iOS: Apple,
  Android: Smartphone,
  Desktop: Monitor,
};

function PlatformIcon({ platform }: { platform: string | null }) {
  const Icon = PLATFORM_ICONS[platform ?? "Desktop"] ?? Monitor;
  return <Icon className="h-3.5 w-3.5" />;
}

export default function PushCentrePage() {
  const [data, setData] = useState<PushData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"all" | "byUser">("byUser");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastUrl, setBroadcastUrl] = useState("/compose");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<PushData>("/api/admin/push");
      setData(res);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    load();
  }, [load]);

  async function broadcast() {
    if (!broadcastTitle || !broadcastBody) {
      toast.error("Title and body are required");
      return;
    }
    setSending(true);
    try {
      const res = await apiFetch<{ sent: number; failed: number }>("/api/admin/push", {
        method: "POST",
        body: JSON.stringify({
          title: broadcastTitle,
          body: broadcastBody,
          url: broadcastUrl || "/compose",
          targetUserId: broadcastTarget !== "all" ? broadcastTarget : undefined,
        }),
      });
      toast.success(`Broadcast sent to ${res.sent} device(s)${res.failed > 0 ? `, ${res.failed} failed` : ""}`);
      setBroadcastTitle("");
      setBroadcastBody("");
      setBroadcastUrl("/compose");
      setBroadcastTarget("all");
    } catch {
      toast.error("Failed to send broadcast");
    } finally {
      setSending(false);
    }
  }

  const s = data?.summary;
  const platformData = Object.entries(s?.byPlatform ?? {}).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">PWA Notification Centre</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage push subscriptions and broadcast notifications to all devices
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Devices</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{s?.total ?? "—"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Bell className="h-4 w-4 text-emerald-400" /> Active</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-emerald-400">{s?.active ?? "—"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><BellOff className="h-4 w-4 text-muted-foreground" /> Inactive</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-muted-foreground">{s?.inactive ?? "—"}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Unique Users</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground font-mono">{s?.uniqueUsers ?? "—"}</div></CardContent>
        </Card>
      </div>

      {/* Platform Breakdown + Broadcast */}
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Platform Pie */}
        <Card>
          <CardHeader><CardTitle>Device Breakdown by Platform</CardTitle></CardHeader>
          <CardContent className="h-64">
            {mounted && platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {platformData.map((entry) => (
                      <Cell key={entry.name} fill={PLATFORM_COLORS[entry.name] ?? "#6366f1"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                {loading ? "Loading…" : "No subscriptions yet"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Broadcast Form */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Broadcast Notification</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Target</label>
              <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="All active devices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All active devices</SelectItem>
                  {(data?.byUser ?? []).map((u) => (
                    <SelectItem key={u.userId} value={u.userId}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Notification Title *</label>
              <Input
                placeholder="e.g. System Maintenance"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Message Body *</label>
              <Textarea
                placeholder="e.g. The system will be down for maintenance on Saturday 2-4AM."
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                rows={3}
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Click URL</label>
              <Input
                placeholder="/compose"
                value={broadcastUrl}
                onChange={(e) => setBroadcastUrl(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={broadcast}
              disabled={sending || !broadcastTitle || !broadcastBody}
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Sending…" : broadcastTarget === "all" ? `Send to All (${s?.active ?? 0} devices)` : "Send to User"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Subscription List */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Subscriptions</CardTitle>
          <div className="flex gap-1.5">
            <Button size="sm" variant={view === "byUser" ? "default" : "outline"} onClick={() => setView("byUser")} className="h-7 text-xs">By User</Button>
            <Button size="sm" variant={view === "all" ? "default" : "outline"} onClick={() => setView("all")} className="h-7 text-xs">All Devices</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {view === "byUser" ? (
            <div className="divide-y">
              {(data?.byUser ?? []).map((user) => (
                <div key={user.userId} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{user.devices.length} device{user.devices.length !== 1 ? "s" : ""}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.devices.map((dev) => (
                      <div
                        key={dev.id}
                        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
                          dev.isActive ? "border-emerald-500/20 bg-emerald-500/5" : "opacity-50"
                        }`}
                      >
                        <PlatformIcon platform={dev.platform} />
                        <span>{dev.deviceName ?? dev.platform ?? "Unknown"}</span>
                        {!dev.isActive && <BellOff className="h-3 w-3 text-muted-foreground ml-1" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {(data?.byUser ?? []).length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">No subscriptions yet</div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Device</th>
                    <th className="px-4 py-3 font-medium">Platform</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Last Used</th>
                    <th className="px-4 py-3 font-medium">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.subscriptions ?? []).map((sub) => (
                    <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{sub.userName}</p>
                        <p className="text-xs text-muted-foreground">{sub.userEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{sub.deviceName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <PlatformIcon platform={sub.platform} />
                          <span>{sub.platform ?? "Desktop"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {sub.isActive ? (
                          <Badge variant="sent" className="text-xs">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(sub.lastUsedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {(data?.subscriptions ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No subscriptions yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
