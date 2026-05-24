"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/client-api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  async function load() { setUsers((await apiFetch<any>(`/api/admin/users?q=${q}&filter=${filter}`)).users); }
  useEffect(() => { load(); }, [q, filter]);
  async function create(formData: FormData) {
    const password = String(formData.get("password"));
    if (password !== String(formData.get("confirm"))) { toast.error("Passwords do not match"); return; }
    await apiFetch("/api/admin/users", { method: "POST", body: JSON.stringify({ name: formData.get("name"), email: formData.get("email"), password, role: formData.get("role"), dailyLimit: Number(formData.get("dailyLimit") || 500), monthlyLimit: Number(formData.get("monthlyLimit") || 10000) }) });
    toast.success("User created — they can now log in at /login");
    setOpen(false); load();
  }
  async function action(path: string) { await apiFetch(path, { method: "POST", body: "{}" }); toast.success("Updated"); load(); }
  async function remove(id: string) { if (!confirm("This will delete all their emails, drafts, templates")) return; await apiFetch(`/api/admin/users?id=${id}`, { method: "DELETE" }); toast.success("User deleted"); load(); }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-semibold">Users</h2><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button>Create User</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader><form action={create} className="space-y-3"><Input name="name" placeholder="Full Name" required /><Input name="email" type="email" placeholder="Email" required /><Input name="password" type="password" placeholder="Password" required minLength={8} /><Input name="confirm" type="password" placeholder="Confirm Password" required /><Select name="role" defaultValue="user"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select><Input name="dailyLimit" type="number" defaultValue={500} /><Input name="monthlyLimit" type="number" defaultValue={10000} /><Button>Create</Button></form></DialogContent></Dialog></div>
      <Card><CardContent className="flex gap-3 p-4"><Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="deactivated">Deactivated</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></CardContent></Card>
      <Card><CardHeader><CardTitle>User Management</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Sent</TableHead><TableHead>Daily Limit</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{users.map((user) => <TableRow key={user._id}><TableCell>{user.name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user.role}</TableCell><TableCell>{user.isActive === false ? "Deactivated" : "Active"}</TableCell><TableCell>{user.sentTotal}</TableCell><TableCell>{user.dailyLimit || 0}</TableCell><TableCell className="space-x-2"><Button asChild size="sm" variant="outline"><Link href={`/admin/users/${user._id}`}>View</Link></Button><Button size="sm" variant="outline" onClick={() => action(`/api/admin/users/${user._id}/${user.isActive === false ? "reactivate" : "deactivate"}`)}>{user.isActive === false ? "Reactivate" : "Deactivate"}</Button><ResetPassword id={user._id} /><Button size="sm" variant="destructive" onClick={() => remove(user._id)}>Delete</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    </div>
  );
}

function ResetPassword({ id }: { id: string }) {
  async function reset(formData: FormData) {
    const password = String(formData.get("password"));
    if (password !== String(formData.get("confirm"))) { toast.error("Passwords do not match"); return; }
    await apiFetch(`/api/admin/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password, forcePasswordReset: formData.get("force") === "on" }) });
    toast.success("Password reset");
  }
  return <Dialog><DialogTrigger asChild><Button size="sm" variant="outline">Reset Password</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader><form action={reset} className="space-y-3"><Input name="password" type="password" required minLength={8} /><Input name="confirm" type="password" required /><label className="flex items-center gap-2 text-sm"><Switch name="force" /> Force password change on next login</label><Button>Reset</Button></form></DialogContent></Dialog>;
}
