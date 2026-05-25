"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Plus, QrCode, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/client-api";

type Campaign = {
  id: string;
  name: string;
  description?: string;
  type: string;
  scanMode: string;
  expiresAt?: string;
  isActive: boolean;
  brandColor: string;
  bgColor: string;
  displayFields: string[];
  _count?: { qrCodes: number; scanLogs: number };
};

const defaultFields = ["NAME", "EVENT", "DATE", "TYPE", "SEAT", "TIER", "EMAIL"];

export default function QrCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [now, setNow] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "checkin",
    scanMode: "once",
    expiresAt: "",
    brandColor: "#111827",
    bgColor: "#ffffff",
    cornerRadius: 0,
    borderSize: 0,
    borderColor: "#111827",
    logoUrl: "",
    displayFields: ["NAME", "EVENT", "DATE"]
  });

  async function load() {
    const data = await apiFetch<{ campaigns: Campaign[] }>("/api/qr/campaigns");
    setCampaigns(data.campaigns);
  }

  useEffect(() => {
    setNow(Date.now());
    load().catch((error) => toast.error(error.message));
  }, []);

  const visible = useMemo(() => {
    return campaigns.filter((campaign) => {
      const expired = campaign.expiresAt ? new Date(campaign.expiresAt).getTime() < now : false;
      if (filter === "active" && (expired || !campaign.isActive)) return false;
      if (filter === "expired" && !expired) return false;
      return campaign.name.toLowerCase().includes(query.toLowerCase());
    });
  }, [campaigns, filter, now, query]);

  async function createCampaign() {
    const data = await apiFetch<{ campaign: Campaign }>("/api/qr/campaigns", {
      method: "POST",
      body: JSON.stringify({ ...form, expiresAt: form.expiresAt || null })
    });
    toast.success("QR campaign created");
    setOpen(false);
    setCampaigns((current) => [data.campaign, ...current]);
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Delete this QR campaign and all related codes/scans?")) return;
    await apiFetch(`/api/qr/campaigns/${id}`, { method: "DELETE" });
    setCampaigns((current) => current.filter((campaign) => campaign.id !== id));
    toast.success("QR campaign deleted");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">QR Codes</h2>
          <p className="text-muted-foreground">Create branded QR campaigns for check-ins, links, and text.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />New Campaign</Button></DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader><DialogTitle>Create QR Campaign</DialogTitle></DialogHeader>
            <div className="grid gap-5 md:grid-cols-[1fr_260px]">
              <div className="grid gap-3">
                <Label>Name<Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Label>
                <Label>Description<Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Label>
                <div className="grid grid-cols-2 gap-3">
                  <Label>Type<select className="mt-2 w-full rounded-md border bg-background p-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="checkin">Check-in</option><option value="url">URL</option><option value="text">Text</option></select></Label>
                  <Label>Scan Mode<select className="mt-2 w-full rounded-md border bg-background p-2" value={form.scanMode} onChange={(e) => setForm({ ...form, scanMode: e.target.value })}><option value="once">One-time</option><option value="unlimited">Unlimited</option></select></Label>
                </div>
                <Label>Expiry Date<Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} /></Label>
                <div className="grid grid-cols-2 gap-3">
                  <Label>Foreground<Input type="color" value={form.brandColor} onChange={(e) => setForm({ ...form, brandColor: e.target.value })} /></Label>
                  <Label>Background<Input type="color" value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} /></Label>
                </div>
                <Label>Logo URL<Input placeholder="https://..." value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} /></Label>
                {form.type === "checkin" && <div className="grid gap-2"><span className="text-sm font-medium">Scanner display fields</span><div className="flex flex-wrap gap-2">{defaultFields.map((field) => <Button key={field} type="button" size="sm" variant={form.displayFields.includes(field) ? "secondary" : "outline"} onClick={() => setForm((current) => ({ ...current, displayFields: current.displayFields.includes(field) ? current.displayFields.filter((item) => item !== field) : [...current.displayFields, field] }))}>{field}</Button>)}</div></div>}
                <Button onClick={createCampaign} disabled={!form.name}>Create Campaign</Button>
              </div>
              <div className="grid place-items-center rounded-md border bg-muted/30 p-4">
                <QRCodeSVG value="QR_V1|ID:PREVIEW|NAME:Preview" size={200} fgColor={form.brandColor} bgColor={form.bgColor} level="H" />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search campaigns" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="flex gap-2">{(["all", "active", "expired"] as const).map((item) => <Button key={item} variant={filter === item ? "secondary" : "outline"} onClick={() => setFilter(item)}>{item[0].toUpperCase() + item.slice(1)}</Button>)}</div>
      </div>

      {visible.length === 0 ? (
        <Card><CardContent className="grid place-items-center gap-3 py-16 text-center"><QrCode className="h-10 w-10 text-muted-foreground" /><div className="text-lg font-medium">No campaigns yet</div><Button onClick={() => setOpen(true)}>Create your first campaign</Button></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((campaign) => <Card key={campaign.id} className="overflow-hidden">
            <CardHeader><CardTitle className="flex items-start justify-between gap-2"><span>{campaign.name}</span><Badge>{campaign.type}</Badge></CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{campaign.description || "No description"}</p>
              <div className="grid grid-cols-2 gap-2 text-sm"><span>{campaign._count?.qrCodes || 0} QR codes</span><span>{campaign._count?.scanLogs || 0} scans</span><span>{campaign.scanMode === "once" ? "One-time" : "Unlimited"}</span><span>{campaign.expiresAt ? new Date(campaign.expiresAt).toLocaleDateString() : "No expiry"}</span></div>
              <div className="flex gap-2"><Button asChild className="flex-1"><Link href={`/qr/${campaign.id}`}>View</Link></Button><Button variant="outline" size="icon" onClick={() => deleteCampaign(campaign.id)}><Trash2 className="h-4 w-4" /></Button></div>
            </CardContent>
          </Card>)}
        </div>
      )}
    </div>
  );
}
