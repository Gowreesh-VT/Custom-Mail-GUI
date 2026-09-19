"use client";

/* eslint-disable @next/next/no-img-element */

import { use, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Download, Plus, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/client-api";

type Campaign = { id: string; name: string; type: string; scanMode: string; expiresAt?: string; displayFields: string[]; brandColor: string; bgColor: string; _count?: { qrCodes: number; scanLogs: number } };
type Code = { id: string; imageUrl: string; recipientName?: string; recipientEmail?: string; status: string; scanCount: number; createdAt: string; encodedData?: string };
type Log = { id: string; result: string; scannedAt: string; ipAddress?: string; operator?: { name: string }; qrCode?: { recipientName?: string; recipientEmail?: string } };

export default function QrCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [codes, setCodes] = useState<Code[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ recipientName: "", recipientEmail: "", url: "", text: "", fields: { NAME: "", EVENT: "", DATE: "", TYPE: "", SEAT: "", TIER: "", EMAIL: "" } as Record<string, string> });

  async function load() {
    const [campaignData, codesData, logsData] = await Promise.all([
      apiFetch<{ campaign: Campaign }>(`/api/qr/campaigns/${id}`),
      apiFetch<{ qrCodes: Code[] }>(`/api/qr/campaigns/${id}/codes?limit=100`),
      apiFetch<{ scanLogs: Log[] }>(`/api/qr/campaigns/${id}/scanlogs?limit=100`)
    ]);
    setCampaign(campaignData.campaign);
    setCodes(codesData.qrCodes);
    setLogs(logsData.scanLogs);
  }

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const stats = useMemo(() => ({
    total: codes.length,
    active: codes.filter((code) => code.status === "active").length,
    used: codes.filter((code) => code.status === "used").length,
    expired: codes.filter((code) => code.status === "expired").length
  }), [codes]);

  async function generateQr() {
    if (!campaign) return;
    await apiFetch("/api/qr/generate", {
      method: "POST",
      body: JSON.stringify({
        campaignId: id,
        contentType: campaign.type,
        recipientName: form.recipientName,
        recipientEmail: form.recipientEmail,
        fields: form.fields,
        url: form.url,
        text: form.text,
        mergeData: form.fields
      })
    });
    toast.success("QR generated");
    setOpen(false);
    await load();
  }

  async function invalidate(codeId: string) {
    await apiFetch(`/api/qr/codes/${codeId}/invalidate`, { method: "POST" });
    toast.success("QR invalidated");
    await load();
  }

  if (!campaign) return <div className="p-6 text-muted-foreground">Loading campaign...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div><h2 className="text-2xl font-semibold">{campaign.name}</h2><div className="mt-2 flex gap-2"><Badge>{campaign.type}</Badge><Badge variant="outline">{campaign.scanMode}</Badge></div></div>
        <div className="flex gap-2"><Button asChild variant="outline"><a href={`/api/qr/campaigns/${id}/download-zip`}><Download className="h-4 w-4" />Download All</a></Button></div>
      </div>

      <Tabs defaultValue="codes">
        <TabsList><TabsTrigger value="codes">QR Codes</TabsTrigger><TabsTrigger value="logs">Scan Logs</TabsTrigger><TabsTrigger value="stats">Stats</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger></TabsList>
        <TabsContent value="codes" className="space-y-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Generate Single QR</Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>Generate QR</DialogTitle></DialogHeader>
              <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                <div className="grid gap-3">
                  <Label>Recipient Name<Input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} /></Label>
                  <Label>Recipient Email<Input value={form.recipientEmail} onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })} /></Label>
                  {campaign.type === "checkin" && Object.keys(form.fields).map((field) => <Label key={field}>{field}<Input value={form.fields[field]} onChange={(e) => setForm({ ...form, fields: { ...form.fields, [field]: e.target.value } })} /></Label>)}
                  {campaign.type === "url" && <Label>URL<Input placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Label>}
                  {campaign.type === "text" && <Label>Text<Textarea maxLength={300} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></Label>}
                  <Button onClick={generateQr}>Generate & Save</Button>
                </div>
                <div className="grid place-items-center rounded-md border bg-muted/30 p-4"><QRCodeSVG value={`QR_V1|ID:PREVIEW|NAME:${form.fields.NAME || "Preview"}`} size={180} fgColor={campaign.brandColor} bgColor={campaign.bgColor} /></div>
              </div>
            </DialogContent>
          </Dialog>
          <Card><Table><TableHeader><TableRow><TableHead>QR</TableHead><TableHead>Recipient</TableHead><TableHead>Status</TableHead><TableHead>Scans</TableHead><TableHead>Created</TableHead><TableHead /></TableRow></TableHeader><TableBody>{codes.map((code) => <TableRow key={code.id}><TableCell><img src={code.imageUrl} alt="QR" className="h-10 w-10" /></TableCell><TableCell>{code.recipientName || "Single QR"}<div className="text-xs text-muted-foreground">{code.recipientEmail}</div></TableCell><TableCell><Badge>{code.status}</Badge></TableCell><TableCell>{code.scanCount}</TableCell><TableCell>{new Date(code.createdAt).toLocaleString()}</TableCell><TableCell className="text-right"><Button asChild size="sm" variant="outline"><a href={code.imageUrl} download><Download className="h-4 w-4" /></a></Button><Button size="sm" variant="ghost" onClick={() => invalidate(code.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></Card>
        </TabsContent>
        <TabsContent value="logs"><Card><Table><TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Operator</TableHead><TableHead>Result</TableHead><TableHead>Recipient</TableHead><TableHead>IP</TableHead></TableRow></TableHeader><TableBody>{logs.map((log) => <TableRow key={log.id}><TableCell>{new Date(log.scannedAt).toLocaleString()}</TableCell><TableCell>{log.operator?.name || "Unknown"}</TableCell><TableCell><Badge>{log.result}</Badge></TableCell><TableCell>{log.qrCode?.recipientName || log.qrCode?.recipientEmail}</TableCell><TableCell>{log.ipAddress}</TableCell></TableRow>)}</TableBody></Table></Card></TabsContent>
        <TabsContent value="stats"><div className="grid gap-4 md:grid-cols-4">{Object.entries(stats).map(([key, value]) => <Card key={key}><CardHeader><CardTitle className="capitalize">{key}</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{value}</CardContent></Card>)}</div></TabsContent>
        <TabsContent value="settings"><Card><CardContent className="space-y-4 pt-6"><p className="text-sm text-muted-foreground">Campaign settings can be adjusted from this tab in the next refinement pass.</p><Button onClick={load} variant="outline"><RotateCw className="h-4 w-4" />Refresh</Button></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
