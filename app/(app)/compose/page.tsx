"use client";

import { useEffect, useState } from "react";
import { Eye, Paperclip, Save, Send, Clock, Layers, Star } from "lucide-react";
import { toast } from "sonner";
import { RichEditor } from "@/components/rich-editor";
import { TagInput } from "@/components/tag-input";
import { apiFetch } from "@/lib/client-api";
import { replaceQrPlaceholdersForPreview } from "@/lib/template-client";
import { detectQrPlaceholders } from "@/lib/qr-placeholders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ComposePage() {
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p>Hello,</p>");
  const [raw, setRaw] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [quickStats, setQuickStats] = useState<any>(null);
  const [qrCampaigns, setQrCampaigns] = useState<any[]>([]);
  const [qrConfig, setQrConfig] = useState<Record<string, any>>({});
  const [previewHtml, setPreviewHtml] = useState("<p>Hello,</p>");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    apiFetch<any>("/api/templates").then((d) => setTemplates(d.templates || [])).catch(() => {});
    apiFetch<any>("/api/user/stats/quick").then(setQuickStats).catch(() => {});
    apiFetch<{ campaigns: any[] }>("/api/qr/campaigns?isActive=true").then((data) => setQrCampaigns(data.campaigns)).catch(() => {});
  }, []);

  useEffect(() => {
    setPreviewHtml(replaceQrPlaceholdersForPreview(bodyHtml));
  }, [bodyHtml]);

  useEffect(() => {
    function keys(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        sendNow();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveDraft();
      }
    }
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  });

  async function sendNow() {
    try {
      await apiFetch("/api/send", {
        method: "POST",
        body: JSON.stringify({ to, cc, bcc, replyTo, subject, bodyHtml, trackingEnabled, qrConfig })
      });
      toast.success("Email sent");
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function saveDraft() {
    try {
      await apiFetch("/api/drafts", { method: "POST", body: JSON.stringify({ to, cc, bcc, replyTo, subject, bodyHtml }) });
      toast.success("Draft saved");
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function saveTemplate(formData: FormData) {
    await apiFetch("/api/templates", { method: "POST", body: JSON.stringify({ name: formData.get("name"), subject, bodyHtml }) });
    toast.success("Template saved");
  }

  async function loadTemplate(template: any) {
    const full = await apiFetch<any>(`/api/templates/${template._id}`);
    setSubject(full.template.subjectLine || full.template.subject || "");
    setBodyHtml(full.template.bodyHtml || "");
    const qrFields = detectQrPlaceholders(full.template.bodyHtml || "");
    if (qrFields.length) {
      setQrConfig((current) => {
        const next = { ...current };
        for (const field of qrFields) {
          next[field] = next[field] || { width: 200, height: 200, alt: "QR Code" };
        }
        return next;
      });
    }
  }

  const dailyHit = quickStats?.dailyLimit > 0 && quickStats.sentToday >= quickStats.dailyLimit;
  const favouriteTemplates = templates.filter((template) => template.isFavourite);
  const otherTemplates = templates.filter((template) => !template.isFavourite);
  const qrFields = detectQrPlaceholders(bodyHtml);
  const canRenderQrPreview = qrFields.length > 0 && qrFields.every((field) => qrConfig[field]?.campaignId);

  async function renderQrPreview() {
    if (!qrFields.length) return;
    setPreviewLoading(true);
    try {
      let rendered = bodyHtml;
      for (const field of qrFields) {
        const config = qrConfig[field];
        if (!config?.campaignId) continue;
        const campaign = qrCampaigns.find((item) => item.id === config.campaignId);
        const data = await apiFetch<{ qrCode: { imageUrl: string } }>("/api/qr/generate", {
          method: "POST",
          body: JSON.stringify({
            campaignId: config.campaignId,
            contentType: config.contentType || campaign?.type,
            fields: { NAME: config.name || "", EMAIL: config.email || "" },
            url: config.url,
            text: config.text,
            recipientName: config.name,
            recipientEmail: config.email || to[0]
          })
        });
        const src = `${process.env.NEXT_PUBLIC_APP_URL || ""}${data.qrCode.imageUrl}`;
        const width = Number(config.width) || 200;
        const height = Number(config.height) || width;
        const alt = config.alt || "QR Code";
        rendered = rendered.replaceAll(`{{${field}}}`, `<img src="${src}" width="${width}" height="${height}" alt="${alt}" />`);
      }
      setPreviewHtml(rendered);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function schedule() {
    try {
      await apiFetch("/api/schedule", { method: "POST", body: JSON.stringify({ to, cc, bcc, subject, bodyHtml, scheduledAt }) });
      toast.success("Email scheduled");
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Compose</h1>
        <p className="text-sm text-muted-foreground">Write, preview, save, schedule, and send through your SMTP account.</p>
      </div>
      {quickStats && <Card><CardContent className="grid gap-4 p-4 md:grid-cols-4"><QuickStat label="Sent today" value={quickStats.sentToday} limit={quickStats.dailyLimit} /><QuickStat label="Sent this month" value={quickStats.sentThisMonth} limit={quickStats.monthlyLimit} /><QuickStat label="Scheduled" value={quickStats.scheduled} /><QuickStat label="Drafts" value={quickStats.drafts} /></CardContent></Card>}
      {dailyHit && <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">You&apos;ve reached your daily sending limit ({quickStats.dailyLimit} emails). Your limit resets at midnight.</div>}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>New Email</CardTitle>
            <CardDescription>Recipients support comma, space, or Enter separated tags.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>To</Label><TagInput value={to} onChange={setTo} placeholder="john@example.com" /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>CC</Label><TagInput value={cc} onChange={setCc} /></div>
              <div className="space-y-2"><Label>BCC</Label><TagInput value={bcc} onChange={setBcc} /></div>
            </div>
            <div className="space-y-2"><Label>Reply-To</Label><Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} /></div>
            <div className="space-y-2"><Label>Subject <span className="text-muted-foreground">({subject.length})</span></Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={trackingEnabled} onCheckedChange={(value) => setTrackingEnabled(Boolean(value))} />Enable open & click tracking</label>
            <Tabs value={raw ? "raw" : "visual"} onValueChange={(v) => setRaw(v === "raw")}>
              <TabsList><TabsTrigger value="visual">Visual</TabsTrigger><TabsTrigger value="raw">Raw HTML</TabsTrigger></TabsList>
              <TabsContent value="visual"><RichEditor value={bodyHtml} onChange={setBodyHtml} /></TabsContent>
              <TabsContent value="raw"><Textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} className="min-h-96 font-mono" /></TabsContent>
            </Tabs>
            <div className="flex flex-wrap gap-2">
              <Button onClick={sendNow} disabled={dailyHit}><Send className="h-4 w-4" />Send Now</Button>
              <Button variant="outline" onClick={saveDraft}><Save className="h-4 w-4" />Save Draft</Button>
              <Dialog><DialogTrigger asChild><Button variant="outline"><Clock className="h-4 w-4" />Schedule</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Schedule Send</DialogTitle></DialogHeader><div className="space-y-4"><Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /><Button onClick={schedule}>Schedule</Button></div></DialogContent></Dialog>
              <Dialog><DialogTrigger asChild><Button variant="outline"><Layers className="h-4 w-4" />Save as Template</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Save Template</DialogTitle></DialogHeader><form action={saveTemplate} className="space-y-4"><Input name="name" placeholder="Template name" required /><Button>Save</Button></form></DialogContent></Dialog>
              <Button variant="outline"><Paperclip className="h-4 w-4" />Attachments</Button>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-5">
          {qrFields.length > 0 && (
            <Card>
              <CardHeader><CardTitle>QR Placeholders</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {qrFields.map((field) => {
                  const selected = qrCampaigns.find((campaign) => campaign.id === qrConfig[field]?.campaignId);
                  return (
                    <div key={field} className="grid gap-3 rounded-md border bg-card p-3">
                      <Label>{`{{${field}}}`} Campaign
                        <select
                          className="mt-2 w-full rounded-md border bg-background p-2"
                          value={qrConfig[field]?.campaignId || ""}
                          onChange={(event) => {
                            const nextCampaign = qrCampaigns.find((campaign) => campaign.id === event.target.value);
                            setQrConfig((current) => ({
                              ...current,
                              [field]: { ...(current[field] || {}), campaignId: event.target.value, contentType: nextCampaign?.type || "checkin" }
                            }));
                          }}
                        >
                          <option value="">Select campaign</option>
                          {qrCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} ({campaign.type})</option>)}
                        </select>
                      </Label>
                      {selected?.type === "checkin" && (
                        <>
                          <Label>Name<Input value={qrConfig[field]?.name || ""} onChange={(event) => setQrConfig((current) => ({ ...current, [field]: { ...(current[field] || {}), name: event.target.value } }))} /></Label>
                          <Label>Email<Input value={qrConfig[field]?.email || ""} onChange={(event) => setQrConfig((current) => ({ ...current, [field]: { ...(current[field] || {}), email: event.target.value } }))} /></Label>
                        </>
                      )}
                      {selected?.type === "url" && <Label>URL<Input placeholder="https://..." value={qrConfig[field]?.url || ""} onChange={(event) => setQrConfig((current) => ({ ...current, [field]: { ...(current[field] || {}), url: event.target.value } }))} /></Label>}
                      {selected?.type === "text" && <Label>Text<Textarea maxLength={300} value={qrConfig[field]?.text || ""} onChange={(event) => setQrConfig((current) => ({ ...current, [field]: { ...(current[field] || {}), text: event.target.value } }))} /></Label>}
                      <div className="grid grid-cols-2 gap-3">
                        <Label>Width<Input type="number" value={qrConfig[field]?.width || 200} onChange={(event) => setQrConfig((current) => ({ ...current, [field]: { ...(current[field] || {}), width: Number(event.target.value) || 200 } }))} /></Label>
                        <Label>Height<Input type="number" value={qrConfig[field]?.height || 200} onChange={(event) => setQrConfig((current) => ({ ...current, [field]: { ...(current[field] || {}), height: Number(event.target.value) || 200 } }))} /></Label>
                      </div>
                      <Label>Alt text<Input value={qrConfig[field]?.alt || "QR Code"} onChange={(event) => setQrConfig((current) => ({ ...current, [field]: { ...(current[field] || {}), alt: event.target.value } }))} /></Label>
                    </div>
                  );
                })}
                <Button variant="outline" disabled={!canRenderQrPreview || previewLoading} onClick={renderQrPreview}>Render QR Preview</Button>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4" />Preview</CardTitle></CardHeader>
            <CardContent><div className="rounded-md border bg-background p-4 text-sm" dangerouslySetInnerHTML={{ __html: previewHtml }} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Load Template</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {favouriteTemplates.length > 0 && <div className="space-y-2"><p className="text-xs font-medium text-muted-foreground">Favourites</p>{favouriteTemplates.map((template) => <Button key={template._id} variant="outline" className="w-full justify-start" onClick={() => loadTemplate(template)}><Star className="h-4 w-4 fill-current" />{template.name}</Button>)}</div>}
              {otherTemplates.map((template) => (
                <Button key={template._id} variant="outline" className="w-full justify-start" onClick={() => loadTemplate(template)}>
                  {template.name}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, limit }: { label: string; value: number; limit?: number }) {
  const pct = limit ? Math.min(100, Math.round((value / limit) * 100)) : 0;
  const color = pct > 90 ? "bg-failed" : pct >= 75 ? "bg-warning" : "bg-sent";
  return <div className="space-y-2"><div className="text-sm text-muted-foreground">{label}</div><div className="text-xl font-semibold">{value}{limit ? ` / ${limit}` : ""}</div>{Boolean(limit) && <div className="h-1.5 rounded-full bg-muted"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>}</div>;
}
