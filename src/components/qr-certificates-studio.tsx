"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Award,
  Copy,
  FileText,
  Pencil,
  Plus,
  QrCode,
  Search,
  Trash2,
  Upload
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/client-api";

// ---------------------------------------------------------------------------
// QR Code Types & Constants
// ---------------------------------------------------------------------------
type QrCampaign = {
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

const defaultQrFields = ["NAME", "EVENT", "DATE", "TYPE", "SEAT", "TIER", "EMAIL"];

// ---------------------------------------------------------------------------
// Certificate Types & Helpers
// ---------------------------------------------------------------------------
type CertField = {
  id: string;
  placeholder: string;
  label: string;
  defaultValue: string;
  fontSize: number;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  alignment: "left" | "center" | "right";
};

type CertTemplate = {
  id: string;
  name: string;
  description?: string | null;
  pdfFileName: string;
  pdfSizeBytes: number;
  pageCount: number;
  fields: CertField[];
  previewImage?: string | null;
  isActive: boolean;
  updatedAt: string;
};

const emptyField = (): CertField => ({
  id: crypto.randomUUID(),
  placeholder: "",
  label: "",
  defaultValue: "",
  fontSize: 24,
  color: "#000000",
  isBold: false,
  isItalic: false,
  alignment: "center"
});

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

interface QrCertificatesStudioProps {
  defaultTab?: "qr" | "certificates";
}

export function QrCertificatesStudio({ defaultTab = "qr" }: QrCertificatesStudioProps) {
  const [activeTab, setActiveTab] = useState<"qr" | "certificates">(defaultTab);

  // QR State
  const [campaigns, setCampaigns] = useState<QrCampaign[]>([]);
  const [now, setNow] = useState(0);
  const [qrQuery, setQrQuery] = useState("");
  const [qrFilter, setQrFilter] = useState<"all" | "active" | "expired">("all");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrForm, setQrForm] = useState({
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

  // Certificates State
  const [templates, setTemplates] = useState<CertTemplate[]>([]);
  const [certQuery, setCertQuery] = useState("");
  const [certFilter, setCertFilter] = useState("all");
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<CertTemplate | null>(null);
  const [sampleData, setSampleData] = useState<Record<string, string>>({});
  const [previewPdf, setPreviewPdf] = useState("");

  // Sync tab from URL search params if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "qr" || tabParam === "certificates") {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const handleTabChange = (val: string) => {
    const nextTab = val as "qr" | "certificates";
    setActiveTab(nextTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", nextTab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Load Data
  async function loadQr() {
    try {
      const data = await apiFetch<{ campaigns: QrCampaign[] }>("/api/qr/campaigns");
      setCampaigns(data.campaigns);
    } catch (err: any) {
      toast.error(err.message || "Failed to load QR campaigns");
    }
  }

  async function loadCertificates() {
    try {
      const data = await apiFetch<{ templates: CertTemplate[] }>("/api/certificates");
      setTemplates(data.templates);
    } catch (err: any) {
      toast.error(err.message || "Failed to load certificate templates");
    }
  }

  useEffect(() => {
    setNow(Date.now());
    loadQr();
    loadCertificates();
  }, []);

  // Filtered QR
  const visibleCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const expired = campaign.expiresAt ? new Date(campaign.expiresAt).getTime() < now : false;
      if (qrFilter === "active" && (expired || !campaign.isActive)) return false;
      if (qrFilter === "expired" && !expired) return false;
      return campaign.name.toLowerCase().includes(qrQuery.toLowerCase());
    });
  }, [campaigns, qrFilter, now, qrQuery]);

  // Filtered Certificates
  const visibleCertificates = useMemo(() => {
    return templates.filter((template) => {
      if (certFilter === "active" && !template.isActive) return false;
      return template.name.toLowerCase().includes(certQuery.toLowerCase());
    });
  }, [templates, certFilter, certQuery]);

  // QR Actions
  async function createQrCampaign() {
    try {
      const data = await apiFetch<{ campaign: QrCampaign }>("/api/qr/campaigns", {
        method: "POST",
        body: JSON.stringify({ ...qrForm, expiresAt: qrForm.expiresAt || null })
      });
      toast.success("QR campaign created");
      setQrDialogOpen(false);
      setCampaigns((current) => [data.campaign, ...current]);
    } catch (err: any) {
      toast.error(err.message || "Failed to create QR campaign");
    }
  }

  async function deleteQrCampaign(id: string) {
    if (!confirm("Delete this QR campaign and all related codes/scans?")) return;
    try {
      await apiFetch(`/api/qr/campaigns/${id}`, { method: "DELETE" });
      setCampaigns((current) => current.filter((campaign) => campaign.id !== id));
      toast.success("QR campaign deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete QR campaign");
    }
  }

  // Certificate Actions
  async function uploadPdf(file: File | null) {
    if (!file) return;
    const bytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (String.fromCharCode(...bytes) !== "%PDF-") return toast.error("Choose a valid PDF file");
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    try {
      const data = await fetch("/api/certificates/upload", { method: "POST", body: form }).then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Upload failed");
        return payload;
      });
      setDraft(data.template);
      setSampleData(Object.fromEntries((data.template.fields || []).map((field: CertField) => [field.placeholder, field.label])));
      setUploadStep(2);
      await loadCertificates();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function saveDraft(nextStep?: number) {
    if (!draft) return;
    const saved = await apiFetch<{ template: CertTemplate }>(`/api/certificates/${draft.id}`, {
      method: "PUT",
      body: JSON.stringify({ name: draft.name, description: draft.description, fields: draft.fields })
    });
    setDraft(saved.template);
    await loadCertificates();
    if (nextStep) setUploadStep(nextStep);
  }

  async function generatePreview() {
    if (!draft) return;
    await saveDraft();
    const data = await apiFetch<{ pdfBase64: string }>(`/api/certificates/${draft.id}/preview`, {
      method: "POST",
      body: JSON.stringify({ mergeData: sampleData })
    });
    setPreviewPdf(data.pdfBase64);
    setUploadStep(3);
  }

  async function deleteCertTemplate(template: CertTemplate) {
    if (!confirm(`Delete ${template.name}?`)) return;
    try {
      await apiFetch(`/api/certificates/${template.id}`, { method: "DELETE" });
      toast.success("Certificate template deleted");
      await loadCertificates();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete certificate template");
    }
  }

  function updateField(index: number, patch: Partial<CertField>) {
    if (!draft) return;
    const fields = [...draft.fields];
    fields[index] = { ...fields[index], ...patch };
    setDraft({ ...draft, fields });
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        {/* Unified Studio Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              QR & Certificates Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Design dynamic QR passes, attendee check-in tickets, and personalized PDF certificate templates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <TabsList className="bg-muted/70 p-1 rounded-lg">
              <TabsTrigger value="qr" className="gap-2 text-xs">
                <QrCode className="h-3.5 w-3.5" />
                <span>Dynamic QR</span>
                {campaigns.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                    {campaigns.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="certificates" className="gap-2 text-xs">
                <Award className="h-3.5 w-3.5" />
                <span>PDF Certificates</span>
                {templates.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                    {templates.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Quick Action Buttons for Current Tab */}
            {activeTab === "qr" ? (
              <Button size="sm" onClick={() => setQrDialogOpen(true)} className="gap-1.5 text-xs h-9">
                <Plus className="h-3.5 w-3.5" />
                New QR Campaign
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setCertDialogOpen(true);
                  setUploadStep(1);
                  setDraft(null);
                  setPreviewPdf("");
                }}
                className="gap-1.5 text-xs h-9"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Certificate
              </Button>
            )}
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: DYNAMIC QR CODES                                              */}
        {/* ===================================================================== */}
        <TabsContent value="qr" className="space-y-5 focus-visible:outline-none">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 text-xs"
                placeholder="Search QR campaigns by name..."
                value={qrQuery}
                onChange={(e) => setQrQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              {(["all", "active", "expired"] as const).map((item) => (
                <Button
                  key={item}
                  variant={qrFilter === item ? "secondary" : "outline"}
                  size="sm"
                  className="text-xs h-9 capitalize"
                  onClick={() => setQrFilter(item)}
                >
                  {item}
                </Button>
              ))}
            </div>
          </div>

          {visibleCampaigns.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-14 text-center flex flex-col items-center justify-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border shadow-xs">
                <QrCode className="h-8 w-8 text-primary/80" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-foreground">
                  {qrQuery ? "No matching QR campaigns" : "No QR campaigns found"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {qrQuery
                    ? "Try searching for a different campaign name."
                    : "Create branded QR passes for attendee check-in, tracking links, or dynamic ticket issuance."}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setQrDialogOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs mt-1"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Create QR Campaign
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleCampaigns.map((campaign) => (
                <Card key={campaign.id} className="overflow-hidden hover:border-border/80 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-start justify-between gap-2 text-base">
                      <span className="truncate">{campaign.name}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {campaign.type}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="line-clamp-2 min-h-10 text-xs text-muted-foreground">
                      {campaign.description || "No description provided"}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-y py-2.5">
                      <span><strong>{campaign._count?.qrCodes || 0}</strong> QR codes</span>
                      <span><strong>{campaign._count?.scanLogs || 0}</strong> scans</span>
                      <span>Mode: <strong>{campaign.scanMode === "once" ? "One-time" : "Unlimited"}</strong></span>
                      <span>{campaign.expiresAt ? new Date(campaign.expiresAt).toLocaleDateString() : "No expiry"}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button asChild size="sm" className="flex-1 text-xs h-8">
                        <Link href={`/qr/${campaign.id}`}>View Campaign</Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => deleteQrCampaign(campaign.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===================================================================== */}
        {/* TAB 2: PDF CERTIFICATES                                              */}
        {/* ===================================================================== */}
        <TabsContent value="certificates" className="space-y-5 focus-visible:outline-none">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 text-xs"
                placeholder="Search certificate templates by name..."
                value={certQuery}
                onChange={(event) => setCertQuery(event.target.value)}
              />
            </div>
            <select
              className="rounded-md border bg-background px-3 py-2 text-xs"
              value={certFilter}
              onChange={(event) => setCertFilter(event.target.value)}
            >
              <option value="all">All Certificates</option>
              <option value="active">Active Only</option>
            </select>
          </div>

          {visibleCertificates.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-14 text-center flex flex-col items-center justify-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border shadow-xs">
                <Award className="h-8 w-8 text-primary/80" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-foreground">
                  {certQuery ? "No matching certificate templates" : "No certificate templates yet"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {certQuery
                    ? "Try searching for a different template name."
                    : "Upload your certificate PDF, place dynamic text merge fields, and attach personalized certificates to bulk sends."}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setCertDialogOpen(true);
                  setUploadStep(1);
                  setDraft(null);
                  setPreviewPdf("");
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs mt-1"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Upload Certificate PDF
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleCertificates.map((template) => (
                <Card key={template.id} className="overflow-hidden hover:border-border/80 transition-colors">
                  <div className="grid aspect-[16/10] place-items-center bg-muted/60 relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {template.previewImage ? (
                      <img
                        src={`data:image/png;base64,${template.previewImage}`}
                        alt={template.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FileText className="h-12 w-12 text-muted-foreground/60" />
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-1 text-base">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      {template.pdfFileName} · {formatBytes(template.pdfSizeBytes)}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {template.pageCount} {template.pageCount === 1 ? "page" : "pages"}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {template.fields.length} merge fields
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Updated {new Date(template.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <Button asChild variant="outline" size="sm" className="text-xs h-8">
                        <Link href={`/certificates/${template.id}/edit`}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Edit Canvas
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm" className="text-xs h-8">
                        <Link href={`/certificates/${template.id}/edit`}>Preview</Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 text-destructive hover:bg-destructive/10"
                        onClick={() => deleteCertTemplate(template)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ===================================================================== */}
      {/* DIALOG 1: CREATE QR CAMPAIGN MODAL                                    */}
      {/* ===================================================================== */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create QR Campaign</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 md:grid-cols-[1fr_260px]">
            <div className="grid gap-3">
              <Label className="text-xs">
                Name
                <Input
                  className="text-xs mt-1"
                  value={qrForm.name}
                  onChange={(e) => setQrForm({ ...qrForm, name: e.target.value })}
                />
              </Label>
              <Label className="text-xs">
                Description
                <Textarea
                  className="text-xs mt-1"
                  value={qrForm.description}
                  onChange={(e) => setQrForm({ ...qrForm, description: e.target.value })}
                />
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Label className="text-xs">
                  Type
                  <select
                    className="mt-1 w-full rounded-md border bg-background p-2 text-xs"
                    value={qrForm.type}
                    onChange={(e) => setQrForm({ ...qrForm, type: e.target.value })}
                  >
                    <option value="checkin">Check-in</option>
                    <option value="url">URL</option>
                    <option value="text">Text</option>
                  </select>
                </Label>
                <Label className="text-xs">
                  Scan Mode
                  <select
                    className="mt-1 w-full rounded-md border bg-background p-2 text-xs"
                    value={qrForm.scanMode}
                    onChange={(e) => setQrForm({ ...qrForm, scanMode: e.target.value })}
                  >
                    <option value="once">One-time</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </Label>
              </div>
              <Label className="text-xs">
                Expiry Date
                <Input
                  className="text-xs mt-1"
                  type="datetime-local"
                  value={qrForm.expiresAt}
                  onChange={(e) => setQrForm({ ...qrForm, expiresAt: e.target.value })}
                />
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Label className="text-xs">
                  Foreground Color
                  <Input
                    className="mt-1 h-9 p-1"
                    type="color"
                    value={qrForm.brandColor}
                    onChange={(e) => setQrForm({ ...qrForm, brandColor: e.target.value })}
                  />
                </Label>
                <Label className="text-xs">
                  Background Color
                  <Input
                    className="mt-1 h-9 p-1"
                    type="color"
                    value={qrForm.bgColor}
                    onChange={(e) => setQrForm({ ...qrForm, bgColor: e.target.value })}
                  />
                </Label>
              </div>
              <Label className="text-xs">
                Logo URL
                <Input
                  className="text-xs mt-1"
                  placeholder="https://..."
                  value={qrForm.logoUrl}
                  onChange={(e) => setQrForm({ ...qrForm, logoUrl: e.target.value })}
                />
              </Label>
              {qrForm.type === "checkin" && (
                <div className="grid gap-2">
                  <span className="text-xs font-medium">Scanner Display Fields</span>
                  <div className="flex flex-wrap gap-1.5">
                    {defaultQrFields.map((field) => (
                      <Button
                        key={field}
                        type="button"
                        size="sm"
                        variant={qrForm.displayFields.includes(field) ? "secondary" : "outline"}
                        className="text-[11px] h-7 px-2"
                        onClick={() =>
                          setQrForm((current) => ({
                            ...current,
                            displayFields: current.displayFields.includes(field)
                              ? current.displayFields.filter((item) => item !== field)
                              : [...current.displayFields, field]
                          }))
                        }
                      >
                        {field}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={createQrCampaign} disabled={!qrForm.name} className="mt-2 text-xs">
                Create Campaign
              </Button>
            </div>
            <div className="grid place-items-center rounded-md border bg-muted/30 p-4">
              <QRCodeSVG
                value="QR_V1|ID:PREVIEW|NAME:Preview"
                size={200}
                fgColor={qrForm.brandColor}
                bgColor={qrForm.bgColor}
                level="H"
              />
              <span className="text-[11px] text-muted-foreground mt-3">Live Pass Preview</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* DIALOG 2: UPLOAD CERTIFICATE MODAL                                    */}
      {/* ===================================================================== */}
      <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Upload Certificate Template</DialogTitle>
          </DialogHeader>

          {uploadStep === 1 && (
            <div className="space-y-4">
              <Label
                htmlFor="cert-pdf"
                className="grid min-h-48 cursor-pointer place-items-center rounded-md border border-dashed border-border bg-accent/20 p-6 text-center hover:bg-accent/30 transition-colors"
              >
                <div>
                  <Upload className="mx-auto mb-3 h-7 w-7 text-primary" />
                  <div className="text-sm font-semibold text-foreground">
                    {uploading ? "Analyzing PDF..." : "Choose certificate PDF"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">PDF format only, maximum 10MB</p>
                </div>
              </Label>
              <Input
                id="cert-pdf"
                className="hidden"
                type="file"
                accept="application/pdf,.pdf"
                disabled={uploading}
                onChange={(event) => uploadPdf(event.target.files?.[0] || null)}
              />
            </div>
          )}

          {uploadStep === 2 && draft && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Label className="text-xs">
                  Template Name
                  <Input
                    className="text-xs mt-1"
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                </Label>
                <Label className="text-xs">
                  Description
                  <Textarea
                    className="text-xs mt-1"
                    value={draft.description || ""}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  />
                </Label>
              </div>

              <div className="rounded-md border p-3 text-xs bg-muted/40">
                Pages: <strong>{draft.pageCount}</strong> · Size: <strong>{formatBytes(draft.pdfSizeBytes)}</strong>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-semibold">
                  {draft.fields.length
                    ? `Found ${draft.fields.length} placeholders in your PDF`
                    : "No placeholders auto-detected"}
                </div>
                {draft.fields.map((field, index) => (
                  <FieldEditor
                    key={field.id}
                    field={field}
                    onChange={(patch) => updateField(index, patch)}
                    onDelete={() =>
                      setDraft({
                        ...draft,
                        fields: draft.fields.filter((_, i) => i !== index)
                      })
                    }
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setDraft({ ...draft, fields: [...draft.fields, emptyField()] })}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Another Field
                </Button>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => saveDraft(3)}>
                  Save Template
                </Button>
                <Button size="sm" onClick={generatePreview}>
                  Preview Output
                </Button>
              </DialogFooter>
            </div>
          )}

          {uploadStep === 3 && draft && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {draft.fields.map((field) => (
                  <Label key={field.id} className="text-xs">
                    {field.label || field.placeholder}
                    <Input
                      className="text-xs mt-1"
                      value={sampleData[field.placeholder] || ""}
                      onChange={(event) =>
                        setSampleData({ ...sampleData, [field.placeholder]: event.target.value })
                      }
                    />
                  </Label>
                ))}
              </div>
              <Button size="sm" onClick={generatePreview} className="text-xs">
                Re-generate Preview
              </Button>
              {previewPdf && (
                <iframe
                  title="Certificate preview"
                  className="h-[500px] w-full rounded-md border"
                  src={`data:application/pdf;base64,${previewPdf}`}
                />
              )}
              <DialogFooter>
                <Button
                  size="sm"
                  onClick={() => {
                    setCertDialogOpen(false);
                    toast.success("Certificate template saved");
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldEditor({
  field,
  onChange,
  onDelete
}: {
  field: CertField;
  onChange: (patch: Partial<CertField>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border p-3 bg-card text-xs">
      <div className="grid gap-3 md:grid-cols-2">
        <Label className="text-xs">
          Placeholder
          <Input
            className="text-xs mt-1"
            value={field.placeholder}
            onChange={(event) => onChange({ placeholder: event.target.value })}
          />
        </Label>
        <Label className="text-xs">
          Label
          <Input
            className="text-xs mt-1"
            value={field.label}
            onChange={(event) => onChange({ label: event.target.value })}
          />
        </Label>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Label className="text-xs">
          Fallback
          <Input
            className="text-xs mt-1"
            value={field.defaultValue}
            onChange={(event) => onChange({ defaultValue: event.target.value })}
          />
        </Label>
        <Label className="text-xs">
          Font Size
          <Input
            className="text-xs mt-1"
            type="number"
            value={field.fontSize}
            onChange={(event) => onChange({ fontSize: Number(event.target.value) })}
          />
        </Label>
        <Label className="text-xs">
          Color
          <Input
            className="mt-1 h-8 p-1"
            type="color"
            value={field.color}
            onChange={(event) => onChange({ color: event.target.value })}
          />
        </Label>
        <Label className="text-xs">
          Alignment
          <select
            className="mt-1 w-full rounded-md border bg-background p-1.5 text-xs"
            value={field.alignment}
            onChange={(event) => onChange({ alignment: event.target.value as CertField["alignment"] })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </Label>
      </div>
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-4">
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={field.isBold}
              onChange={(event) => onChange({ isBold: event.target.checked })}
              className="rounded"
            />
            Bold
          </Label>
          <Label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={field.isItalic}
              onChange={(event) => onChange({ isItalic: event.target.checked })}
              className="rounded"
            />
            Italic
          </Label>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive/10" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Remove Field
        </Button>
      </div>
    </div>
  );
}
