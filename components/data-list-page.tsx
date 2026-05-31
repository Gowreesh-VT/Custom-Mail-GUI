"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SentPageClient() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch<any>("/api/sent");
        if (!ignore) setEmails(data.emails);
      } catch (error: any) {
        if (!ignore) toast.error(error.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);
  return (
    <TablePage
      title="Sent History"
      rows={emails}
      columns={["Date", "To", "Subject", "Status", "Opens", "Clicks", "Actions"]}
      loading={loading}
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
  );
}

export function DraftsPageClient() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  async function load() {
    setLoading(true);
    try {
      setDrafts((await apiFetch<any>("/api/drafts")).drafts);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);
  async function remove(id: string) {
    try {
      setDeletingId(id);
      await apiFetch(`/api/drafts?id=${id}`, { method: "DELETE" });
      toast.success("Draft deleted");
      load();
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
        row.to?.join(", "),
        row.subject || "(no subject)",
        <Button key="d" variant="outline" size="sm" onClick={() => remove(row._id)} disabled={deletingId === row._id}>
          {deletingId === row._id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
        </Button>
      ]}
    />
  );
}

export function ScheduledPageClient() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  async function load() {
    setLoading(true);
    try {
      setRows((await apiFetch<any>("/api/scheduled")).scheduled);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);
  async function cancel(id: string) {
    try {
      setCancellingId(id);
      await apiFetch(`/api/scheduled?id=${id}`, { method: "DELETE" });
      toast.success("Scheduled email cancelled");
      load();
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

function TablePage({ title, rows, columns, render, embedded = false, loading = false, skeletonRows }: { title: string; rows: any[]; columns: string[]; render: (row: any) => React.ReactNode[]; embedded?: boolean; loading?: boolean; skeletonRows?: React.ReactNode[] }) {
  const table = (
    <Card>
      <CardHeader>{title && <CardTitle>{title}</CardTitle>}</CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>{columns.map((col) => <TableHead key={col}>{col}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loading && skeletonRows?.length ? skeletonRows : rows.map((row) => <TableRow key={row._id}>{render(row).map((cell, i) => <TableCell key={i}>{cell}</TableCell>)}</TableRow>)}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
  if (embedded) return table;
  return <div className="space-y-5"><div><h1 className="text-2xl font-semibold tracking-normal">{title}</h1><p className="text-sm text-muted-foreground">All data is scoped to your account.</p></div>{table}</div>;
}
