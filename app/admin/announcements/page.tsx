"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/client-api";

export default function AdminAnnouncementsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  async function load() { setRows((await apiFetch<any>("/api/admin/announcements")).announcements); }
  useEffect(() => { load(); }, []);
  async function create(formData: FormData) { await apiFetch("/api/admin/announcements", { method: "POST", body: JSON.stringify({ message: formData.get("message"), type: formData.get("type"), expiresAt: formData.get("expiresAt") || undefined }) }); toast.success("Announcement created"); setOpen(false); load(); }
  async function toggle(row: any) { await apiFetch(`/api/admin/announcements/${row._id}`, { method: "PUT", body: JSON.stringify({ isActive: !row.isActive }) }); load(); }
  async function remove(id: string) { await apiFetch(`/api/admin/announcements/${id}`, { method: "DELETE" }); toast.success("Deleted"); load(); }
  return <div className="space-y-5"><div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">Announcements</h2><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button>New Announcement</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader><form action={create} className="space-y-3"><Textarea name="message" required placeholder="Message" /><Select name="type" defaultValue="info"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="info">Info</SelectItem><SelectItem value="warning">Warning</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select><Input name="expiresAt" type="datetime-local" /><Button>Create</Button></form></DialogContent></Dialog></div><div className="grid gap-3">{rows.map((row) => <Card key={row._id}><CardHeader><CardTitle className="text-base">{row.type} · {row.isActive ? "Active" : "Inactive"}</CardTitle></CardHeader><CardContent className="space-y-3"><p>{row.message}</p><div className="flex gap-2"><Button variant="outline" onClick={() => toggle(row)}>{row.isActive ? "Deactivate" : "Activate"}</Button><Button variant="destructive" onClick={() => remove(row._id)}>Delete</Button></div></CardContent></Card>)}</div></div>;
}
