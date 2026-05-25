"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/client-api";

type Operator = { id: string; name: string; email: string; isActive: boolean; totalScans: number; lastScanAt?: string; campaigns: Array<{ campaign: { id: string; name: string } }> };
type Campaign = { id: string; name: string; type: string };

export default function AdminOperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [open, setOpen] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", pin: "", confirmPin: "", campaignIds: [] as string[] });

  async function load() {
    const [operatorData, campaignData] = await Promise.all([
      apiFetch<{ operators: Operator[] }>("/api/admin/qr/operators"),
      apiFetch<{ campaigns: Campaign[] }>("/api/qr/campaigns")
    ]);
    setOperators(operatorData.operators);
    setCampaigns(campaignData.campaigns);
  }

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, []);

  async function createOperator() {
    if (form.pin !== form.confirmPin) return toast.error("PINs do not match");
    await apiFetch("/api/admin/qr/operators", { method: "POST", body: JSON.stringify(form) });
    toast.success(`Operator created. Share these credentials: ${form.email} | PIN: ${form.pin}`);
    setOpen(false);
    setForm({ name: "", email: "", pin: "", confirmPin: "", campaignIds: [] });
    await load();
  }

  async function toggle(operator: Operator) {
    await apiFetch(`/api/admin/qr/operators/${operator.id}/${operator.isActive ? "deactivate" : "reactivate"}`, { method: "POST" });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this operator?")) return;
    await apiFetch(`/api/admin/qr/operators/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl font-semibold">Scanner Operators</h2><p className="text-muted-foreground">Manage mobile scanner access.</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button><Plus className="h-4 w-4" />Create Operator</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create Operator</DialogTitle></DialogHeader><div className="grid gap-3"><Label>Full Name<Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Label><Label>Email<Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Label><Label>PIN<div className="flex gap-2"><Input type={showPin ? "text" : "password"} inputMode="numeric" maxLength={6} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })} /><Button type="button" variant="outline" size="icon" onClick={() => setShowPin(!showPin)}>{showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div></Label><Label>Confirm PIN<Input type={showPin ? "text" : "password"} inputMode="numeric" maxLength={6} value={form.confirmPin} onChange={(e) => setForm({ ...form, confirmPin: e.target.value.replace(/\D/g, "").slice(0, 6) })} /></Label><div className="space-y-2"><span className="text-sm font-medium">Assign Campaigns</span>{campaigns.map((campaign) => <label key={campaign.id} className="flex items-center gap-2 rounded-md border p-2 text-sm"><input type="checkbox" checked={form.campaignIds.includes(campaign.id)} onChange={(e) => setForm((current) => ({ ...current, campaignIds: e.target.checked ? [...current.campaignIds, campaign.id] : current.campaignIds.filter((id) => id !== campaign.id) }))} />{campaign.name}<Badge variant="outline">{campaign.type}</Badge></label>)}</div><Button onClick={createOperator}>Create Operator</Button></div></DialogContent></Dialog></div>
      <div className="grid gap-4 md:grid-cols-4"><Card><CardHeader><CardTitle>Total Operators</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{operators.length}</CardContent></Card><Card><CardHeader><CardTitle>Active</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{operators.filter((item) => item.isActive).length}</CardContent></Card><Card><CardHeader><CardTitle>Total Scans</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{operators.reduce((sum, item) => sum + item.totalScans, 0)}</CardContent></Card><Card><CardHeader><CardTitle>Most Active</CardTitle></CardHeader><CardContent className="truncate text-lg font-semibold">{[...operators].sort((a, b) => b.totalScans - a.totalScans)[0]?.name || "-"}</CardContent></Card></div>
      <Card><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead>Campaigns</TableHead><TableHead>Scans</TableHead><TableHead>Last Scan</TableHead><TableHead /></TableRow></TableHeader><TableBody>{operators.map((operator) => <TableRow key={operator.id}><TableCell>{operator.name}</TableCell><TableCell>{operator.email}</TableCell><TableCell><Badge>{operator.isActive ? "Active" : "Inactive"}</Badge></TableCell><TableCell>{operator.campaigns.map((item) => item.campaign.name).join(", ") || "-"}</TableCell><TableCell>{operator.totalScans}</TableCell><TableCell>{operator.lastScanAt ? new Date(operator.lastScanAt).toLocaleString() : "-"}</TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => toggle(operator)}>{operator.isActive ? "Deactivate" : "Reactivate"}</Button><Button size="sm" variant="ghost" onClick={() => remove(operator.id)}>Delete</Button></TableCell></TableRow>)}</TableBody></Table></Card>
    </div>
  );
}
