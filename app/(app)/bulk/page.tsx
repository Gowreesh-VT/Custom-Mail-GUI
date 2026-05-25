"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { Check, FileSpreadsheet, Layers, Play, QrCode, Square, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/client-api";
import { replaceQrPlaceholdersForPreview, replaceTemplateValues, TEMPLATE_THUMBNAIL_PLACEHOLDER } from "@/lib/template-client";

type TemplateListItem = {
  _id: string;
  name: string;
  subjectLine?: string;
  subject?: string;
  mergeFields: string[];
  previewImage?: string;
  isFavourite?: boolean;
};

export default function BulkPage() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [qrCampaigns, setQrCampaigns] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [fullTemplate, setFullTemplate] = useState<any | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [qrConfig, setQrConfig] = useState<Record<string, any>>({});
  const [delayMs, setDelayMs] = useState(500);
  const [logs, setLogs] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    apiFetch<{ templates: TemplateListItem[] }>("/api/templates").then((data) => setTemplates(data.templates)).catch((error) => toast.error(error.message));
    apiFetch<{ campaigns: any[] }>("/api/qr/campaigns?isActive=true").then((data) => setQrCampaigns(data.campaigns)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!templateId) return;
    apiFetch<{ template: any }>(`/api/templates/${templateId}`).then(({ template }) => {
      setFullTemplate(template);
      const nextMap: Record<string, string> = {};
      (template.mergeFields || []).filter((field: string) => !/^qr_[a-z_]+$/.test(field)).forEach((field: string) => {
        nextMap[field] = columns.includes(field) ? field : "";
      });
      setColumnMap(nextMap);
    }).catch((error) => toast.error(error.message));
  }, [templateId, columns]);

  async function inspect(nextFile: File | null) {
    setFile(nextFile);
    if (!nextFile) return;
    const parsed = Papa.parse<Record<string, string>>(await nextFile.text(), { header: true, skipEmptyLines: true });
    const fields = parsed.meta.fields || [];
    if (!fields.includes("email")) {
      setRows([]);
      setColumns(fields);
      return toast.error('CSV must include an "email" column');
    }
    setColumns(fields);
    setRows(parsed.data.filter((row) => row.email).slice(0, 100));
    setStep(2);
  }

  const mappedSample = useMemo(() => {
    const sampleRow = rows[0] || {};
    return Object.fromEntries(Object.entries(columnMap).map(([field, column]) => [field, sampleRow[column] || ""]));
  }, [columnMap, rows]);
  const previewHtml = fullTemplate ? replaceQrPlaceholdersForPreview(replaceTemplateValues(fullTemplate.bodyHtml, mappedSample)) : "";
  const qrFields = (fullTemplate?.mergeFields || []).filter((field: string) => /^qr_[a-z_]+$/.test(field));
  const textFields = (fullTemplate?.mergeFields || []).filter((field: string) => !/^qr_[a-z_]+$/.test(field));
  const canSend = file && fullTemplate && rows.length > 0 && Object.values(columnMap).every(Boolean) && qrFields.every((field: string) => qrConfig[field]?.campaignId);
  const favouriteTemplates = templates.filter((template) => template.isFavourite);
  const otherTemplates = templates.filter((template) => !template.isFavourite);

  async function sendBulk() {
    if (!canSend || !file || !fullTemplate) return toast.error("Complete all steps before sending");
    setSending(true);
    setLogs([]);
    const controller = new AbortController();
    abortRef.current = controller;
    const form = new FormData();
    form.set("csv", file);
    form.set("templateId", fullTemplate._id);
    form.set("columnMap", JSON.stringify(columnMap));
    form.set("qrConfig", JSON.stringify(qrConfig));
    form.set("delayMs", String(delayMs));
    try {
      const res = await fetch("/api/send-bulk", { method: "POST", body: form, signal: controller.signal });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines.filter(Boolean)) setLogs((current) => [JSON.parse(line), ...current].slice(0, 300));
      }
      toast.success("Bulk run finished");
    } catch (error: any) {
      if (error.name === "AbortError") {
        setLogs((current) => [{ type: "stopped" }, ...current]);
        toast.info("Bulk run stopped");
      } else {
        toast.error(error.message);
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  }

  function stopSending() {
    abortRef.current?.abort();
    setSending(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Bulk Send</h1>
        <p className="text-sm text-muted-foreground">CSV to saved HTML template mail merge, with editable field mapping and streaming progress.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {["Upload CSV", "Select Template", "Map Fields", "Preview & Send"].map((label, index) => (
          <Card key={label} className={step === index + 1 ? "border-ring" : ""}>
            <CardContent className="flex items-center gap-2 p-3 text-sm">
              {step > index + 1 ? <Check className="h-4 w-4 text-sent" /> : <Badge variant={step === index + 1 ? "default" : "secondary"}>{index + 1}</Badge>}
              {label}
            </CardContent>
          </Card>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />Upload CSV</CardTitle><CardDescription>Requires an email column. Matching CSV columns will auto-map to template fields.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="csv" className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-accent/20 p-6 text-center"><Upload className="h-6 w-6" />{file?.name || "Choose CSV file"}</Label>
            <Input id="csv" className="hidden" type="file" accept=".csv" onChange={(event) => inspect(event.target.files?.[0] || null)} />
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Select Template</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...favouriteTemplates, ...otherTemplates].map((template) => (
              <button key={template._id} type="button" onClick={() => { setTemplateId(template._id); setStep(3); }} className="overflow-hidden rounded-lg border bg-card text-left transition-colors hover:bg-accent">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={template.previewImage || TEMPLATE_THUMBNAIL_PLACEHOLDER} alt="" className="aspect-[16/10] w-full object-cover" />
                <div className="space-y-2 p-4">
                  <div className="font-medium">{template.isFavourite ? "★ " : ""}{template.name}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{template.mergeFields?.length || 0} fields</Badge>
                    {template.mergeFields?.some((field) => /^qr_[a-z_]+$/.test(field)) && <Badge><QrCode className="h-3 w-3" />QR</Badge>}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 3 && fullTemplate && (
        <Card>
          <CardHeader><CardTitle>Map CSV Columns</CardTitle><CardDescription>Exact column matches were selected automatically. Review and adjust before sending.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {qrFields.length > 0 && <div className="rounded-md border bg-accent/20 p-3 text-sm"><div className="font-medium">This template contains QR placeholders</div><div className="text-muted-foreground">{qrFields.map((field: string) => `{{${field}}}`).join(", ")}</div></div>}
            <h3 className="font-medium">Text Merge Fields</h3>
            {textFields.map((field: string) => (
              <div key={field} className="grid gap-2 md:grid-cols-[220px_1fr] md:items-center">
                <Label>{`{{${field}}}`}</Label>
                <Select value={columnMap[field] || ""} onValueChange={(value) => setColumnMap((current) => ({ ...current, [field]: value }))}>
                  <SelectTrigger><SelectValue placeholder="Choose CSV column" /></SelectTrigger>
                  <SelectContent>{columns.map((column) => <SelectItem key={column} value={column}>{column}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            {qrFields.length > 0 && <div className="space-y-4 rounded-md border p-4">
              <h3 className="flex items-center gap-2 font-medium"><QrCode className="h-4 w-4" />QR Code Configuration</h3>
              {qrFields.map((field: string) => {
                const selected = qrCampaigns.find((campaign) => campaign.id === qrConfig[field]?.campaignId);
                return (
                  <div key={field} className="grid gap-3 rounded-md border bg-card p-3">
                    <Label>{`{{${field}}}`} Campaign
                      <select className="mt-2 w-full rounded-md border bg-background p-2" value={qrConfig[field]?.campaignId || ""} onChange={(event) => setQrConfig((current) => ({ ...current, [field]: { ...(current[field] || {}), campaignId: event.target.value, contentType: qrCampaigns.find((campaign) => campaign.id === event.target.value)?.type || "checkin" } }))}>
                        <option value="">Select campaign</option>
                        {qrCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name} ({campaign.type})</option>)}
                      </select>
                    </Label>
                    {selected?.type === "url" && <Label>URL template<Input placeholder="https://event.com/{{email}}" value={qrConfig[field]?.urlTemplate || ""} onChange={(event) => setQrConfig((current) => ({ ...current, [field]: { ...(current[field] || {}), urlTemplate: event.target.value } }))} /></Label>}
                    {selected?.type === "text" && <Label>Text template<Input placeholder="Hi {{name}}" value={qrConfig[field]?.textTemplate || ""} onChange={(event) => setQrConfig((current) => ({ ...current, [field]: { ...(current[field] || {}), textTemplate: event.target.value } }))} /></Label>}
                    {selected?.type === "checkin" && <p className="text-sm text-muted-foreground">Check-in QRs use the recipient CSV row values.</p>}
                  </div>
                );
              })}
            </div>}
            <Button onClick={() => setStep(4)}>Continue to Preview</Button>
          </CardContent>
        </Card>
      )}

      {step === 4 && fullTemplate && (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader><CardTitle>Preview</CardTitle><CardDescription>{replaceTemplateValues(fullTemplate.subjectLine || fullTemplate.subject || "", mappedSample)}</CardDescription></CardHeader>
            <CardContent><iframe title="Bulk preview" sandbox="" srcDoc={previewHtml} className="h-[560px] w-full rounded-md border bg-background" /></CardContent>
          </Card>
          <div className="space-y-5">
            <Card>
              <CardHeader><CardTitle>Send Controls</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2"><Label>Delay between sends (ms)</Label><Input type="number" value={delayMs} onChange={(event) => setDelayMs(Number(event.target.value))} /></div>
                <div className="flex gap-2">
                  <Button disabled={!canSend || sending} onClick={sendBulk}><Play className="h-4 w-4" />Send All</Button>
                  {sending && <Button variant="destructive" onClick={stopSending}><Square className="h-4 w-4" />Stop Sending</Button>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Progress</CardTitle></CardHeader>
              <CardContent className="max-h-96 space-y-2 overflow-auto">
                {logs.map((log, index) => <div key={index} className="text-sm"><Badge variant={log.type === "failed" ? "failed" : log.type === "sent" ? "sent" : "scheduled"}>{log.type}</Badge> {log.email || log.total || log.error}</div>)}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>CSV Preview</CardTitle></CardHeader>
        <CardContent><Table><TableHeader><TableRow>{columns.map((key) => <TableHead key={key}>{key}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.slice(0, 8).map((row, index) => <TableRow key={index}>{columns.map((column) => <TableCell key={column}>{row[column]}</TableCell>)}</TableRow>)}</TableBody></Table></CardContent>
      </Card>
    </div>
  );
}
