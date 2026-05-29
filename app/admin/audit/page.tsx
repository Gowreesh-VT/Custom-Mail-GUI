"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  AlertTriangle, ChevronRight, Clock, Download, FileText, Filter,
  List, Mail, RefreshCw, Search, Settings, Shield, Trash2, User, X,
  ZapIcon
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/client-api";

// ─── Types ────────────────────────────────────────────────────────────────────
type AuditLog = {
  _id: string;
  id: string;
  action: string;
  category: string;
  userId: string;
  userName: string;
  targetId?: string;
  targetName?: string;
  metadata: Record<string, any>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
};

type AnomalyFlag = {
  type: "high_volume" | "login_brute_force" | "late_admin_role";
  message: string;
  affectedLogIds: string[];
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  "email.sent": <Mail className="h-3 w-3" />,
  "email.failed": <Mail className="h-3 w-3 text-red-400" />,
  "user.login": <User className="h-3 w-3 text-green-400" />,
  "user.login_failed": <User className="h-3 w-3 text-red-400" />,
  "admin.user_created": <Shield className="h-3 w-3 text-blue-400" />,
  "admin.user_role_changed": <Shield className="h-3 w-3 text-orange-400" />,
  "qr.bulk_generated": <ZapIcon className="h-3 w-3 text-purple-400" />,
  "certificate.bulk_generated": <FileText className="h-3 w-3 text-cyan-400" />,
};

