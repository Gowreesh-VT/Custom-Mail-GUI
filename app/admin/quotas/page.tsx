"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Save, X, Pencil, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/client-api";

type UserQuota = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  sentToday: number;
  sentThisMonth: number;
  sentTotal: number;
  failedTotal: number;
  dailyUsagePct: number | null;
  monthlyUsagePct: number | null;
};

function UsageBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">Unlimited</span>;
  const color =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs w-9 text-right text-muted-foreground">{pct}%</span>
    </div>
  );
}

export default function QuotasPage() {
  const [users, setUsers] = useState<UserQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ dailyLimit: 0, monthlyLimit: 0 });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ users: UserQuota[] }>("/api/admin/quotas");
      setUsers(res.users);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(user: UserQuota) {
    setEditingId(user.id);
    setEditValues({ dailyLimit: user.dailyLimit, monthlyLimit: user.monthlyLimit });
  }

  async function saveEdit(userId: string) {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/quotas?id=${userId}`, {
        method: "PUT",
        body: JSON.stringify(editValues),
      });
      toast.success("Quota updated");
      setEditingId(null);
      await load();
    } catch {
      toast.error("Failed to update quota");
    } finally {
      setSaving(false);
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const overLimitDaily = users.filter((u) => u.dailyUsagePct !== null && u.dailyUsagePct >= 100).length;
  const nearLimitDaily = users.filter((u) => u.dailyUsagePct !== null && u.dailyUsagePct >= 80 && u.dailyUsagePct < 100).length;
  const unlimited = users.filter((u) => u.dailyLimit === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Quota & Rate-Limit Manager</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and manage daily/monthly sending quotas for all users
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" /> Over Daily Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{overLimitDaily}</div>
            <p className="text-xs text-muted-foreground mt-1">users at 100%+</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Near Daily Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">{nearLimitDaily}</div>
            <p className="text-xs text-muted-foreground mt-1">users at 80–99%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Unlimited Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">{unlimited}</div>
            <p className="text-xs text-muted-foreground mt-1">no daily limit set</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="Search users…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Quotas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Sent Today</th>
                  <th className="px-4 py-3 font-medium min-w-[160px]">Daily Usage</th>
                  <th className="px-4 py-3 font-medium">Sent This Month</th>
                  <th className="px-4 py-3 font-medium min-w-[160px]">Monthly Usage</th>
                  <th className="px-4 py-3 font-medium">Total Sent</th>
                  <th className="px-4 py-3 font-medium">Daily Limit</th>
                  <th className="px-4 py-3 font-medium">Monthly Limit</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const isEditing = editingId === user.id;
                  return (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.role === "admin" && (
                          <Badge variant="outline" className="mt-1 text-xs border-scheduled/30 text-scheduled">admin</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-center">
                        {user.sentToday}
                        {user.dailyLimit > 0 && (
                          <span className="text-muted-foreground text-xs"> / {user.dailyLimit}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[160px]">
                        <UsageBar pct={user.dailyUsagePct} />
                      </td>
                      <td className="px-4 py-3 font-mono text-center">
                        {user.sentThisMonth}
                        {user.monthlyLimit > 0 && (
                          <span className="text-muted-foreground text-xs"> / {user.monthlyLimit}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[160px]">
                        <UsageBar pct={user.monthlyUsagePct} />
                      </td>
                      <td className="px-4 py-3 font-mono text-center">{user.sentTotal}</td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            className="w-24 h-7 text-xs"
                            value={editValues.dailyLimit}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                dailyLimit: Number(e.target.value),
                              }))
                            }
                          />
                        ) : (
                          <span className="font-mono">
                            {user.dailyLimit === 0 ? (
                              <span className="text-muted-foreground">Unlimited</span>
                            ) : (
                              user.dailyLimit
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            className="w-28 h-7 text-xs"
                            value={editValues.monthlyLimit}
                            onChange={(e) =>
                              setEditValues((v) => ({
                                ...v,
                                monthlyLimit: Number(e.target.value),
                              }))
                            }
                          />
                        ) : (
                          <span className="font-mono">
                            {user.monthlyLimit === 0 ? (
                              <span className="text-muted-foreground">Unlimited</span>
                            ) : (
                              user.monthlyLimit
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => saveEdit(user.id)}
                              disabled={saving}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => startEdit(user)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No users found
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
