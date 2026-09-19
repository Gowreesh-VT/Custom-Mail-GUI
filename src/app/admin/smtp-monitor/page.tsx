"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Wifi, WifiOff, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/client-api";

type HealthLog = {
  id: string;
  success: boolean;
  latencyMs: number | null;
  error: string | null;
  testedAt: string;
  smtpType: string;
};

type FallbackLog = {
  id: string;
  recipientEmail: string | null;
  primaryError: string;
  fallbackSuccess: boolean;
  createdAt: string;
};

type UserHealth = {
  id: string;
  name: string;
  email: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpEncryption: string | null;
  fallbackEnabled: boolean;
  secondaryHost: string | null;
  lastStatus: boolean | null;
  lastTestedAt: string | null;
  lastLatencyMs: number | null;
  primaryStats: { tested: number; success: number; failed: number; avgLatencyMs: number | null };
  secondaryStats: { tested: number; success: number; failed: number };
  fallbackStats: { total: number; succeeded: number; failed: number };
  recentHealthLogs: HealthLog[];
  recentFallbackLogs: FallbackLog[];
};

type Summary = {
  totalUsers: number;
  healthyUsers: number;
  failingUsers: number;
  unconfiguredUsers: number;
  totalFallbackEvents: number;
};

export default function SmtpMonitorPage() {
  const [data, setData] = useState<{ summary: Summary; users: UserHealth[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch<{ summary: Summary; users: UserHealth[] }>("/api/admin/smtp-monitor");
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">SMTP Health Monitor</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time connection health and failover statistics for all users</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Total Users", value: s?.totalUsers ?? "—", color: "text-foreground" },
          { label: "Healthy", value: s?.healthyUsers ?? "—", color: "text-emerald-400" },
          { label: "Failing", value: s?.failingUsers ?? "—", color: "text-red-400" },
          { label: "Unconfigured", value: s?.unconfiguredUsers ?? "—", color: "text-amber-400" },
          { label: "Fallback Events", value: s?.totalFallbackEvents ?? "—", color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User List */}
      <div className="space-y-3">
        {(data?.users ?? []).map((user) => {
          const isExpanded = expanded.has(user.id);
          return (
            <Card key={user.id} className="overflow-hidden">
              <button
                className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                onClick={() => toggle(user.id)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {!user.smtpHost ? (
                      <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : user.lastStatus === true ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : user.lastStatus === false ? (
                      <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground">
                      <span>{user.smtpHost ?? "Not configured"}</span>
                      {user.lastLatencyMs !== null && (
                        <span className="text-emerald-400">{user.lastLatencyMs}ms</span>
                      )}
                    </div>
                    {user.fallbackEnabled && (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-xs">
                        Fallback
                      </Badge>
                    )}
                    <div className="flex gap-2">
                      <Badge variant={user.primaryStats.success > 0 ? "sent" : "outline"} className="text-xs">
                        ✓ {user.primaryStats.success}
                      </Badge>
                      <Badge variant={user.primaryStats.failed > 0 ? "failed" : "outline"} className="text-xs">
                        ✗ {user.primaryStats.failed}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t p-4 space-y-5 bg-muted/10">
                  {/* SMTP Config */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Primary SMTP</p>
                      <p className="font-mono">{user.smtpHost ?? "—"}:{user.smtpPort ?? "—"}</p>
                      <Badge variant="outline" className="mt-1 text-xs">{user.smtpEncryption ?? "—"}</Badge>
                    </div>
                    {user.fallbackEnabled && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Secondary SMTP</p>
                        <p className="font-mono">{user.secondaryHost ?? "—"}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Primary Stats</p>
                      <p className="text-emerald-400">{user.primaryStats.success} success</p>
                      <p className="text-red-400">{user.primaryStats.failed} failed</p>
                      {user.primaryStats.avgLatencyMs !== null && (
                        <p className="text-xs text-muted-foreground">avg {user.primaryStats.avgLatencyMs}ms</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Fallback Events</p>
                      <p>{user.fallbackStats.total} total</p>
                      <p className="text-emerald-400 text-xs">{user.fallbackStats.succeeded} recovered</p>
                      <p className="text-red-400 text-xs">{user.fallbackStats.failed} unrecovered</p>
                    </div>
                  </div>

                  {/* Recent Health Logs */}
                  {user.recentHealthLogs.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Recent Health Tests</p>
                      <div className="space-y-1.5">
                        {user.recentHealthLogs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between text-xs rounded border p-2">
                            <div className="flex items-center gap-2">
                              {log.success ? (
                                <Wifi className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <WifiOff className="h-3 w-3 text-red-400" />
                              )}
                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                {log.smtpType}
                              </Badge>
                              {log.latencyMs !== null && (
                                <span className="text-emerald-400">{log.latencyMs}ms</span>
                              )}
                              {log.error && (
                                <span className="text-red-400 truncate max-w-[200px]">{log.error}</span>
                              )}
                            </div>
                            <span className="text-muted-foreground whitespace-nowrap ml-2">
                              {new Date(log.testedAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Fallback Logs */}
                  {user.recentFallbackLogs.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Recent Fallback Events</p>
                      <div className="space-y-1.5">
                        {user.recentFallbackLogs.map((log) => (
                          <div key={log.id} className="flex items-center justify-between text-xs rounded border p-2">
                            <div className="flex items-center gap-2">
                              {log.fallbackSuccess ? (
                                <CheckCircle className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-400" />
                              )}
                              <span className="text-muted-foreground">{log.recipientEmail ?? "unknown"}</span>
                              <span className="truncate max-w-[180px] text-amber-400">{log.primaryError}</span>
                            </div>
                            <span className="text-muted-foreground whitespace-nowrap ml-2">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {data?.users.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No users found</div>
        )}
      </div>
    </div>
  );
}