const ACTION_COLOR: Record<string, string> = {
  AUTH: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  EMAIL: "bg-green-500/10 text-green-400 border-green-500/20",
  ADMIN: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const KNOWN_ACTIONS = [
  "email.sent", "email.failed", "email.bulk_started", "email.bulk_completed",
  "user.login", "user.login_failed", "user.signup",
  "admin.user_created", "admin.user_updated", "admin.user_role_changed",
  "qr.bulk_generated", "certificate.bulk_generated",
];

const RETENTION_OPTIONS = [30, 60, 90, 365];

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyFlag[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState("all");
  const [userId, setUserId] = useState("all");
  const [q, setQ] = useState("");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Views
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [drillLog, setDrillLog] = useState<AuditLog | null>(null);

  // Retention
  const [retentionDays, setRetentionDays] = useState(30);
  const [retentionOpen, setRetentionOpen] = useState(false);
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);
  const [purging, setPurging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category,
        userId,
        q,
        ...(selectedActions.length > 0 ? { actions: selectedActions.join(",") } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
      });
      const d = await apiFetch<any>(`/api/admin/audit?${params}`);
      setLogs(d.logs);
      setUsers(d.users);
      setAnomalies(d.anomalies || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [category, userId, q, selectedActions, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    apiFetch<any>("/api/admin/audit/retention")
      .then((d) => setRetentionDays(d.days))
      .catch(() => {});
  }, []);

  // ── CSV export ──
  function exportCsv() {
    const csv = [
      "Time,Category,Action,User,Target,IP,Details",
      ...logs.map((l) =>
        [l.createdAt, l.category, l.action, l.userName, l.targetName, l.ip, JSON.stringify(l.metadata)]
          .map((v) => `"${String(v || "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  }

  // ── PDF export via @react-pdf/renderer ──
  async function exportPdf() {
    try {
      const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");
      const styles = StyleSheet.create({
        page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
        title: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
        subtitle: { fontSize: 10, color: "#666", marginBottom: 16 },
        header: { flexDirection: "row", borderBottom: "1 solid #ddd", paddingBottom: 4, marginBottom: 6, fontWeight: "bold" },
        row: { flexDirection: "row", paddingVertical: 3, borderBottom: "0.5 solid #f0f0f0" },
        col0: { width: "18%", paddingRight: 4 },
        col1: { width: "10%", paddingRight: 4 },
        col2: { width: "20%", paddingRight: 4 },
        col3: { width: "22%", paddingRight: 4 },
        col4: { width: "30%", paddingRight: 4 },
        anomalyBox: { backgroundColor: "#fff7ed", border: "1 solid #fdba74", padding: 8, borderRadius: 4, marginBottom: 12 },
        anomalyTitle: { fontWeight: "bold", fontSize: 10, color: "#c2410c", marginBottom: 4 },
        anomalyItem: { color: "#9a3412", marginBottom: 2 },
      });
      const doc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.title}>Audit Log Report</Text>
            <Text style={styles.subtitle}>Generated: {new Date().toLocaleString()} · {logs.length} events</Text>
            {anomalies.length > 0 && (
              <View style={styles.anomalyBox}>
                <Text style={styles.anomalyTitle}>⚠ Security Anomalies ({anomalies.length})</Text>
                {anomalies.map((a, i) => <Text key={i} style={styles.anomalyItem}>• {a.message}</Text>)}
              </View>
            )}
            <View style={styles.header}>
              <Text style={styles.col0}>Time</Text>
              <Text style={styles.col1}>Category</Text>
              <Text style={styles.col2}>Action</Text>
              <Text style={styles.col3}>User</Text>
              <Text style={styles.col4}>Details</Text>
            </View>
            {logs.slice(0, 500).map((l) => (
              <View key={l.id} style={styles.row}>
                <Text style={styles.col0}>{new Date(l.createdAt).toLocaleString()}</Text>
                <Text style={styles.col1}>{l.category}</Text>
                <Text style={styles.col2}>{l.action}</Text>
                <Text style={styles.col3}>{l.userName}</Text>
                <Text style={styles.col4}>{JSON.stringify(l.metadata).slice(0, 80)}</Text>
              </View>
            ))}
          </Page>
        </Document>
      );
      const blob = await pdf(doc).toBlob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `audit-report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      a.click();
    } catch (e: any) {
      toast.error("PDF export failed: " + e.message);
    }
  }

  async function saveRetention() {
    try {
      await apiFetch("/api/admin/audit/retention", {
        method: "POST",
        body: JSON.stringify({ days: retentionDays }),
      });
      toast.success(`Retention policy saved: ${retentionDays} days`);
      setRetentionOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function purgelogs() {
    setPurging(true);
    try {
      const r = await apiFetch<any>("/api/admin/audit/purge", { method: "POST" });
      toast.success(`Purged ${r.deleted} log entries older than ${r.days} days`);
      setPurgeConfirmOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPurging(false);
    }
  }

  // ── Group logs by day for timeline ──
  const groupedByDay = useMemo(() => {
    const map: Record<string, AuditLog[]> = {};
    for (const log of logs) {
      const day = format(new Date(log.createdAt), "yyyy-MM-dd");
      if (!map[day]) map[day] = [];
      map[day].push(log);
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [logs]);

  const anomalyLogIds = useMemo(() => new Set(anomalies.flatMap((a) => a.affectedLogIds)), [anomalies]);

  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Audit Log Explorer</h2>
          <p className="text-sm text-muted-foreground">{logs.length} events loaded</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "table" ? "timeline" : "table")}>
            {viewMode === "table" ? <><Clock className="mr-1 h-4 w-4" />Timeline</> : <><List className="mr-1 h-4 w-4" />Table</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="mr-1 h-4 w-4" />Filters {selectedActions.length > 0 && <Badge className="ml-1 text-[10px]">{selectedActions.length}</Badge>}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />CSV</Button>
          <Button variant="outline" size="sm" onClick={exportPdf}><FileText className="mr-1 h-4 w-4" />PDF</Button>
          <Button variant="outline" size="sm" onClick={() => setRetentionOpen(true)}><Settings className="mr-1 h-4 w-4" />Retention</Button>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
        </div>
      </div>

      {/* Anomaly Banners */}
      {anomalies.length > 0 && (
        <div className="space-y-2">
          {anomalies.map((anomaly, i) => (
            <div key={i} className="flex items-start gap-3 rounded-md border border-orange-500/30 bg-orange-500/5 p-3 text-sm text-orange-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
              <span>{anomaly.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="flex flex-wrap gap-3 p-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search logs..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="AUTH">Auth</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="w-52"><SelectValue placeholder="All users" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((u) => <SelectItem key={u._id} value={u._id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
            <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDateFrom(format(subDays(new Date(), 7), "yyyy-MM-dd"))}>Last 7d</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDateFrom(format(subDays(new Date(), 30), "yyyy-MM-dd"))}>Last 30d</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear dates</Button>
            </div>
            <Separator className="w-full" />
            <div className="flex flex-wrap gap-2 w-full">
              <span className="text-xs font-medium text-muted-foreground self-center">Actions:</span>
              {KNOWN_ACTIONS.map((action) => (
                <button
                  key={action}
                  onClick={() => toggleAction(action)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${selectedActions.includes(action) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-foreground/30"}`}
                >
                  {ACTION_ICONS[action]}
                  {action}
                  {selectedActions.includes(action) && <X className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <Card>
          <CardHeader><CardTitle>Events</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow
                    key={l.id}
                    className={anomalyLogIds.has(l.id) ? "bg-orange-500/5 hover:bg-orange-500/10" : ""}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ACTION_COLOR[l.category] || ""}`}>
                        {l.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        {ACTION_ICONS[l.action]}
                        {l.action}
                        {anomalyLogIds.has(l.id) && <AlertTriangle className="h-3 w-3 text-orange-400" />}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{l.userName}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{l.ip || "—"}</TableCell>
                    <TableCell>
                      <pre className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted-foreground">
                        {JSON.stringify(l.metadata).slice(0, 80)}
                      </pre>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDrillLog(l)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* TIMELINE VIEW */}
      {viewMode === "timeline" && (
        <div className="space-y-8">
          {groupedByDay.map(([day, dayLogs]) => (
            <div key={day}>
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <Badge variant="outline" className="text-xs">{format(new Date(day), "MMMM d, yyyy")}</Badge>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="ml-4 space-y-2 border-l-2 border-border pl-4">
                {dayLogs.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setDrillLog(l)}
                    className={`group w-full text-left rounded-md border p-3 transition-colors hover:bg-muted/50 ${anomalyLogIds.has(l.id) ? "border-orange-500/30 bg-orange-500/5" : "border-transparent bg-muted/20"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background border shadow-sm">
                        {ACTION_ICONS[l.action] || <div className="h-2 w-2 rounded-full bg-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{l.action}</span>
                          {anomalyLogIds.has(l.id) && <AlertTriangle className="h-3 w-3 text-orange-400" />}
                          <span className={`text-[10px] border rounded-full px-2 py-0.5 ${ACTION_COLOR[l.category] || ""}`}>{l.category}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium">{l.userName}</span>
                          {l.targetName && <> → <span className="font-medium">{l.targetName}</span></>}
                          <span className="ml-2">{new Date(l.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drill-down Sheet */}
      <Sheet open={!!drillLog} onOpenChange={(open) => { if (!open) setDrillLog(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {drillLog && ACTION_ICONS[drillLog.action]}
              {drillLog?.action}
            </SheetTitle>
          </SheetHeader>
          {drillLog && <LogDrillDown log={drillLog} />}
        </SheetContent>
      </Sheet>

      {/* Retention Settings Dialog */}
      <Dialog open={retentionOpen} onOpenChange={setRetentionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Retention Policy</DialogTitle>
            <DialogDescription>Logs older than the selected threshold will be eligible for purging.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Retain logs for</Label>
              <Select value={String(retentionDays)} onValueChange={(v) => setRetentionDays(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RETENTION_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              <strong>Note:</strong> Purging is permanent and cannot be undone. Old logs matching the current retention policy will be deleted.
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="destructive" className="flex-1" onClick={() => { setRetentionOpen(false); setPurgeConfirmOpen(true); }}>
              <Trash2 className="mr-1 h-4 w-4" />Purge Now
            </Button>
            <Button className="flex-1" onClick={saveRetention}>Save Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purge Confirmation */}
      <Dialog open={purgeConfirmOpen} onOpenChange={setPurgeConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purge</DialogTitle>
            <DialogDescription>
              This will permanently delete all audit logs older than <strong>{retentionDays} days</strong>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={purgelogs} disabled={purging}>
              {purging ? "Purging..." : "Delete Old Logs"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Log Drill-down Panel ────────────────────────────────────────────────────
function LogDrillDown({ log }: { log: AuditLog }) {
  const [emailData, setEmailData] = useState<any>(null);

  useEffect(() => {
    if (log.action === "email.sent" && log.targetId) {
      fetch(`/api/sent/${log.targetId}`)
        .then((r) => r.json())
        .then((d) => setEmailData(d.email))
        .catch(() => {});
    }
  }, [log]);

  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Timestamp</div>
          <div className="font-medium">{new Date(log.createdAt).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Category</div>
          <div className="font-medium">{log.category}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">User</div>
          <div className="font-medium">{log.userName || "—"}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">IP Address</div>
          <div className="font-mono text-xs">{log.ip || "—"}</div>
        </div>
        {log.targetName && (
          <div className="col-span-2">
            <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Target</div>
            <div className="font-medium">{log.targetName}</div>
          </div>
        )}
      </div>

      <Separator />

      <div>
        <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-2">Metadata</div>
        <pre className="rounded-md bg-muted p-3 text-xs overflow-auto max-h-56 leading-relaxed">
          {JSON.stringify(log.metadata, null, 2)}
        </pre>
      </div>

      {/* Email sent — show full email detail */}
      {log.action === "email.sent" && (
        <div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-2">Email Content</div>
          {emailData ? (
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Subject:</span> {emailData.subject}</div>
              <div><span className="font-medium">To:</span> {(emailData.to || []).join(", ")}</div>
              <iframe
                title="Email preview"
                className="mt-2 h-64 w-full rounded-md border bg-white"
                srcDoc={emailData.bodyHtml}
                sandbox=""
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Loading email details...</p>
          )}
        </div>
      )}

      {/* Admin user created — mini profile */}
      {(log.action === "admin.user_created" || log.action === "admin.user_updated") && log.metadata && (
        <div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-2">User Profile</div>
          <div className="rounded-md border p-3 text-sm space-y-1">
            {Object.entries(log.metadata).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-muted-foreground capitalize">{k}:</span>
                <span className="font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User-agent details */}
      {log.userAgent && (
        <div>
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">User Agent</div>
          <p className="text-xs font-mono text-muted-foreground break-all">{log.userAgent}</p>
        </div>
      )}
    </div>
  );
}
