"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Download, FileSpreadsheet, Calendar, Send, FileText, Clock, Inbox, PenLine, Search } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

export function SentPageClient() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<"summary" | "detailed">("detailed");
  const [exportStatus, setExportStatus] = useState<"all" | "sent" | "failed">("all");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadSentEmails = async (query = "", showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    else setSearchLoading(true);

    try {
      const endpoint = query.trim()
        ? `/api/sent?q=${encodeURIComponent(query.trim())}`
        : "/api/sent";
      const data = await apiFetch<any>(endpoint);
      setEmails(data.emails || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      if (showSkeleton) setLoading(false);
      setSearchLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadSentEmails("", true);
  }, []);

  // Debounced search that queries the entire historical database
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSentEmails(searchQuery, false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDownload = async (
    type: "summary" | "detailed",
    status = "all",
    format = "csv",
    from = "",
    to = ""
  ) => {
    setExporting(type);
    try {
      const params = new URLSearchParams({
        type,
        status,
        format,
        ...(from ? { from } : {}),
        ...(to ? { to } : {})
      });
      const res = await fetch(`/api/sent/export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to export emails");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      let datePart = "";
      if (from && to) {
        datePart = `_${from}_to_${to}`;
      } else if (from) {
        datePart = `_from_${from}`;
      } else if (to) {
        datePart = `_until_${to}`;
      } else {
        datePart = `_${new Date().toISOString().slice(0, 10)}`;
      }
      link.download = `sent_emails_${type}_${status !== "all" ? `${status}_` : ""}${datePart}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${type === "detailed" ? "detailed" : "all"} sent emails (${format.toUpperCase()})`);
      setExportModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to download export");
    } finally {
      setExporting(null);
    }
  };

  const headerActions = (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
      {/* Search Bar with Search Icon */}
      <div className="relative w-full sm:w-72">
        {searchLoading ? (
          <Loader2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-primary animate-spin pointer-events-none" />
        ) : (
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        )}
        <Input
          type="text"
          placeholder="Search all sent emails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 pl-8 pr-7 text-xs bg-background/80"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground text-xs h-4 w-4 flex items-center justify-center rounded-full hover:bg-muted"
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={loading || exporting !== null}
          onClick={() => handleDownload("summary", "all", "csv")}
          className="h-8 text-xs font-medium"
        >
          {exporting === "summary" ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export All (CSV)
            </>
          )}
        </Button>

        <Button
          variant="default"
          size="sm"
          disabled={loading || exporting !== null}
          onClick={() => setExportModalOpen(true)}
          className="h-8 text-xs font-medium shadow-sm"
        >
          <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
          Detailed Export
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <TablePage
        title="Sent History"
        rows={emails}
        columns={["Date", "To", "Subject", "Status", "Opens", "Clicks", "Actions"]}
        loading={loading}
        onRefresh={() => loadSentEmails(searchQuery, false)}
        headerActions={headerActions}
        isSearching={Boolean(searchQuery.trim())}
        onClearSearch={() => setSearchQuery("")}
        skeletonRows={
          Array.from({ length: 8 }).map((_, index) => (
            <TableRow key={`sent-skel-${index}`}>
              <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
              <TableCell><Skeleton className="h-4 w-[240px]" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              <TableCell><Skeleton className="h-4 w-8" /></TableCell>
              <TableCell><Skeleton className="h-8 w-32" /></TableCell>
            </TableRow>
          ))
        }
        render={(row) => [
          new Date(row.sentAt).toLocaleString(),
          row.to?.join(", "),
          <details key="d">
            <summary>{row.subject}</summary>
            <div className="mt-2 text-sm text-muted-foreground space-y-2">
              {row.usedFallbackSmtp && (
                <div className="rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-2 text-xs font-medium flex items-center gap-1.5 w-fit">
                  <span>🔄 This email was sent using the fallback SMTP server because the primary SMTP failed.</span>
                </div>
              )}
              <div>
                First opened: {row.firstOpenedAt ? new Date(row.firstOpenedAt).toLocaleString() : "Never"}<br />
                Total opens: {row.openCount || 0}<br />
                Total clicks: {row.clickCount || 0}
              </div>
            </div>
          </details>,
          <TooltipProvider key="s">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Badge variant={row.status === "sent" ? "sent" : "failed"}>{row.status}</Badge>
                  {row.usedFallbackSmtp && <span className="text-sm cursor-help">🔄</span>}
                </div>
              </TooltipTrigger>
              {row.usedFallbackSmtp && (
                <TooltipContent>
                  Sent via fallback SMTP — primary SMTP failed, secondary was used
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>,
          row.openCount || 0,
          row.clickCount || 0,
          <div key="actions" className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="h-7 text-xs px-2.5">
              <Link href={`/sent/${row._id}`}>View Email</Link>
            </Button>
            {row.bulkJobId && (
              <Button asChild variant="outline" size="sm" className="h-7 text-xs px-2.5">
                <Link href={`/sent/campaign/${row.bulkJobId}`}>View Campaign</Link>
              </Button>
            )}
          </div>
        ]}
      />

      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Export Sent History
            </DialogTitle>
            <DialogDescription>
              Export your sent email records with full telemetry, merge data, and delivery diagnostics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Mode selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold">Export Mode</label>
              <div className="grid grid-cols-1 gap-2">
                <div
                  onClick={() => setExportType("detailed")}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    exportType === "detailed"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-2">
                      <input
                        type="radio"
                        name="exportType"
                        checked={exportType === "detailed"}
                        onChange={() => setExportType("detailed")}
                        className="h-3.5 w-3.5 accent-primary cursor-pointer"
                      />
                      Detailed Export (Comprehensive)
                    </span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 ml-5 leading-relaxed">
                    Includes Email ID, CC/BCC, error messages, retry count, attachments, campaign IDs, and custom template merge variables.
                  </p>
                </div>

                <div
                  onClick={() => setExportType("summary")}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    exportType === "summary"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-2">
                      <input
                        type="radio"
                        name="exportType"
                        checked={exportType === "summary"}
                        onChange={() => setExportType("summary")}
                        className="h-3.5 w-3.5 accent-primary cursor-pointer"
                      />
                      Summary Export (Clean Overview)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 ml-5 leading-relaxed">
                    Compact spreadsheet with date, recipient address, subject, status, open/click counts, and template name.
                  </p>
                </div>
              </div>
            </div>

            {/* Date Range Selection (From Date & To Date) */}
            <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Date Range (Optional)
                </label>
                {(fromDate || toDate) && (
                  <button
                    type="button"
                    onClick={() => { setFromDate(""); setToDate(""); }}
                    className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer underline"
                  >
                    Clear Dates (All Time)
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-0.5">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">From Date</span>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">To Date</span>
                  <Input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().slice(0, 10);
                    setFromDate(today);
                    setToDate(today);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-background border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 7);
                    setFromDate(start.toISOString().slice(0, 10));
                    setToDate(end.toISOString().slice(0, 10));
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-background border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 30);
                    setFromDate(start.toISOString().slice(0, 10));
                    setToDate(end.toISOString().slice(0, 10));
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-background border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    setFromDate(firstDay.toISOString().slice(0, 10));
                    setToDate(now.toISOString().slice(0, 10));
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-background border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  This Month
                </button>
              </div>
            </div>

            {/* Filter by Delivery Status & Format */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Filter Status</label>
                <Select value={exportStatus} onValueChange={(val: any) => setExportStatus(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Emails</SelectItem>
                    <SelectItem value="sent">Sent Only</SelectItem>
                    <SelectItem value="failed">Failed Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">File Format</label>
                <Select value={exportFormat} onValueChange={(val: any) => setExportFormat(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="CSV" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                    <SelectItem value="json">JSON (.json)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setExportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={exporting !== null}
              onClick={() => handleDownload(exportType, exportStatus, exportFormat, fromDate, toDate)}
              className="font-medium"
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function DraftsPageClient() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      setDrafts((await apiFetch<any>("/api/drafts")).drafts);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      if (showSkeleton) setLoading(false);
    }
  };

  useEffect(() => { load(true); }, []);

  async function remove(id: string) {
    try {
      setDeletingId(id);
      await apiFetch(`/api/drafts?id=${id}`, { method: "DELETE" });
      toast.success("Draft deleted");
      load(false);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <TablePage
      title="Drafts"
      rows={drafts}
      columns={["Updated", "To", "Subject", "Actions"]}
      loading={loading}
      onRefresh={() => load(false)}
      skeletonRows={
        Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={`draft-skel-${index}`}>
            <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
            <TableCell><Skeleton className="h-8 w-16 rounded-md" /></TableCell>
          </TableRow>
        ))
      }
      render={(row) => [
        new Date(row.updatedAt).toLocaleString(),
        row.to && row.to.length > 0 ? (
          <span className="font-mono text-xs truncate max-w-[220px] block">{row.to.join(", ")}</span>
        ) : (
          <span className="text-muted-foreground italic text-xs">(no recipients)</span>
        ),
        <Link
          key="sub"
          href={`/compose?draftId=${row._id}`}
          className="font-medium hover:text-primary transition-colors hover:underline flex items-center gap-1.5"
        >
          {row.subject || <span className="italic text-muted-foreground">(no subject)</span>}
          {row.attachments && row.attachments.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              📎 {row.attachments.length}
            </Badge>
          )}
        </Link>,
        <div key="act" className="flex items-center gap-1.5">
          <Button asChild variant="default" size="sm" className="h-7 text-xs px-2.5">
            <Link href={`/compose?draftId=${row._id}`}>
              <PenLine className="h-3 w-3 mr-1" />
              Resume
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => remove(row._id)} disabled={deletingId === row._id}>
            {deletingId === row._id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
          </Button>
        </div>
      ]}
    />
  );
}

export function ScheduledPageClient() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    try {
      setRows((await apiFetch<any>("/api/scheduled")).scheduled);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      if (showSkeleton) setLoading(false);
    }
  };

  useEffect(() => { load(true); }, []);

  async function cancel(id: string) {
    try {
      setCancellingId(id);
      await apiFetch(`/api/scheduled?id=${id}`, { method: "DELETE" });
      toast.success("Scheduled email cancelled");
      load(false);
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <TablePage
      title="Scheduled Queue"
      rows={rows}
      columns={["When", "To", "Subject", "Status", "Actions"]}
      loading={loading}
      onRefresh={() => load(false)}
      skeletonRows={
        Array.from({ length: 6 }).map((_, index) => (
          <TableRow key={`scheduled-skel-${index}`}>
            <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-8 w-24 rounded-md" /></TableCell>
          </TableRow>
        ))
      }
      render={(row) => [
        new Date(row.scheduledAt).toLocaleString(),
        row.to?.join(", "),
        row.subject,
        <Badge key="b" variant={row.status === "pending" ? "scheduled" : "outline"}>{row.status}</Badge>,
        <Button key="c" variant="destructive" size="sm" onClick={() => cancel(row._id)} disabled={cancellingId === row._id}>
          {cancellingId === row._id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel"}
        </Button>
      ]}
    />
  );
}

function EmptyState({
  title,
  isSearching = false,
  onClearSearch
}: {
  title: string;
  isSearching?: boolean;
  onClearSearch?: () => void;
}) {
  let icon = <Inbox className="h-8 w-8 text-primary/70" />;
  let heading = "No records found";
  let sub = "Get started by composing your first message or campaign.";
  let ctaText = "Compose Campaign";
  let ctaHref = "/compose";

  if (isSearching) {
    icon = <Search className="h-8 w-8 text-muted-foreground/60" />;
    heading = "No matching emails found";
    sub = "Try searching for a different recipient or subject line.";
  } else if (title.includes("Sent")) {
    icon = <Send className="h-8 w-8 text-primary/80" />;
    heading = "No campaigns dispatched yet";
    sub = "Compose your first email campaign using our visual designer or HTML code editor.";
    ctaText = "Launch Campaign Composer";
    ctaHref = "/compose";
  } else if (title.includes("Draft")) {
    icon = <FileText className="h-8 w-8 text-primary/80" />;
    heading = "No saved drafts";
    sub = "Drafts automatically save here while you compose messages in the editor.";
    ctaText = "Start a New Draft";
    ctaHref = "/compose";
  } else if (title.includes("Scheduled")) {
    icon = <Clock className="h-8 w-8 text-primary/80" />;
    heading = "No scheduled emails in queue";
    sub = "Schedule campaigns to automatically dispatch at your desired date and time.";
    ctaText = "Schedule an Email";
    ctaHref = "/compose";
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4 space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/80 border border-border shadow-xs">
        {icon}
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-sm font-bold text-foreground">{heading}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{sub}</p>
      </div>
      {isSearching && onClearSearch ? (
        <Button variant="outline" size="sm" onClick={onClearSearch} className="text-xs mt-1">
          Clear Search Filter
        </Button>
      ) : (
        <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs mt-1">
          <Link href={ctaHref}>
            <PenLine className="h-3.5 w-3.5 mr-1.5" />
            {ctaText}
          </Link>
        </Button>
      )}
    </div>
  );
}

function TablePage({
  title,
  rows,
  columns,
  render,
  embedded = false,
  loading = false,
  skeletonRows,
  onRefresh,
  headerActions,
  isSearching = false,
  onClearSearch
}: {
  title: string;
  rows: any[];
  columns: string[];
  render: (row: any) => React.ReactNode[];
  embedded?: boolean;
  loading?: boolean;
  skeletonRows?: React.ReactNode[];
  onRefresh?: () => Promise<void> | void;
  headerActions?: React.ReactNode;
  isSearching?: boolean;
  onClearSearch?: () => void;
}) {
  const { pullDistance, isRefreshing } = usePullToRefresh(onRefresh || (() => {}));

  const desktopTable = (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col}>{col}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && skeletonRows?.length
            ? skeletonRows
            : rows.length === 0
            ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="p-0 border-0">
                    <EmptyState title={title} isSearching={isSearching} onClearSearch={onClearSearch} />
                  </TableCell>
                </TableRow>
              )
            : rows.map((row) => (
                <TableRow key={row._id}>
                  {render(row).map((cell, i) => (
                    <TableCell key={i}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );

  const mobileCards = (
    <div className="block md:hidden space-y-4">
      {loading ? (
        Array.from({ length: 5 }).map((_, index) => (
          <div key={`mob-skel-${index}`} className="rounded-lg border bg-card p-4 space-y-3 shadow-sm animate-pulse">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))
      ) : rows.length === 0 ? (
        <div className="bg-card border border-border rounded-xl">
          <EmptyState title={title} isSearching={isSearching} onClearSearch={onClearSearch} />
        </div>
      ) : (
        rows.map((row) => {
          const cells = render(row);
          const actionsIndex = columns.indexOf("Actions");
          return (
            <div key={row._id} className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-3">
              {columns.map((col, index) => {
                if (col === "Actions") return null;
                return (
                  <div key={col} className="flex justify-between items-start text-sm py-1 border-b border-muted/30 last:border-0">
                    <span className="font-semibold text-muted-foreground">{col}</span>
                    <span className="text-right max-w-[70%] break-words">{cells[index]}</span>
                  </div>
                );
              })}
              {actionsIndex !== -1 && (
                <div className="flex justify-end gap-2 pt-2 border-t border-muted/30">
                  {cells[actionsIndex]}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  const container = (
    <Card>
      {title && <CardHeader><CardTitle>{title}</CardTitle></CardHeader>}
      <CardContent>
        {onRefresh && (pullDistance > 0 || isRefreshing) && (
          <div
            className="flex justify-center items-center py-2 text-muted-foreground transition-all duration-150"
            style={{
              height: isRefreshing ? 48 : pullDistance,
              opacity: Math.min(1, (isRefreshing ? 48 : pullDistance) / 48)
            }}
          >
            <Loader2 className={`h-5 w-5 animate-spin ${isRefreshing ? "" : "opacity-70"}`} />
            <span className="text-xs ml-2">{isRefreshing ? "Refreshing..." : "Pull to refresh"}</span>
          </div>
        )}
        {desktopTable}
        {mobileCards}
      </CardContent>
    </Card>
  );

  if (embedded) return container;
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="text-sm text-muted-foreground">All data is scoped to your account.</p>
        </div>
        {headerActions && <div className="flex items-center gap-2 flex-wrap">{headerActions}</div>}
      </div>
      {container}
    </div>
  );
}
