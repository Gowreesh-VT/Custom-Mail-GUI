"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/client-api";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [category, setCategory] = useState("all");
  const [userId, setUserId] = useState("all");
  const [q, setQ] = useState("");
  const load = useCallback(async () => { const d = await apiFetch<any>(`/api/admin/audit?category=${category}&userId=${userId}&q=${q}`); setLogs(d.logs); setUsers(d.users); }, [category, userId, q]);
  useEffect(() => { load(); }, [load]);
  function exportCsv() {
    const csv = ["Time,Category,Action,User,Target,IP,Details", ...logs.map((l) => [l.createdAt, l.category, l.action, l.userName, l.targetName, l.ip, JSON.stringify(l.metadata)].map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "audit-log.csv"; a.click();
  }
  return <div className="space-y-5"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-semibold">Audit Log</h2><p className="text-sm text-muted-foreground">Audit logs are retained indefinitely.</p></div><Button onClick={exportCsv}>Export CSV</Button></div><Card><CardContent className="flex flex-wrap gap-3 p-4"><Select value={category} onValueChange={setCategory}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="AUTH">Auth</SelectItem><SelectItem value="EMAIL">Email</SelectItem><SelectItem value="ADMIN">Admin</SelectItem></SelectContent></Select><Select value={userId} onValueChange={setUserId}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All users</SelectItem>{users.map((u) => <SelectItem key={String(u._id)} value={String(u._id)}>{u.name}</SelectItem>)}</SelectContent></Select><Input className="max-w-sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></CardContent></Card><Card><CardHeader><CardTitle>Events</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Category</TableHead><TableHead>Action</TableHead><TableHead>User</TableHead><TableHead>Target</TableHead><TableHead>IP</TableHead><TableHead>Details</TableHead></TableRow></TableHeader><TableBody>{logs.map((l) => <TableRow key={String(l._id)}><TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell><TableCell>{l.category}</TableCell><TableCell>{l.action}</TableCell><TableCell>{l.userName}</TableCell><TableCell>{l.targetName}</TableCell><TableCell>{l.ip}</TableCell><TableCell><pre className="max-w-xs overflow-auto text-xs">{JSON.stringify(l.metadata, null, 2)}</pre></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>;
}
