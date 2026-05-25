"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Award, Copy, FileText, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/client-api";

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

export default function CertificatesPage() {
  const [templates, setTemplates] = useState<CertTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState<CertTemplate | null>(null);
  const [sampleData, setSampleData] = useState<Record<string, string>>({});
  const [previewPdf, setPreviewPdf] = useState("");

  async function load() {
    const data = await apiFetch<{ templates: CertTemplate[] }>("/api/certificates");
    setTemplates(data.templates);
  }

  useEffect(() => {
    load().catch((error) => toast.error(error.message));
  }, []);

  const visible = useMemo(() => templates.filter((template) => {
    if (filter === "active" && !template.isActive) return false;
    return template.name.toLowerCase().includes(query.toLowerCase());
  }), [filter, query, templates]);

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
      await load();
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
    await load();
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

  async function deleteTemplate(template: CertTemplate) {
    if (!confirm(`Delete ${template.name}?`)) return;
    await apiFetch(`/api/certificates/${template.id}`, { method: "DELETE" });
    toast.success("Certificate template deleted");
    await load();
  }

  function updateField(index: number, patch: Partial<CertField>) {
    if (!draft) return;
    const fields = [...draft.fields];
    fields[index] = { ...fields[index], ...patch };
    setDraft({ ...draft, fields });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Certificates</h1>
          <p className="text-sm text-muted-foreground">Upload certificate PDFs, define merge fields, and attach personalized copies to bulk emails.</p>
        </div>
        <Button onClick={() => { setOpen(true); setUploadStep(1); setDraft(null); setPreviewPdf(""); }}><Upload className="h-4 w-4" />Upload Certificate</Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search by name" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <select className="rounded-md border bg-background px-3 py-2 text-sm" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All</option>
          <option value="active">Active</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <Card><CardContent className="grid place-items-center gap-3 py-16 text-center"><Award className="h-12 w-12 text-muted-foreground" /><div><div className="text-lg font-medium">No certificate templates yet</div><p className="text-sm text-muted-foreground">Upload your first certificate PDF</p></div><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Upload Certificate</Button></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <div className="grid aspect-[16/10] place-items-center bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {template.previewImage ? <img src={`data:image/png;base64,${template.previewImage}`} alt="" className="h-full w-full object-cover" /> : <FileText className="h-12 w-12 text-muted-foreground" />}
              </div>
              <CardHeader><CardTitle className="line-clamp-1">{template.name}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">{template.pdfFileName} · {formatBytes(template.pdfSizeBytes)}</div>
                <div className="flex flex-wrap gap-2"><Badge>{template.pageCount} {template.pageCount === 1 ? "page" : "pages"}</Badge><Badge variant="secondary">{template.fields.length} merge fields</Badge></div>
                <div className="text-xs text-muted-foreground">Updated {new Date(template.updatedAt).toLocaleDateString()}</div>
                <div className="grid grid-cols-4 gap-2">
                  <Button asChild variant="outline" size="sm"><Link href={`/certificates/${template.id}/edit`}>Preview</Link></Button>
                  <Button asChild variant="outline" size="sm"><Link href={`/certificates/${template.id}/edit`}><Pencil className="h-4 w-4" /></Link></Button>
                  <Button variant="outline" size="sm" disabled><Copy className="h-4 w-4" /></Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteTemplate(template)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto">
          <DialogHeader><DialogTitle>Upload Certificate</DialogTitle></DialogHeader>
          {uploadStep === 1 && (
            <div className="space-y-4">
              <Label htmlFor="cert-pdf" className="grid min-h-48 cursor-pointer place-items-center rounded-md border border-dashed bg-accent/20 p-6 text-center">
                <div><Upload className="mx-auto mb-3 h-7 w-7" /><div>{uploading ? "Analysing PDF..." : "Choose certificate PDF"}</div><p className="text-sm text-muted-foreground">PDF only, max 10MB</p></div>
              </Label>
              <Input id="cert-pdf" className="hidden" type="file" accept="application/pdf,.pdf" disabled={uploading} onChange={(event) => uploadPdf(event.target.files?.[0] || null)} />
            </div>
          )}
          {uploadStep === 2 && draft && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2"><Label>Template Name<Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Label><Label>Description<Textarea value={draft.description || ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></Label></div>
              <div className="rounded-md border p-3 text-sm">Pages: {draft.pageCount} | Size: {formatBytes(draft.pdfSizeBytes)}</div>
              <div className="space-y-3">
                <div className="font-medium">{draft.fields.length ? `Found ${draft.fields.length} placeholders in your PDF` : "No placeholders auto-detected"}</div>
                {draft.fields.map((field, index) => <FieldEditor key={field.id} field={field} onChange={(patch) => updateField(index, patch)} onDelete={() => setDraft({ ...draft, fields: draft.fields.filter((_, i) => i !== index) })} />)}
                <Button variant="outline" onClick={() => setDraft({ ...draft, fields: [...draft.fields, emptyField()] })}><Plus className="h-4 w-4" />Add Another Field</Button>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => saveDraft(3)}>Save Template</Button><Button onClick={generatePreview}>Preview</Button></DialogFooter>
            </div>
          )}
          {uploadStep === 3 && draft && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">{draft.fields.map((field) => <Label key={field.id}>{field.label || field.placeholder}<Input value={sampleData[field.placeholder] || ""} onChange={(event) => setSampleData({ ...sampleData, [field.placeholder]: event.target.value })} /></Label>)}</div>
              <Button onClick={generatePreview}>Generate Preview</Button>
              {previewPdf && <iframe title="Certificate preview" className="h-[520px] w-full rounded-md border" src={`data:application/pdf;base64,${previewPdf}`} />}
              <DialogFooter><Button onClick={() => { setOpen(false); toast.success("Certificate template saved"); }}>Save Template</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldEditor({ field, onChange, onDelete }: { field: CertField; onChange: (patch: Partial<CertField>) => void; onDelete: () => void }) {
  return (
    <div className="grid gap-3 rounded-md border p-3">
      <div className="grid gap-3 md:grid-cols-2"><Label>Placeholder<Input value={field.placeholder} onChange={(event) => onChange({ placeholder: event.target.value })} /></Label><Label>Label<Input value={field.label} onChange={(event) => onChange({ label: event.target.value })} /></Label></div>
      <div className="grid gap-3 md:grid-cols-4"><Label>Fallback<Input value={field.defaultValue} onChange={(event) => onChange({ defaultValue: event.target.value })} /></Label><Label>Font size<Input type="number" value={field.fontSize} onChange={(event) => onChange({ fontSize: Number(event.target.value) })} /></Label><Label>Color<Input type="color" value={field.color} onChange={(event) => onChange({ color: event.target.value })} /></Label><Label>Alignment<select className="mt-2 w-full rounded-md border bg-background p-2" value={field.alignment} onChange={(event) => onChange({ alignment: event.target.value as CertField["alignment"] })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></Label></div>
      <div className="flex gap-3"><Label className="flex items-center gap-2"><input type="checkbox" checked={field.isBold} onChange={(event) => onChange({ isBold: event.target.checked })} />Bold</Label><Label className="flex items-center gap-2"><input type="checkbox" checked={field.isItalic} onChange={(event) => onChange({ isItalic: event.target.checked })} />Italic</Label><Button variant="destructive" size="sm" onClick={onDelete}>Delete</Button></div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
