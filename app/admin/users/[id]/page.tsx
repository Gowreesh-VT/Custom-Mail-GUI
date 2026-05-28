"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/client-api";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  useEffect(() => { apiFetch<any>(`/api/admin/users/${id}`).then(setData); }, [id]);
  const user = data?.user;
  const emails = data?.emails || [];
  const sentMonth = data?.sentThisMonth ?? 0;
  const failedTotal = data?.failedTotal ?? 0;
  if (!user) return null;
  return <div className="space-y-5"><div><h2 className="text-2xl font-semibold">{user.name}</h2><div className="flex flex-wrap items-center gap-2 text-muted-foreground"><span>{user.email}</span><Badge>{user.role}</Badge><Badge variant={user.isActive === false ? "failed" : "sent"}>{user.isActive === false ? "Deactivated" : "Active"}</Badge></div></div><Tabs defaultValue="overview"><TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="sent">Sent Emails</TabsTrigger><TabsTrigger value="templates">Templates</TabsTrigger><TabsTrigger value="audit">Audit Trail</TabsTrigger></TabsList><TabsContent value="overview"><div className="grid gap-4 md:grid-cols-3"><Card><CardHeader><CardTitle>Sent This Month</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{sentMonth}</CardContent></Card><Card><CardHeader><CardTitle>Failed</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{failedTotal}</CardContent></Card><Card><CardHeader><CardTitle>Scheduled Pending</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{data.scheduledPending}</CardContent></Card></div></TabsContent><TabsContent value="sent"><SimpleTable rows={emails} columns={["Date", "To", "Subject", "Status"]} render={(e) => [new Date(e.sentAt).toLocaleString(), e.to?.join(", "), e.subject, e.status]} /></TabsContent><TabsContent value="templates"><SimpleTable rows={data.templates || []} columns={["Name", "Fields", "Created"]} render={(t) => [t.name, t.mergeFields?.length, new Date(t.createdAt).toLocaleString()]} /></TabsContent><TabsContent value="audit"><SimpleTable rows={data.audits || []} columns={["Time", "Action", "User", "Target"]} render={(a) => [new Date(a.createdAt).toLocaleString(), a.action, a.userName, a.targetName]} /></TabsContent></Tabs></div>;
}

function SimpleTable({ rows, columns, render }: { rows: any[]; columns: string[]; render: (row: any) => React.ReactNode[] }) {
  return <Card><CardContent className="p-4"><Table><TableHeader><TableRow>{columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row._id}>{render(row).map((cell, i) => <TableCell key={i}>{cell}</TableCell>)}</TableRow>)}</TableBody></Table></CardContent></Card>;
}
