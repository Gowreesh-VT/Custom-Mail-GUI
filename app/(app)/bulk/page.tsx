"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { AlertTriangle, Award, Check, FileSpreadsheet, Layers, Loader2, Play, QrCode, Square, Upload, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

type CertificateTemplate = {
  id: string;
  name: string;
  pdfFileName: string;
  pdfSizeBytes: number;
  pageCount: number;
  previewImage?: string | null;
  fields: Array<{ placeholder: string; label: string; defaultValue?: string }>;
};

export default function BulkPage() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [certificateTemplates, setCertificateTemplates] = useState<CertificateTemplate[]>([]);
  const [qrCampaigns, setQrCampaigns] = useState<any[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [fullTemplate, setFullTemplate] = useState<any | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [qrConfig, setQrConfig] = useState<Record<string, any>>({});
  const [attachCertificate, setAttachCertificate] = useState(false);
  const [certificateTemplateId, setCertificateTemplateId] = useState("");
  const [certificateFieldMappings, setCertificateFieldMappings] = useState<Record<string, string>>({});
  const [certificateFallbacks, setCertificateFallbacks] = useState<Record<string, string>>({});
  const [certPreviewOpen, setCertPreviewOpen] = useState(false);
  const [certPreviewPdf, setCertPreviewPdf] = useState("");
  const [certPreviewRow, setCertPreviewRow] = useState(0);
  const [delayMs, setDelayMs] = useState(500);
  const [logs, setLogs] = useState<any[]>([]);
  const [parsingCsv, setParsingCsv] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [qrWarningOpen, setQrWarningOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setTemplatesLoading(true);
      try {
        const [templateData, qrData, certData] = await Promise.all([
          apiFetch<{ templates: TemplateListItem[] }>("/api/templates"),
          apiFetch<{ campaigns: any[] }>("/api/qr/campaigns?isActive=true"),
          apiFetch<{ templates: CertificateTemplate[] }>("/api/certificates")
        ]);
        if (ignore) return;
        setTemplates(templateData.templates);
        setQrCampaigns(qrData.campaigns);
        setCertificateTemplates(certData.templates);
      } catch (error: any) {
        if (!ignore) toast.error(error.message);
      } finally {
        if (!ignore) setTemplatesLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
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
    setParsingCsv(true);
    setFile(nextFile);
    try {
      if (!nextFile) return;
      const parsed = Papa.parse<Record<string, string>>(await nextFile.text(), { header: true, skipEmptyLines: true });
      const fields = parsed.meta.fields || [];
      if (!fields.includes("email")) {
        setRows([]);
        setColumns(fields);
        return toast.error('CSV must include an "email" column');
      }
      setColumns(fields);
      setRows(parsed.data.filter((row) => row.email));
      setStep(2);
    } finally {
      setParsingCsv(false);
    }
  }

  const mappedSample = useMemo(() => {
    const sampleRow = rows[0] || {};
    return Object.fromEntries(Object.entries(columnMap).map(([field, column]) => [field, sampleRow[column] || ""]));
  }, [columnMap, rows]);
  const previewHtml = fullTemplate ? replaceQrPlaceholdersForPreview(replaceTemplateValues(fullTemplate.bodyHtml, mappedSample)) : "";
  const qrFields = (fullTemplate?.mergeFields || []).filter((field: string) => /^qr_[a-z_]+$/.test(field));
  const textFields = (fullTemplate?.mergeFields || []).filter((field: string) => !/^qr_[a-z_]+$/.test(field));
  const qrFieldConfigs = useMemo(() => qrFields
    .filter((field: string) => qrConfig[field]?.campaignId)
    .map((field: string) => ({
      placeholderName: field,
      campaignId: qrConfig[field].campaignId,
      contentType: qrConfig[field].contentType,
      campaignType: qrConfig[field].contentType,
      urlTemplate: qrConfig[field].urlTemplate,
      textTemplate: qrConfig[field].textTemplate,
      width: qrConfig[field].width,
      height: qrConfig[field].height,
      alt: qrConfig[field].alt
    })), [qrConfig, qrFields]);
  const hasQrPlaceholders = qrFields.length > 0;
  const hasMissingQrConfig = hasQrPlaceholders && qrFieldConfigs.length === 0;
  const canSend = file && fullTemplate && rows.length > 0 && Object.values(columnMap).every(Boolean);
  const validRecipients = rows.length;
  const favouriteTemplates = templates.filter((template) => template.isFavourite);
  const otherTemplates = templates.filter((template) => !template.isFavourite);
  const selectedCertificate = certificateTemplates.find((template) => template.id === certificateTemplateId);
  const certificateConfig = attachCertificate && certificateTemplateId ? {
    templateId: certificateTemplateId,
    fieldMappings: certificateFieldMappings,
    fallbackValues: certificateFallbacks
  } : null;

  useEffect(() => {
    if (!selectedCertificate) return;
    const mappings = Object.fromEntries(selectedCertificate.fields.map((field) => {
      const match = columns.find((column) => column.toLowerCase() === field.placeholder.toLowerCase() || column.toLowerCase() === field.label.toLowerCase());
      return [field.placeholder, certificateFieldMappings[field.placeholder] || match || ""];
    }));
    setCertificateFieldMappings(mappings);
    setCertificateFallbacks(Object.fromEntries(selectedCertificate.fields.map((field) => [field.placeholder, certificateFallbacks[field.placeholder] || field.defaultValue || ""])));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificateTemplateId, columns]);

  useEffect(() => {
    if (step !== 4 || !fullTemplate) return;
    setPreviewLoading(true);
    const timer = setTimeout(() => setPreviewLoading(false), 200);
    return () => clearTimeout(timer);
  }, [previewHtml, step, fullTemplate]);

  async function sendBulk(sendAnyway = false) {
    if (!canSend || !file || !fullTemplate) return toast.error("Complete all steps before sending");
    if (hasMissingQrConfig && !sendAnyway) {
      setQrWarningOpen(true);
      return;
    }
    setSending(true);
    setQrWarningOpen(false);
    setLogs([]);
    const controller = new AbortController();
    abortRef.current = controller;
    const form = new FormData();
    form.set("csv", file);
    form.set("templateId", fullTemplate._id);
    form.set("columnMap", JSON.stringify(columnMap));
    form.set("qrConfig", JSON.stringify(qrConfig));
    form.set("qrFieldConfigs", JSON.stringify(qrFieldConfigs));
    if (certificateConfig) form.set("certificateConfig", JSON.stringify(certificateConfig));
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

  async function previewCertificate() {
    if (!selectedCertificate) return;
    const row = rows[certPreviewRow] || {};
    const mergeData = Object.fromEntries(selectedCertificate.fields.map((field) => {
      const column = certificateFieldMappings[field.placeholder];
      return [field.placeholder, row[column] || certificateFallbacks[field.placeholder] || field.defaultValue || ""];
    }));
    const data = await apiFetch<{ pdfBase64: string }>(`/api/certificates/${selectedCertificate.id}/preview`, {
      method: "POST",
      body: JSON.stringify({ mergeData })
    });
    setCertPreviewPdf(data.pdfBase64);
    setCertPreviewOpen(true);
  }

  const stats = useMemo(() => {
    let sent = 0;
    let failed = 0;
    let certs = 0;
    let failedCerts = 0;
    let failedQrs = 0;
    const failureDetails: Array<{ email: string; reason: string; type: string }> = [];

    logs.forEach((log) => {
      if (log.type === "sent") {
        sent++;
      } else if (log.type === "failed") {
        failed++;
        failureDetails.push({
          email: log.email || "Unknown Recipient",
          reason: log.error || "Unknown SMTP delivery failure",
          type: "Email Delivery"
        });
      } else if (log.type === "certificate_error") {
        failedCerts++;
        failureDetails.push({
          email: log.recipient || "Unknown Recipient",
          reason: log.error || "Certificate PDF generation error",
          type: "Certificate Attachment"
        });
      } else if (log.type === "qr_error") {
        failedQrs++;
        failureDetails.push({
          email: log.recipient || "Unknown Recipient",
          reason: `${log.placeholder || "QR"}: ${log.error || "QR generation error"}`,
          type: "QR Code Embedding"
        });
      }
    });

    const latestProgressLog = logs.find((l) => l.type === "sent" || l.type === "failed");
    if (latestProgressLog) {
      certs = latestProgressLog.certificateCount || 0;
    }

    return {
      sent,
      failed,
      certs,
      failedCerts,
      failedQrs,
      failureDetails
    };
  }, [logs]);

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
            {parsingCsv && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Parsing CSV...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Select Template</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {templatesLoading ? (
              <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-3 md:col-span-2 xl:col-span-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-28 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              [...favouriteTemplates, ...otherTemplates].map((template) => (
                <button key={template._id} type="button" onClick={() => setTemplateId(template._id)} className={`overflow-hidden rounded-lg border bg-card text-left transition-colors hover:bg-accent ${templateId === template._id ? "border-ring" : ""}`}>
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
              ))
            )}
            {templateId && <div className="space-y-4 rounded-lg border p-4 md:col-span-2 xl:col-span-3">
              <Label className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Award className="h-4 w-4" />Attach Certificate PDF</span><input type="checkbox" checked={attachCertificate} onChange={(event) => setAttachCertificate(event.target.checked)} /></Label>
              {attachCertificate && <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <Label>Select certificate template<select className="mt-2 w-full rounded-md border bg-background p-2" value={certificateTemplateId} onChange={(event) => setCertificateTemplateId(event.target.value)}><option value="">Choose certificate</option>{certificateTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></Label>
                {selectedCertificate && <div className="grid place-items-center rounded-md border bg-muted p-3">{selectedCertificate.previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`data:image/png;base64,${selectedCertificate.previewImage}`} alt="" className="max-h-32" />
                ) : <Award className="h-10 w-10 text-muted-foreground" />}</div>}
                {selectedCertificate && <p className="text-sm text-muted-foreground md:col-span-2">Each recipient will receive a personalized PDF attachment. {selectedCertificate.fields.length} fields need CSV column mapping in Step 3.</p>}
              </div>}
              <Button onClick={() => setStep(3)}>Continue to Mapping</Button>
            </div>}
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
            {selectedCertificate && <div className="space-y-4 rounded-md border p-4">
              <h3 className="flex items-center gap-2 font-medium"><Award className="h-4 w-4" />Certificate Fields</h3>
              <p className="text-sm text-muted-foreground">Map CSV columns to certificate placeholder text.</p>
              {selectedCertificate.fields.map((field) => (
                <div key={field.placeholder} className="grid gap-3 rounded-md border bg-card p-3 md:grid-cols-[1fr_1fr]">
                  <div><div className="font-medium">Placeholder: {field.placeholder}</div><div className="text-sm text-muted-foreground">Label: {field.label}</div></div>
                  <Label>CSV Column<select className="mt-2 w-full rounded-md border bg-background p-2" value={certificateFieldMappings[field.placeholder] || ""} onChange={(event) => setCertificateFieldMappings((current) => ({ ...current, [field.placeholder]: event.target.value }))}><option value="">Choose CSV column</option>{columns.map((column) => <option key={column} value={column}>{column}</option>)}</select></Label>
                  <Label className="md:col-span-2">Fallback<Input value={certificateFallbacks[field.placeholder] || ""} onChange={(event) => setCertificateFallbacks((current) => ({ ...current, [field.placeholder]: event.target.value }))} /></Label>
                </div>
              ))}
              <div className="flex flex-col gap-3 md:flex-row md:items-end"><Label>Preview recipient<select className="mt-2 w-full rounded-md border bg-background p-2" value={certPreviewRow} onChange={(event) => setCertPreviewRow(Number(event.target.value))}>{rows.slice(0, 100).map((row, index) => <option key={index} value={index}>{row.email || `Row ${index + 1}`}</option>)}</select></Label><Button variant="outline" onClick={previewCertificate}>Preview Certificate</Button></div>
            </div>}
            <Button onClick={() => setStep(4)}>Continue to Preview</Button>
          </CardContent>
        </Card>
      )}

      {step === 4 && fullTemplate && (
        <div className="space-y-6">
          {/* Top Panel: Live Status & Progress Bar */}
          {(sending || logs.length > 0) && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {sending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span>Sending Campaign in Progress...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-sent" />
                          <span>Campaign Execution Finished</span>
                        </>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Real-time stats and status of the current bulk dispatch job.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {sending && (
                      <Button variant="destructive" size="sm" onClick={stopSending}>
                        <Square className="mr-1 h-3.5 w-3.5" />
                        Stop Campaign
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Successful</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-foreground">{stats.sent}</span>
                      <span className="text-xs text-muted-foreground">emails</span>
                    </div>
                  </div>

                  <div className={`rounded-lg border p-4 ${stats.failed > 0 ? "border-destructive/20 bg-destructive/5" : "bg-muted/40"}`}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Failed</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className={`text-3xl font-extrabold ${stats.failed > 0 ? "text-destructive" : "text-foreground"}`}>{stats.failed}</span>
                      <span className="text-xs text-muted-foreground">emails</span>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/40 p-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Certificates</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-foreground">{stats.certs}</span>
                      <span className="text-xs text-muted-foreground">attached</span>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-muted/40 p-4">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Completion Rate</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-foreground">
                        {validRecipients > 0
                          ? `${Math.round(((stats.sent + stats.failed) / validRecipients) * 100)}%`
                          : "0%"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({stats.sent + stats.failed} / {validRecipients})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{
                        width: `${validRecipients > 0 ? ((stats.sent + stats.failed) / validRecipients) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
            {/* Left Column: Preview */}
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Template & Merge Preview</CardTitle>
                  <CardDescription>
                    {replaceTemplateValues(fullTemplate.subjectLine || fullTemplate.subject || "", mappedSample)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {previewLoading ? (
                    <div className="flex h-[500px] items-center justify-center rounded-md border bg-muted">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <iframe title="Bulk preview" sandbox="" srcDoc={previewHtml} className="h-[500px] w-full rounded-md border bg-background" />
                  )}
                </CardContent>
              </Card>

              {/* Detailed Failure Report Panel */}
              {stats.failureDetails.length > 0 && (
                <Card className="border-destructive/30 bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 animate-pulse" />
                      Detailed Failure Breakdown ({stats.failureDetails.length})
                    </CardTitle>
                    <CardDescription>
                      Check the exact reason why these emails failed to deliver or why assets could not generate.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-80 overflow-y-auto rounded-md border border-destructive/20 bg-background divide-y divide-border">
                      {stats.failureDetails.map((failure, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-3 text-sm hover:bg-muted/10 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground">{failure.email}</span>
                              <Badge variant="failed" className="text-[10px] px-1.5 py-0 uppercase">
                                {failure.type}
                              </Badge>
                            </div>
                            <p className="text-xs font-mono text-destructive bg-destructive/5 border border-destructive/10 rounded px-2 py-1 leading-relaxed break-all">
                              {failure.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Controls and Live Progress */}
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Send Controls</CardTitle>
                  <CardDescription>Configure delay and trigger the bulk run.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCertificate && (
                    <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1.5">
                      <div className="font-medium flex items-center gap-1"><Award className="h-3.5 w-3.5" />Certificate Enabled:</div>
                      <div className="text-muted-foreground truncate">{selectedCertificate.name}</div>
                      <div className="text-[10px] text-muted-foreground border-t pt-1.5 mt-1.5">
                        1 personalized PDF will be generated and attached to each recipient.
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="delay">Delay between emails (ms)</Label>
                    <Input
                      id="delay"
                      type="number"
                      min={0}
                      value={delayMs}
                      disabled={sending}
                      onChange={(event) => setDelayMs(Number(event.target.value))}
                    />
                    <p className="text-[10px] text-muted-foreground">Adding a delay helps avoid hitting rate limits or spam filters.</p>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1" disabled={!canSend || sending} onClick={() => sendBulk()}>
                      {sending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Start Sending ({validRecipients})
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Console log display */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Live Dispatch Logs</CardTitle>
                    <CardDescription className="text-[11px]">Real-time events</CardDescription>
                  </div>
                  {logs.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => setLogs([])}>
                      Clear Logs
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="max-h-[360px] min-h-[160px] overflow-y-auto rounded-md border bg-zinc-950 p-3 font-mono text-[11px] text-zinc-200 shadow-inner divide-y divide-zinc-900">
                    {logs.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-zinc-500 py-10">
                        Console is empty. Start the run to see live feedback.
                      </div>
                    ) : (
                      logs.map((log, index) => {
                        const isFailed = log.type === "failed" || log.type === "certificate_error" || log.type === "qr_error";
                        return (
                          <div key={index} className="py-2 first:pt-0 last:pb-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-zinc-300 font-semibold">{log.email || log.recipient || "System Log"}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                                isFailed 
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                  : log.type === "sent" 
                                    ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}>
                                {log.type}
                              </span>
                            </div>
                            {log.error && (
                              <div className="text-red-400 whitespace-pre-wrap pl-1 border-l-2 border-red-500/50 mt-1 leading-normal font-sans">
                                Reason: {log.error}
                              </div>
                            )}
                            {log.total && <div className="text-zinc-500">Initiated total recipients: {log.total}</div>}
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>CSV Preview</CardTitle></CardHeader>
        <CardContent>
          {parsingCsv ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Parsing CSV...</p>
            </div>
          ) : (
            <Table><TableHeader><TableRow>{columns.map((key) => <TableHead key={key}>{key}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.slice(0, 8).map((row, index) => <TableRow key={index}>{columns.map((column) => <TableCell key={column}>{row[column]}</TableCell>)}</TableRow>)}</TableBody></Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={qrWarningOpen} onOpenChange={setQrWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />QR campaign missing</DialogTitle>
            <DialogDescription>
              Your template has QR placeholders but no QR campaign is configured. Go back to Step 3 to configure QR codes or they will appear as broken images.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setQrWarningOpen(false); setStep(3); }}>Go Back</Button>
            <Button variant="destructive" onClick={() => sendBulk(true)}>Send Anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={certPreviewOpen} onOpenChange={setCertPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Certificate Preview</DialogTitle></DialogHeader>
          {certPreviewPdf && <iframe title="Certificate preview" className="h-[720px] w-full rounded-md border" src={`data:application/pdf;base64,${certPreviewPdf}`} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
