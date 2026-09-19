"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Eye, FileCode, Layers, Loader2, Pencil, Plus, Search, Star, Trash2, Upload } from "lucide-react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/client-api";
import { formatInvalidImagesMessage, validateExternalImageUrls } from "@/lib/template-html";
import { generateTemplateThumbnail, replaceQrPlaceholdersForPreview, replaceTemplateValues, TEMPLATE_THUMBNAIL_PLACEHOLDER, validateHtmlTemplateClient } from "@/lib/template-client";
import { EmailDevicePreview } from "@/components/email-device-preview";

type TemplateListItem = {
  _id: string;
  name: string;
  description?: string;
  subjectLine?: string;
  mergeFields: string[];
  previewImage?: string;
  isFavourite?: boolean;
  createdAt: string;
  updatedAt: string;
};

type DraftTemplate = {
  bodyHtml: string;
  name: string;
  description: string;
  subjectLine: string;
  mergeFields: string[];
  previewImage: string;
};

const emptyDraft: DraftTemplate = { bodyHtml: "", name: "", description: "", subjectLine: "", mergeFields: [], previewImage: "" };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [filter, setFilter] = useState<"all" | "favourites">("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [draft, setDraft] = useState<DraftTemplate>(emptyDraft);
  const [step, setStep] = useState<"source" | "details">("source");
  const [validationError, setValidationError] = useState("");
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({});
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ templates: TemplateListItem[] }>(`/api/templates?q=${encodeURIComponent(search)}&sort=${sort}`);
      setTemplates(data.templates);
    } finally {
      setLoading(false);
    }
  }, [search, sort]);

  const refreshTemplates = useCallback(async () => {
    try {
      const data = await apiFetch<{ templates: TemplateListItem[] }>(`/api/templates?q=${encodeURIComponent(search)}&sort=${sort}`);
      setTemplates(data.templates);
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [search, sort]);

  const { pullDistance, isRefreshing } = usePullToRefresh(refreshTemplates);

  useEffect(() => {
    loadTemplates().catch((error) => toast.error(error.message));
  }, [loadTemplates]);

  async function handleHtmlSource(bodyHtml: string) {
    setValidating(true);
    setValidationError("");
    try {
      const invalidImages = validateExternalImageUrls(bodyHtml);
      if (invalidImages.length) {
        setValidationError(formatInvalidImagesMessage(invalidImages));
        return;
      }
      setGeneratingPreview(true);
      const { mergeFields } = validateHtmlTemplateClient(bodyHtml);
      const previewImage = await generateTemplateThumbnail(bodyHtml);
      setDraft({ ...emptyDraft, bodyHtml, mergeFields, previewImage });
      setStep("details");
      toast.success(`Valid HTML - ${mergeFields.length} merge fields detected`);
    } finally {
      setGeneratingPreview(false);
      setValidating(false);
    }
  }

  async function handleFile(file?: File | null) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".html")) return setValidationError("Only .html files are supported.");
    if (file.size > 2 * 1024 * 1024) return setValidationError("Template file must be 2MB or smaller.");
    await handleHtmlSource(await file.text());
  }

  async function saveTemplate() {
    try {
      if (!draft.name.trim() || !draft.subjectLine.trim()) return toast.error("Template name and subject line are required");
      setSaving(true);
      await apiFetch("/api/templates/upload", {
        method: "POST",
        body: JSON.stringify(draft)
      });
      toast.success("Template saved");
      resetDialogs();
      loadTemplates();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function duplicateTemplate(template: TemplateListItem) {
    const full = await apiFetch<{ template: any }>(`/api/templates/${template._id}`);
    await apiFetch("/api/templates", {
      method: "POST",
      body: JSON.stringify({
        name: `${full.template.name} Copy`,
        description: full.template.description || "",
        subjectLine: full.template.subjectLine || full.template.subject || "",
        bodyHtml: full.template.bodyHtml,
        mergeFields: full.template.mergeFields || [],
        previewImage: full.template.previewImage || TEMPLATE_THUMBNAIL_PLACEHOLDER
      })
    });
    toast.success("Template duplicated");
    loadTemplates();
  }

  async function deleteTemplate(id: string) {
    await apiFetch(`/api/templates?id=${id}`, { method: "DELETE" });
    toast.success("Template deleted");
    loadTemplates();
  }

  async function toggleFavourite(template: TemplateListItem) {
    setTemplates((current) => current.map((item) => item._id === template._id ? { ...item, isFavourite: !item.isFavourite } : item));
    try {
      const data = await apiFetch<{ isFavourite: boolean }>(`/api/templates/${template._id}/favourite`, { method: "POST", body: "{}" });
      setTemplates((current) => current.map((item) => item._id === template._id ? { ...item, isFavourite: data.isFavourite } : item));
    } catch (error: any) {
      toast.error(error.message);
      loadTemplates();
    }
  }

  async function openPreview(template: TemplateListItem) {
    const full = await apiFetch<{ template: any }>(`/api/templates/${template._id}`);
    setPreviewTemplate(full.template);
    setSampleValues({});
  }

  function resetDialogs() {
    setUploadOpen(false);
    setPasteOpen(false);
    setStep("source");
    setDraft(emptyDraft);
    setValidationError("");
  }

  const renderedPreview = useMemo(() => {
    if (!previewTemplate) return "";
    return replaceQrPlaceholdersForPreview(replaceTemplateValues(previewTemplate.bodyHtml, sampleValues));
  }, [previewTemplate, sampleValues]);

  const visibleTemplates = filter === "favourites" ? templates.filter((template) => template.isFavourite) : templates;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Templates</h1>
          <p className="text-sm text-muted-foreground">Upload and manage production HTML email templates.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4" />Upload Template</Button>
          <Button variant="outline" onClick={() => setPasteOpen(true)}><FileCode className="h-4 w-4" />Paste HTML</Button>
        </div>
      </div>

      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex justify-center items-center py-2 text-muted-foreground transition-all duration-150"
          style={{
            height: isRefreshing ? 48 : pullDistance,
            opacity: Math.min(1, (isRefreshing ? 48 : pullDistance) / 48)
          }}
        >
          <Loader2 className={`h-5 w-5 animate-spin ${isRefreshing ? "" : "opacity-70"}`} />
          <span className="text-xs ml-2">{isRefreshing ? "Refreshing..." : "Pull to refresh"}</span>
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search templates" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="az">A-Z</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex rounded-md border p-1">
            <Button variant={filter === "all" ? "secondary" : "ghost"} size="sm" onClick={() => setFilter("all")}>All</Button>
            <Button variant={filter === "favourites" ? "secondary" : "ghost"} size="sm" onClick={() => setFilter("favourites")}><Star className="h-4 w-4" />Favourites</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-16 rounded-md" />
                <Skeleton className="h-7 w-12 rounded-md" />
              </div>
            </div>
          ))
        ) : visibleTemplates.length === 0 ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary border border-border shadow-xs">
              <Layers className="h-8 w-8 text-primary/80" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-sm font-bold text-foreground">No email templates found</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create your first reusable HTML email template or import an existing layout.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={() => setPasteOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> New Template
              </Button>
              <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)} className="border-border text-xs">
                <Upload className="h-3.5 w-3.5 mr-1" /> Upload HTML
              </Button>
            </div>
          </div>
        ) : (
          visibleTemplates.map((template) => (
            <Card key={template._id} className="overflow-hidden">
              <div className="relative aspect-[16/10] border-b bg-muted">
                <Button variant="secondary" size="icon" className="absolute right-2 top-2 z-10" onClick={() => toggleFavourite(template)}><Star className={`h-4 w-4 ${template.isFavourite ? "fill-current text-warning" : ""}`} /></Button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={template.previewImage || TEMPLATE_THUMBNAIL_PLACEHOLDER} alt="" className="h-full w-full object-cover" />
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-1 text-base">{template.name}</CardTitle>
                <p className="text-xs text-muted-foreground">Modified {new Date(template.updatedAt).toLocaleString()}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{template.mergeFields?.length || 0} merge fields</Badge>
                  {template.mergeFields?.some((field) => /^qr_[a-z_]+$/.test(field)) && <Badge>Contains QR codes</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => openPreview(template)}><Eye className="h-4 w-4" />Preview</Button>
                  <Button asChild variant="outline" size="sm"><Link href={`/templates/${template._id}/edit`}><Pencil className="h-4 w-4" />Edit</Link></Button>
                  <Button variant="outline" size="sm" onClick={() => duplicateTemplate(template)}><Copy className="h-4 w-4" />Duplicate</Button>
                  <Button variant="outline" size="sm" onClick={() => deleteTemplate(template._id)}><Trash2 className="h-4 w-4" />Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={(open) => (open ? setUploadOpen(true) : resetDialogs())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Upload Template</DialogTitle>
            <DialogDescription>All images must be hosted externally and referenced via https:// URLs before uploading.</DialogDescription>
          </DialogHeader>
          {step === "source" ? (
            <div className="space-y-4">
              <Label htmlFor="template-file" className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-accent/20 p-6 text-center">
                <Plus className="h-6 w-6" />
                <span className="font-medium">Drop or select an HTML file</span>
                <span className="text-sm text-muted-foreground">.html only, max 2MB</span>
              </Label>
              <Input id="template-file" className="hidden" type="file" accept=".html,text/html" onChange={(event) => handleFile(event.target.files?.[0])} />
              {validating ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Validating template...</p>
                </div>
              ) : (
                <ValidationError message={validationError} />
              )}
            </div>
          ) : (
            <TemplateDetails draft={draft} setDraft={setDraft} onSave={saveTemplate} saving={saving} generatingPreview={generatingPreview} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={pasteOpen} onOpenChange={(open) => (open ? setPasteOpen(true) : resetDialogs())}>
        <DialogContent className="h-[calc(100vh-2rem)] max-w-6xl grid-rows-[auto_1fr]">
          <DialogHeader>
            <DialogTitle>Paste HTML</DialogTitle>
            <DialogDescription>Paste raw HTML, validate external image URLs, then save template details.</DialogDescription>
          </DialogHeader>
          {step === "source" ? <PasteHtmlStep onValidate={handleHtmlSource} validationError={validationError} validating={validating} /> : <TemplateDetails draft={draft} setDraft={setDraft} onSave={saveTemplate} saving={saving} generatingPreview={generatingPreview} />}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewTemplate)} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="h-screen w-screen max-w-none grid-rows-[auto_1fr] overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pr-10">
              <div>
                <DialogTitle>{previewTemplate?.name}</DialogTitle>
                <DialogDescription>{previewTemplate?.subjectLine || previewTemplate?.subject}</DialogDescription>
              </div>
              {previewTemplate && (
                <div className="flex gap-2">
                  <Button variant={device === "desktop" ? "secondary" : "outline"} size="sm" onClick={() => setDevice("desktop")}>Desktop</Button>
                  <Button variant={device === "mobile" ? "secondary" : "outline"} size="sm" onClick={() => setDevice("mobile")}>Mobile</Button>
                  <Button size="sm" onClick={async () => {
                    try {
                      setTestSending(true);
                      await apiFetch(`/api/templates/${previewTemplate._id}/test`, { method: "POST", body: "{}" });
                      toast.success("Test email sent");
                    } catch (e: any) {
                      toast.error(e.message);
                    } finally {
                      setTestSending(false);
                    }
                  }} disabled={testSending}>
                    {testSending ? (<><Loader2 className="h-4 w-4 animate-spin" />Sending test...</>) : "Send Test Email"}
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {previewTemplate && (
            <Tabs defaultValue="preview" className="grid min-h-0 grid-rows-[auto_1fr] px-6 pb-6">
              <div className="flex items-center justify-between gap-2 py-4">
                <TabsList><TabsTrigger value="preview">Rendered Preview</TabsTrigger><TabsTrigger value="fields">Merge Fields</TabsTrigger></TabsList>
              </div>
              <TabsContent value="preview" className="min-h-0 overflow-auto p-2">
                <EmailDevicePreview
                  html={renderedPreview}
                  subject={previewTemplate?.subjectLine || previewTemplate?.subject || previewTemplate?.name}
                  fromName="Template Studio"
                  fromEmail="templates@example.com"
                  initialDevice="desktop"
                  initialTheme="light"
                  showPreflight={true}
                />
              </TabsContent>
              <TabsContent value="fields" className="min-h-0 overflow-auto">
                <div className="grid gap-4 md:grid-cols-[320px_1fr]">
                  <Card>
                    <CardHeader><CardTitle>Sample Values</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {(previewTemplate.mergeFields || []).map((field: string) => (
                        <div key={field} className="space-y-1"><Label>{`{{${field}}}`}</Label><Input value={sampleValues[field] || ""} onChange={(event) => setSampleValues((current) => ({ ...current, [field]: event.target.value }))} /></div>
                      ))}
                    </CardContent>
                  </Card>
                  <iframe title="Sample preview" sandbox="" srcDoc={renderedPreview} className="h-[calc(100vh-14rem)] w-full rounded-md border bg-background" />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PasteHtmlStep({ onValidate, validationError, validating }: { onValidate: (html: string) => void; validationError: string; validating: boolean }) {
  const [html, setHtml] = useState("");
  return (
    <div className="grid min-h-0 grid-rows-[1fr_auto] gap-3">
      <Textarea value={html} onChange={(event) => setHtml(event.target.value)} className="min-h-0 resize-none font-mono" placeholder="<html>...</html>" />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{html.length.toLocaleString()} characters</span>
        <Button onClick={() => onValidate(html)} disabled={validating}>
          {validating ? (<><Loader2 className="h-4 w-4 animate-spin" />Validating...</>) : "Validate & Continue"}
        </Button>
      </div>
      {validating ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Validating template...</p>
        </div>
      ) : (
        <ValidationError message={validationError} />
      )}
    </div>
  );
}

function TemplateDetails({ draft, setDraft, onSave, saving, generatingPreview }: { draft: DraftTemplate; setDraft: (draft: DraftTemplate) => void; onSave: () => void; saving: boolean; generatingPreview: boolean }) {
  return (
    <div className="space-y-4">
      <div className="h-40 w-full overflow-hidden rounded-xl bg-muted flex items-center justify-center">
        {generatingPreview ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Generating preview...</span>
          </div>
        ) : draft.previewImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.previewImage} alt="" className="h-40 w-full object-cover object-top" />
        ) : (
          <span className="text-xs text-muted-foreground">No Preview</span>
        )}
      </div>
      <div className="rounded-md border bg-accent/20 p-3 text-sm">
        Valid HTML - {draft.mergeFields.length} merge fields detected: {draft.mergeFields.map((field) => `{{${field}}}`).join(", ") || "none"}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label>Template Name</Label><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></div>
        <div className="space-y-2"><Label>Subject Line</Label><Input value={draft.subjectLine} onChange={(event) => setDraft({ ...draft, subjectLine: event.target.value })} /></div>
      </div>
      <div className="space-y-2"><Label>Description</Label><Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></div>
      <div className="space-y-2">
        <Label>Merge Fields</Label>
        <div className="flex flex-wrap gap-2">
          {draft.mergeFields.map((field) => <Badge key={field} variant="secondary" className="cursor-pointer" onClick={() => setDraft({ ...draft, mergeFields: draft.mergeFields.filter((item) => item !== field) })}>{`{{${field}}}`} ×</Badge>)}
        </div>
      </div>
      <Button onClick={onSave} disabled={saving}>
        {saving ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving...</>) : "Save Template"}
      </Button>
    </div>
  );
}

function ValidationError({ message }: { message: string }) {
  if (!message) return null;
  return <pre className="whitespace-pre-wrap rounded-md border border-failed/30 bg-failed/10 p-3 text-sm text-failed">{message}</pre>;
}
