"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { HighlightStyle, indentOnInput, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import beautify from "js-beautify";
import { ArrowLeft, CheckCircle2, Code2, Eye, Loader2, QrCode, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/client-api";
import { detectTemplateFields, formatInvalidImagesMessage, validateExternalImageUrls } from "@/lib/template-html";
import { generateTemplateThumbnail, replaceQrPlaceholdersForPreview, replaceTemplateValues, TEMPLATE_THUMBNAIL_PLACEHOLDER } from "@/lib/template-client";

const htmlEditorHighlightStyle = HighlightStyle.define([
  { tag: tags.angleBracket, color: "#7dd3fc" },
  { tag: tags.tagName, color: "#fb7185" },
  { tag: tags.attributeName, color: "#facc15" },
  { tag: tags.attributeValue, color: "#86efac" },
  { tag: tags.comment, color: "#64748b", fontStyle: "italic" },
  { tag: (tags as any).docType || tags.meta, color: "#a78bfa" },
  { tag: tags.punctuation, color: "#94a3b8" },
  { tag: tags.string, color: "#86efac" },
  { tag: tags.keyword, color: "#c084fc" },
  { tag: tags.propertyName, color: "#38bdf8" },
  { tag: tags.number, color: "#fdba74" }
]);

const htmlEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#0b1020",
      color: "#dbeafe",
      minHeight: "calc(100vh - 16rem)"
    },
    ".cm-scroller": {
      backgroundColor: "#0b1020",
      fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace'
    },
    ".cm-content": {
      caretColor: "#22d3ee",
      padding: "16px 0"
    },
    ".cm-cursor": {
      borderLeftColor: "#22d3ee"
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "#1e40af66"
    },
    ".cm-activeLine": {
      backgroundColor: "#172554"
    },
    ".cm-gutters": {
      backgroundColor: "#080c18",
      borderRight: "1px solid #1e293b",
      color: "#64748b"
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#172554",
      color: "#bfdbfe"
    },
    ".cm-foldGutter span": {
      color: "#38bdf8"
    },
    ".cm-matchingBracket, .cm-nonmatchingBracket": {
      backgroundColor: "#164e63",
      color: "#ecfeff",
      outline: "1px solid #22d3ee"
    }
  },
  { dark: true }
);

const htmlEditorExtensions = [
  html({ autoCloseTags: true }),
  indentOnInput(),
  indentUnit.of("  "),
  EditorState.tabSize.of(2),
  EditorView.lineWrapping,
  htmlEditorTheme,
  syntaxHighlighting(htmlEditorHighlightStyle)
];

