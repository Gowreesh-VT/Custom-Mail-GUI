"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  pdfBase64: string;
  pdfFileName: string;
  pageCount: number;
  fields: CertField[];
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

export default function CertificateEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [template, setTemplate] = useState<CertTemplate | null>(null);
  const [previewPdf, setPreviewPdf] = useState("");
  const [sampleData, setSampleData] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [generations, setGenerations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState("all");

  useEffect(() => {
    apiFetch<{ template: CertTemplate }>(`/api/certificates/${id}`).then(({ template }) => {
      setTemplate(template);
      setPreviewPdf(template.pdfBase64);
      setSampleData(Object.fromEntries(template.fields.map((field) => [field.placeholder, field.label || field.placeholder])));
    }).catch((error) => toast.error(error.message));
  }, [id]);

  useEffect(() => {
    apiFetch<{ generations: any[]; stats: any }>(`/api/certificates/${id}/generations?status=${status}`).then((data) => {
      setGenerations(data.generations);
      setStats(data.stats);
    }).catch(() => {});
  }, [id, status]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const csvRows = useMemo(() => generations.map((generation) => ({
    email: generation.recipientEmail,
    name: generation.recipientName || "",
    status: generation.status,
    date: generation.createdAt
  })), [generations]);

  function patchTemplate(patch: Partial<CertTemplate>) {
    if (!template) return;
    setTemplate({ ...template, ...patch });
    setDirty(true);
  }

  function updateField(index: number, patch: Partial<CertField>) {
    if (!template) return;
    const fields = [...template.fields];
    fields[index] = { ...fields[index], ...patch };
    patchTemplate({ fields });
  }

  async function save() {
    if (!template) return;
    const saved = await apiFetch<{ template: CertTemplate }>(`/api/certificates/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name: template.name, description: template.description, fields: template.fields })
    });
    setTemplate({ ...saved.template, pdfBase64: template.pdfBase64 });
    setDirty(false);
    toast.success("Certificate saved");
  }

  async function preview() {
    await save();
    const data = await apiFetch<{ pdfBase64: string }>(`/api/certificates/${id}/preview`, {
      method: "POST",
      body: JSON.stringify({ mergeData: sampleData })
    });
    setPreviewPdf(data.pdfBase64);
  }

  function exportCsv() {
    const csv = ["Recipient Email,Recipient Name,Status,Date", ...csvRows.map((row) => [row.email, row.name, row.status, row.date].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template?.name || "certificate"}-generations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!template) return <div className="p-6 text-muted-foreground">Loading certificate...</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Button asChild variant="outline"><Link href="/certificates"><ArrowLeft className="h-4 w-4" />Back to Certificates</Link></Button>
        <Button onClick={save}><Save className="h-4 w-4" />Save Changes</Button>
      </div>

      <Tabs defaultValue="edit">
        <TabsList><TabsTrigger value="edit">Edit Fields</TabsTrigger><TabsTrigger value="generations">Generations</TabsTrigger></TabsList>
        <TabsContent value="edit" className="grid gap-5 xl:grid-cols-[40%_1fr]">
          <div className="space-y-4">
            <Card><CardHeader><CardTitle>Template</CardTitle></CardHeader><CardContent className="space-y-3"><Label>Name<Input value={template.name} onChange={(event) => patchTemplate({ name: event.target.value })} /></Label><Label>Description<Textarea value={template.description || ""} onChange={(event) => patchTemplate({ description: event.target.value })} /></Label></CardContent></Card>
            <Card><CardHeader><CardTitle>Fields</CardTitle></CardHeader><CardContent className="space-y-3">{template.fields.map((field, index) => <FieldEditor key={field.id} field={field} onChange={(patch) => updateField(index, patch)} onDelete={() => patchTemplate({ fields: template.fields.filter((_, i) => i !== index) })} />)}<Button variant="outline" onClick={() => patchTemplate({ fields: [...template.fields, emptyField()] })}><Plus className="h-4 w-4" />Add Field</Button></CardContent></Card>
            <Card><CardHeader><CardTitle>Sample Data</CardTitle></CardHeader><CardContent className="space-y-3">{template.fields.map((field) => <Label key={field.id}>{field.label || field.placeholder}<Input value={sampleData[field.placeholder] || ""} onChange={(event) => setSampleData({ ...sampleData, [field.placeholder]: event.target.value })} /></Label>)}<Button onClick={preview}>Preview with Sample Data</Button></CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle>{template.pdfFileName}</CardTitle></CardHeader><CardContent><iframe title="Certificate PDF preview" className="h-[760px] w-full rounded-md border" src={`data:application/pdf;base64,${previewPdf}`} /></CardContent></Card>
        </TabsContent>
        <TabsContent value="generations" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="Total Generated" value={stats?.total || 0} />
            <Stat label="Successful" value={stats?.successful || 0} />
            <Stat label="Failed" value={stats?.failed || 0} />
            <Stat label="Last Generated" value={stats?.lastGenerated ? new Date(stats.lastGenerated).toLocaleDateString() : "Never"} />
          </div>
          <div className="flex gap-2"><select className="rounded-md border bg-background px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All</option><option value="attached">Successful</option><option value="failed">Failed</option></select><Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</Button></div>
          <Card><CardContent className="overflow-auto p-0"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Recipient Email</th><th className="p-3">Recipient Name</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3">Merge Data</th></tr></thead><tbody>{generations.map((generation) => <tr key={generation.id} className="border-b"><td className="p-3">{generation.recipientEmail}</td><td className="p-3">{generation.recipientName}</td><td className="p-3"><Badge variant={generation.status === "failed" ? "failed" : "sent"}>{generation.status}</Badge></td><td className="p-3">{new Date(generation.createdAt).toLocaleString()}</td><td className="p-3"><details><summary>View</summary><pre className="mt-2 max-w-md overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(generation.mergeData, null, 2)}</pre></details></td></tr>)}</tbody></table></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FieldEditor({ field, onChange, onDelete }: { field: CertField; onChange: (patch: Partial<CertField>) => void; onDelete: () => void }) {
  return <div className="grid gap-3 rounded-md border p-3"><div className="grid gap-3 md:grid-cols-2"><Label>Placeholder<Input value={field.placeholder} onChange={(event) => onChange({ placeholder: event.target.value })} /></Label><Label>Label<Input value={field.label} onChange={(event) => onChange({ label: event.target.value })} /></Label></div><div className="grid gap-3 md:grid-cols-4"><Label>Fallback<Input value={field.defaultValue} onChange={(event) => onChange({ defaultValue: event.target.value })} /></Label><Label>Font size<Input type="number" value={field.fontSize} onChange={(event) => onChange({ fontSize: Number(event.target.value) })} /></Label><Label>Color<Input type="color" value={field.color} onChange={(event) => onChange({ color: event.target.value })} /></Label><Label>Alignment<select className="mt-2 w-full rounded-md border bg-background p-2" value={field.alignment} onChange={(event) => onChange({ alignment: event.target.value as CertField["alignment"] })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></Label></div><div className="flex gap-3"><Label className="flex items-center gap-2"><input type="checkbox" checked={field.isBold} onChange={(event) => onChange({ isBold: event.target.checked })} />Bold</Label><Label className="flex items-center gap-2"><input type="checkbox" checked={field.isItalic} onChange={(event) => onChange({ isItalic: event.target.checked })} />Italic</Label><Button variant="destructive" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button></div></div>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <Card><CardContent className="p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-semibold">{value}</div></CardContent></Card>;
}
