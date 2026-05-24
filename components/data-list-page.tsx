"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function SentPageClient() {
  const [emails, setEmails] = useState<any[]>([]);
  useEffect(() => { apiFetch<any>("/api/sent").then((d) => setEmails(d.emails)); }, []);
  return <TablePage title="Sent History" rows={emails} columns={["Date", "To", "Subject", "Status", "Opens", "Clicks"]} render={(row) => [new Date(row.sentAt).toLocaleString(), row.to?.join(", "), <details key="d"><summary>{row.subject}</summary><div className="mt-2 text-sm text-muted-foreground">First opened: {row.firstOpenedAt ? new Date(row.firstOpenedAt).toLocaleString() : "Never"}<br />Total opens: {row.openCount || 0}<br />Total clicks: {row.clickCount || 0}</div></details>, <Badge key="s" variant={row.status === "sent" ? "sent" : "failed"}>{row.status}</Badge>, row.openCount || 0, row.clickCount || 0]} />;
}

export function DraftsPageClient() {
  const [drafts, setDrafts] = useState<any[]>([]);
  async function load() { setDrafts((await apiFetch<any>("/api/drafts")).drafts); }
  useEffect(() => { load(); }, []);
  async function remove(id: string) { await apiFetch(`/api/drafts?id=${id}`, { method: "DELETE" }); toast.success("Draft deleted"); load(); }
  return <TablePage title="Drafts" rows={drafts} columns={["Updated", "To", "Subject", "Actions"]} render={(row) => [new Date(row.updatedAt).toLocaleString(), row.to?.join(", "), row.subject || "(no subject)", <Button key="d" variant="outline" size="sm" onClick={() => remove(row._id)}>Delete</Button>]} />;
}

export function ScheduledPageClient() {
  const [rows, setRows] = useState<any[]>([]);
  async function load() { setRows((await apiFetch<any>("/api/scheduled")).scheduled); }
  useEffect(() => { load(); }, []);
  async function cancel(id: string) { await apiFetch(`/api/scheduled?id=${id}`, { method: "DELETE" }); toast.success("Scheduled email cancelled"); load(); }
  return <TablePage title="Scheduled Queue" rows={rows} columns={["When", "To", "Subject", "Status", "Actions"]} render={(row) => [new Date(row.scheduledAt).toLocaleString(), row.to?.join(", "), row.subject, <Badge key="b" variant={row.status === "pending" ? "scheduled" : "outline"}>{row.status}</Badge>, <Button key="c" variant="outline" size="sm" onClick={() => cancel(row._id)}>Cancel</Button>]} />;
}

function TablePage({ title, rows, columns, render, embedded = false }: { title: string; rows: any[]; columns: string[]; render: (row: any) => React.ReactNode[]; embedded?: boolean }) {
  const table = <Card><CardHeader>{title && <CardTitle>{title}</CardTitle>}</CardHeader><CardContent><Table><TableHeader><TableRow>{columns.map((col) => <TableHead key={col}>{col}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row._id}>{render(row).map((cell, i) => <TableCell key={i}>{cell}</TableCell>)}</TableRow>)}</TableBody></Table></CardContent></Card>;
  if (embedded) return table;
  return <div className="space-y-5"><div><h1 className="text-2xl font-semibold tracking-normal">{title}</h1><p className="text-sm text-muted-foreground">All data is scoped to your account.</p></div>{table}</div>;
}