export default function TemplateEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [saved, setSaved] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subjectLine, setSubjectLine] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [mergeFields, setMergeFields] = useState<string[]>([]);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [warning, setWarning] = useState("");
  const [fullPreview, setFullPreview] = useState(false);
  const [qrDialog, setQrDialog] = useState(false);
  const [qrPlaceholder, setQrPlaceholder] = useState({ name: "qr_code", width: 200, height: 200, alt: "QR Code" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      try {
        const { template } = await apiFetch<{ template: any }>(`/api/templates/${params.id}`);
        if (ignore) return;
        setSaved(template);
        setName(template.name || "");
        setDescription(template.description || "");
        setSubjectLine(template.subjectLine || template.subject || "");
        setBodyHtml(template.bodyHtml || "");
        setMergeFields(template.mergeFields || []);
      } catch (error: any) {
        if (!ignore) toast.error(error.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [params.id]);

  const unsaved = useMemo(() => {
    if (!saved) return false;
    return name !== saved.name || description !== (saved.description || "") || subjectLine !== (saved.subjectLine || saved.subject || "") || bodyHtml !== saved.bodyHtml || mergeFields.join("|") !== (saved.mergeFields || []).join("|");
  }, [saved, name, description, subjectLine, bodyHtml, mergeFields]);

  const invalidImages = useMemo(() => validateExternalImageUrls(bodyHtml), [bodyHtml]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWarning(invalidImages.length ? formatInvalidImagesMessage(invalidImages) : "");
    }, 500);
    return () => clearTimeout(timer);
  }, [invalidImages]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function validateImages() {
    setValidating(true);
    try {
      const invalid = validateExternalImageUrls(bodyHtml);
      setWarning(invalid.length ? formatInvalidImagesMessage(invalid) : "");
      toast[invalid.length ? "error" : "success"](invalid.length ? "Invalid images found" : "All images use https URLs");
    } finally {
      setValidating(false);
    }
  }

  function refreshFields() {
    const fields = detectTemplateFields(subjectLine, bodyHtml);
    setMergeFields(fields);
    toast.success(`${fields.length} merge fields detected`);
  }

  function formatHtml() {
    setFormatting(true);
    try {
      setBodyHtml(beautify.html(bodyHtml, { indent_size: 2, wrap_line_length: 120 }));
    } finally {
      setFormatting(false);
    }
  }

  function insertQrPlaceholder() {
    if (!/^qr_[a-z_]+$/.test(qrPlaceholder.name)) return toast.error("Use lowercase letters and underscores, starting with qr_");
    setBodyHtml((current) => `${current}\n<img src="{{${qrPlaceholder.name}}}" width="${qrPlaceholder.width}" height="${qrPlaceholder.height}" alt="${qrPlaceholder.alt}" />`);
    setMergeFields((current) => Array.from(new Set([...current, qrPlaceholder.name])));
    setQrDialog(false);
  }

  function discard() {
    if (!saved) return;
    setName(saved.name || "");
    setDescription(saved.description || "");
    setSubjectLine(saved.subjectLine || saved.subject || "");
    setBodyHtml(saved.bodyHtml || "");
    setMergeFields(saved.mergeFields || []);
    toast.info("Changes discarded");
  }

  async function save() {
    try {
      setSaving(true);
      const invalid = validateExternalImageUrls(bodyHtml);
      if (invalid.length) {
        setWarning(formatInvalidImagesMessage(invalid));
        return toast.error("Fix invalid image URLs before saving");
      }
      const previewImage = await generateTemplateThumbnail(bodyHtml);
      await apiFetch(`/api/templates/${params.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          description,
          subjectLine,
          bodyHtml,
          mergeFields: mergeFields.length ? mergeFields : detectTemplateFields(subjectLine, bodyHtml),
          previewImage: previewImage || TEMPLATE_THUMBNAIL_PLACEHOLDER
        })
      });
      toast.success("Template saved");
      const updated = await apiFetch<{ template: any }>(`/api/templates/${params.id}`);
      setSaved(updated.template);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  function back() {
    if (unsaved && !window.confirm("Discard unsaved changes and go back?")) return;
    router.push("/templates");
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-15rem)]">
        <div className="w-1/2 space-y-2 border-r p-4">
          {Array.from({ length: 20 }).map((_, index) => (
            <Skeleton key={index} className="h-4" style={{ width: `${Math.random() * 40 + 40}%` }} />
          ))}
        </div>
        <div className="w-1/2 p-4">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={back}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Edit Template</h1>
            <p className="text-sm text-muted-foreground">{unsaved ? "Unsaved changes" : "Saved"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={validateImages} disabled={validating}>
            {validating ? (<><Loader2 className="h-4 w-4 animate-spin" />Validating...</>) : (<><CheckCircle2 className="h-4 w-4" />Validate Images</>)}
          </Button>
          <Button variant="outline" onClick={refreshFields}><RefreshCw className="h-4 w-4" />Detect Merge Fields</Button>
          <Button variant="outline" onClick={() => setQrDialog(true)}><QrCode className="h-4 w-4" />Insert QR Placeholder</Button>
          <Button variant="outline" onClick={formatHtml} disabled={formatting}>
            {formatting ? (<Loader2 className="h-4 w-4 animate-spin" />) : (<Code2 className="h-4 w-4" />)}
            {formatting ? "Formatting..." : "Format HTML"}
          </Button>
          <Button variant="outline" onClick={() => setFullPreview(true)}><Eye className="h-4 w-4" />Preview Full Screen</Button>
          <Button variant="outline" onClick={discard}>Discard Changes</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4" />Save Changes</>)}
          </Button>
          <Button asChild variant="ghost"><Link href="/templates">Back to Templates</Link></Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="space-y-2"><Label>Subject Line</Label><Input value={subjectLine} onChange={(event) => setSubjectLine(event.target.value)} /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-10" /></div>
        </CardContent>
      </Card>

      <div className="grid min-h-[calc(100vh-15rem)] gap-4 xl:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="h-full p-0">
            <CodeMirror value={bodyHtml} height="calc(100vh - 16rem)" extensions={htmlEditorExtensions} onChange={setBodyHtml} basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, searchKeymap: true, autocompletion: true }} />
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="flex h-full flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">{mergeFields.map((field) => <Badge key={field} variant="secondary">{`{{${field}}}`}</Badge>)}</div>
              <div className="flex gap-2"><Button size="sm" variant={device === "desktop" ? "secondary" : "outline"} onClick={() => setDevice("desktop")}>Desktop</Button><Button size="sm" variant={device === "mobile" ? "secondary" : "outline"} onClick={() => setDevice("mobile")}>Mobile</Button></div>
            </div>
            {warning && <pre className="whitespace-pre-wrap rounded-md border border-failed/30 bg-failed/10 p-3 text-sm text-failed">{warning}</pre>}
            <iframe title="Live preview" sandbox="" srcDoc={replaceQrPlaceholdersForPreview(bodyHtml)} className="mx-auto min-h-0 flex-1 rounded-md border bg-background" style={{ width: device === "desktop" ? 600 : 375 }} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={fullPreview} onOpenChange={setFullPreview}>
        <DialogContent className="h-screen w-screen max-w-none grid-rows-[auto_1fr] overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex items-center justify-between gap-3 pr-10">
              <DialogTitle>Preview</DialogTitle>
              <div className="flex gap-2">
                <Button size="sm" variant={device === "desktop" ? "secondary" : "outline"} onClick={() => setDevice("desktop")}>Desktop</Button>
                <Button size="sm" variant={device === "mobile" ? "secondary" : "outline"} onClick={() => setDevice("mobile")}>Mobile</Button>
              </div>
            </div>
          </DialogHeader>
          <div className="min-h-0 overflow-hidden bg-muted p-0">
            <iframe
              title="Full preview"
              sandbox=""
              srcDoc={replaceQrPlaceholdersForPreview(replaceTemplateValues(bodyHtml, {}))}
              className="h-full rounded-none border-0 bg-background"
              style={{ width: device === "desktop" ? "100%" : 375, marginInline: device === "desktop" ? 0 : "auto", display: "block" }}
            />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={qrDialog} onOpenChange={setQrDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Insert QR Placeholder</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Label>Placeholder name<Input value={qrPlaceholder.name} onChange={(event) => setQrPlaceholder({ ...qrPlaceholder, name: event.target.value })} /></Label>
            <div className="grid grid-cols-2 gap-3"><Label>Width<Input type="number" value={qrPlaceholder.width} onChange={(event) => setQrPlaceholder({ ...qrPlaceholder, width: Number(event.target.value) || 200 })} /></Label><Label>Height<Input type="number" value={qrPlaceholder.height} onChange={(event) => setQrPlaceholder({ ...qrPlaceholder, height: Number(event.target.value) || 200 })} /></Label></div>
            <Label>Alt text<Input value={qrPlaceholder.alt} onChange={(event) => setQrPlaceholder({ ...qrPlaceholder, alt: event.target.value })} /></Label>
            <p className="text-sm text-muted-foreground">Use different names for multiple QRs: qr_ticket, qr_map, etc.</p>
            <Button onClick={insertQrPlaceholder}>Insert Placeholder</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

