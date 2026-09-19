"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Clock,
  Eye,
  FileSignature,
  Layers,
  Loader2,
  Paperclip,
  Save,
  Send,
  Smartphone,
  Star,
  X
} from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { toast } from "sonner";
import { RichEditor } from "@/components/rich-editor";
import { TagInput } from "@/components/tag-input";
import { apiFetch } from "@/lib/client-api";
import { replaceQrPlaceholdersForPreview } from "@/lib/template-client";
import { detectQrPlaceholders } from "@/lib/qr-placeholders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { saveOfflineDraft } from "@/lib/offline-storage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmailDevicePreview } from "@/components/email-device-preview";

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <ComposeInner />
    </Suspense>
  );
}

function ComposeInner() {
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get("draftId") || searchParams.get("id");

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
  const [statsLoading, setStatsLoading] = useState(true);
  const [qrCampaigns, setQrCampaigns] = useState<any[]>([]);
  const [qrConfig, setQrConfig] = useState<Record<string, any>>({});
  const [previewHtml, setPreviewHtml] = useState("<p>Hello,</p>");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const currentDraftIdRef = useRef<string | null>(null);
  const isOnline = useNetworkStatus();

  // Attachments Engine
  const [attachments, setAttachments] = useState<Array<{ name: string; size?: number; mimeType?: string; path?: string }>>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email Signature Engine
  const [userSignature, setUserSignature] = useState<string | null>(null);
  const [signatureEnabled, setSignatureEnabled] = useState(false);
  const [signatureLoaded, setSignatureLoaded] = useState(false);

  // Mode View (Compose vs Full Device & Dark Mode Preview)
  const [activeMainTab, setActiveMainTab] = useState<"write" | "preview">("write");

  // Initial load: Templates, Stats, QR campaigns, User Profile (Signature), and Draft Hydration
  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setTemplatesLoading(true);
      setStatsLoading(true);
      try {
        const [templateData, statsData, qrData, profileData] = await Promise.all([
          apiFetch<any>("/api/templates"),
          apiFetch<any>("/api/user/stats/quick"),
          apiFetch<{ campaigns: any[] }>("/api/qr/campaigns?isActive=true"),
          apiFetch<any>("/api/user/profile").catch(() => null)
        ]);
        if (ignore) return;
        setTemplates(templateData.templates || []);
        setQuickStats(statsData);
        setQrCampaigns(qrData.campaigns || []);

        // Load signature from user extraFields
        if (profileData?.profile?.extraFields) {
          const sig = profileData.profile.extraFields.emailSignature;
          const enabled = Boolean(profileData.profile.extraFields.signatureEnabled);
          setUserSignature(sig || null);
          setSignatureEnabled(enabled);

          // Auto-insert signature on fresh compose if enabled and not loading a draft
          if (sig && enabled && !draftIdParam && !signatureLoaded) {
            setBodyHtml(`<p>Hello,</p><br/>${sig}`);
            setSignatureLoaded(true);
          }
        }
      } catch {
        // Errors handled gracefully
      } finally {
        if (!ignore) {
          setTemplatesLoading(false);
          setStatsLoading(false);
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [draftIdParam, signatureLoaded]);

  // Load existing draft if draftId query parameter is present
  useEffect(() => {
    if (!draftIdParam) return;
    let ignore = false;

    const loadDraft = async () => {
      try {
        const res = await apiFetch<{ success: boolean; draft?: any }>(`/api/drafts?id=${draftIdParam}`);
        if (ignore) return;
        if (res.draft) {
          const d = res.draft;
          setTo(d.to || []);
          setCc(d.cc || []);
          setBcc(d.bcc || []);
          setReplyTo(d.replyTo || "");
          setSubject(d.subject || "");
          setBodyHtml(d.bodyHtml || "<p>Hello,</p>");
          setAttachments(d.attachments || []);
          const id = d._id || d.id;
          setCurrentDraftId(id);
          currentDraftIdRef.current = id;
          toast.info(`Resumed draft: "${d.subject || "Untitled"}"`);
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load draft");
      }
    };

    loadDraft();
    return () => {
      ignore = true;
    };
  }, [draftIdParam]);

  useEffect(() => {
    setPreviewHtml(replaceQrPlaceholdersForPreview(bodyHtml));
  }, [bodyHtml]);

  // Auto-save draft effect
  useEffect(() => {
    if (
      !subject &&
      (!bodyHtml || bodyHtml === "<p>Hello,</p>") &&
      to.length === 0 &&
      cc.length === 0 &&
      bcc.length === 0 &&
      attachments.length === 0
    ) {
      return;
    }

    const timer = setTimeout(() => {
      const autoSave = async () => {
        setAutoSaveStatus("saving");
        if (typeof window !== "undefined" && !navigator.onLine) {
          try {
            await saveOfflineDraft({
              toAddresses: JSON.stringify(to),
              ccAddresses: JSON.stringify(cc),
              bccAddresses: JSON.stringify(bcc),
              replyTo,
              subject,
              bodyHtml,
              attachments: JSON.stringify(attachments)
            });
            setAutoSaveStatus("saved");
          } catch {
            setAutoSaveStatus("error");
          }
        } else {
          try {
            const res = await apiFetch<{ success: boolean; draft?: any }>("/api/drafts", {
              method: "POST",
              body: JSON.stringify({
                id: currentDraftIdRef.current || undefined,
                to,
                cc,
                bcc,
                replyTo,
                subject,
                bodyHtml,
                attachments
              })
            });
            if (res.draft?._id || res.draft?.id) {
              const savedId = res.draft._id || res.draft.id;
              setCurrentDraftId(savedId);
              currentDraftIdRef.current = savedId;
            }
            setAutoSaveStatus("saved");
          } catch {
            setAutoSaveStatus("error");
          }
        }
      };
      autoSave();
    }, 5000);

    return () => clearTimeout(timer);
  }, [to, cc, bcc, replyTo, subject, bodyHtml, attachments]);

  // Keyboard shortcuts (Ctrl+Enter to Send, Ctrl+S to Save)
  useEffect(() => {
    function keys(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!sending) sendNow();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveDraft();
      }
    }
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [sending, to, cc, bcc, replyTo, subject, bodyHtml, trackingEnabled, qrConfig, attachments]);

  // File Attachments Uploader
  async function handleFileSelect(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const formData = new FormData();

    for (const f of fileList) {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds the 25MB limit.`);
        return;
      }
      formData.append("files", f);
    }

    setUploadingAttachments(true);
    try {
      const res = await fetch("/api/attachments", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload files");
      }
      setAttachments((prev) => [...prev, ...data.attachments]);
      toast.success(`Attached ${data.attachments.length} file${data.attachments.length > 1 ? "s" : ""}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload attachments");
    } finally {
      setUploadingAttachments(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function insertSignature() {
    if (!userSignature) {
      toast.info("No email signature configured. Set one up in Settings.");
      return;
    }
    setBodyHtml((prev) => prev + `<br/>${userSignature}`);
    toast.success("Signature inserted");
  }

  function clearDraftAndStartNew() {
    setCurrentDraftId(null);
    currentDraftIdRef.current = null;
    setTo([]);
    setCc([]);
    setBcc([]);
    setReplyTo("");
    setSubject("");
    setAttachments([]);
    setBodyHtml(userSignature && signatureEnabled ? `<p>Hello,</p><br/>${userSignature}` : "<p>Hello,</p>");
    toast.info("Cleared draft — starting fresh email");
  }

  async function sendNow() {
    if (sending) return;
    try {
      setSending(true);
      await apiFetch("/api/send", {
        method: "POST",
        body: JSON.stringify({
          to,
          cc,
          bcc,
          replyTo,
          subject,
          bodyHtml,
          trackingEnabled,
          qrConfig,
          attachments
        })
      });
      toast.success("Email sent successfully");

      // Delete draft if one was active
      if (currentDraftIdRef.current) {
        apiFetch(`/api/drafts?id=${currentDraftIdRef.current}`, { method: "DELETE" }).catch(() => {});
        setCurrentDraftId(null);
        currentDraftIdRef.current = null;
      }

      // Reset form fields
      setTo([]);
      setCc([]);
      setBcc([]);
      setReplyTo("");
      setSubject("");
      setAttachments([]);
      setBodyHtml(userSignature && signatureEnabled ? `<p>Hello,</p><br/>${userSignature}` : "<p>Hello,</p>");
      setConfirmOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function saveDraft() {
    try {
      setSavingDraft(true);
      setAutoSaveStatus("saving");
      if (typeof window !== "undefined" && !navigator.onLine) {
        await saveOfflineDraft({
          toAddresses: JSON.stringify(to),
          ccAddresses: JSON.stringify(cc),
          bccAddresses: JSON.stringify(bcc),
          replyTo,
          subject,
          bodyHtml,
          attachments: JSON.stringify(attachments)
        });
        toast.info("Saved locally (will sync when online)");
        setAutoSaveStatus("saved");
      } else {
        const res = await apiFetch<{ success: boolean; draft?: any }>("/api/drafts", {
          method: "POST",
          body: JSON.stringify({
            id: currentDraftIdRef.current || undefined,
            to,
            cc,
            bcc,
            replyTo,
            subject,
            bodyHtml,
            attachments
          })
        });
        if (res.draft?._id || res.draft?.id) {
          const savedId = res.draft._id || res.draft.id;
          setCurrentDraftId(savedId);
          currentDraftIdRef.current = savedId;
        }
        toast.success("Draft saved");
        setAutoSaveStatus("saved");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save draft");
      setAutoSaveStatus("error");
    } finally {
      setSavingDraft(false);
    }
  }

  async function saveTemplate(formData: FormData) {
    try {
      setSavingTemplate(true);
      await apiFetch("/api/templates", {
        method: "POST",
        body: JSON.stringify({ name: formData.get("name"), subject, bodyHtml })
      });
      toast.success("Template saved");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingTemplate(false);
    }
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
        const src = data.qrCode.imageUrl;
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
      await apiFetch("/api/schedule", {
        method: "POST",
        body: JSON.stringify({ to, cc, bcc, subject, bodyHtml, scheduledAt, attachments })
      });
      toast.success("Email scheduled");
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Hidden file input for attachments */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {/* Page Header with Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Compose</h1>
          <p className="text-sm text-muted-foreground">
            Write, attach files, preview on mobile and dark mode, and dispatch through your SMTP account.
          </p>
        </div>

        {/* Header Tabs: Write vs Interactive Device Preview */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMainTab("write")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeMainTab === "write"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Composer</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab("preview")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeMainTab === "preview"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Mobile &amp; Dark Preview</span>
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </button>
        </div>
      </div>

      {/* Active Draft Banner */}
      {currentDraftId && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              Editing Saved Draft
            </Badge>
            <span className="text-muted-foreground hidden sm:inline">
              Changes auto-save directly to this draft
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearDraftAndStartNew}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer"
          >
            Start Fresh Email
          </Button>
        </div>
      )}

      {/* Quick Stats Banner */}
      {statsLoading ? (
        <Card>
          <CardContent className="grid gap-4 p-4 md:grid-cols-4">
            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-16" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-6 w-16" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-16" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-16" /></div>
          </CardContent>
        </Card>
      ) : quickStats ? (
        <Card>
          <CardContent className="grid gap-4 p-4 md:grid-cols-4">
            <QuickStat label="Sent today" value={quickStats.sentToday} limit={quickStats.dailyLimit} />
            <QuickStat label="Sent this month" value={quickStats.sentThisMonth} limit={quickStats.monthlyLimit} />
            <QuickStat label="Scheduled" value={quickStats.scheduled} />
            <QuickStat label="Drafts" value={quickStats.drafts} />
          </CardContent>
        </Card>
      ) : null}

      {quickStats && (
        (() => {
          const isDailyReached = quickStats.dailyLimit > 0 && quickStats.sentToday >= quickStats.dailyLimit;
          const isMonthlyReached = quickStats.monthlyLimit > 0 && quickStats.sentThisMonth >= quickStats.monthlyLimit;
          const isDailyNear = quickStats.dailyLimit > 0 && !isDailyReached && quickStats.sentToday >= quickStats.dailyLimit * 0.9;
          const isMonthlyNear = quickStats.monthlyLimit > 0 && !isMonthlyReached && quickStats.sentThisMonth >= quickStats.monthlyLimit * 0.9;

          if (isDailyReached || isMonthlyReached) {
            return (
              <div className="rounded-md border border-failed/30 bg-failed/10 p-3 text-sm text-failed">
                <span className="font-bold">Limit Reached:</span> Your email sending limit is completed or limit reached. Please contact your administrator.
              </div>
            );
          } else if (isDailyNear || isMonthlyNear) {
            return (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                <span className="font-bold">Limit Warning:</span> You are near your email sending limit. Please contact your administrator.
              </div>
            );
          }
          return null;
        })()
      )}

      {/* VIEW TAB 1: COMPOSER */}
      {activeMainTab === "write" && (
        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>New Email</CardTitle>
                <CardDescription>Recipients support comma, space, or Enter separated tags.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveMainTab("preview")}
                className="text-xs gap-1.5"
              >
                <Eye className="h-3.5 w-3.5 text-primary" />
                Mobile &amp; Dark Preview
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>To</Label>
                <TagInput value={to} onChange={setTo} placeholder="recipient@example.com" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>CC</Label>
                  <TagInput value={cc} onChange={setCc} placeholder="cc@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>BCC</Label>
                  <TagInput value={bcc} onChange={setBcc} placeholder="bcc@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reply-To</Label>
                <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="reply@example.com" />
              </div>
              <div className="space-y-2">
                <Label>
                  Subject <span className="text-muted-foreground text-xs">({subject.length} chars)</span>
                </Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Enter a subject line..." />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={trackingEnabled} onCheckedChange={(value) => setTrackingEnabled(Boolean(value))} />
                  <span>Enable open &amp; click tracking</span>
                </label>
                {userSignature && (
                  <button
                    type="button"
                    onClick={insertSignature}
                    className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <FileSignature className="h-3.5 w-3.5" />
                    Insert Signature
                  </button>
                )}
              </div>

              <Tabs value={raw ? "raw" : "visual"} onValueChange={(v) => setRaw(v === "raw")}>
                <TabsList>
                  <TabsTrigger value="visual">Visual</TabsTrigger>
                  <TabsTrigger value="raw">Raw HTML</TabsTrigger>
                </TabsList>
                <TabsContent value="visual">
                  <RichEditor value={bodyHtml} onChange={setBodyHtml} />
                </TabsContent>
                <TabsContent value="raw">
                  <Textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} className="min-h-96 font-mono text-xs" />
                </TabsContent>
              </Tabs>

              {/* Uploaded File Attachments Chip List */}
              {attachments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-primary" />
                      Attached Files ({attachments.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachments([])}
                      className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      Remove All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs shadow-2xs"
                      >
                        <Paperclip className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground truncate max-w-[170px]">
                          {file.name}
                        </span>
                        {file.size && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {file.size / 1024 / 1024 >= 1
                              ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                              : `${Math.round(file.size / 1024)} KB`}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors ml-1 cursor-pointer p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons Toolbar */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={sendNow} disabled={dailyHit || sending || !isOnline} className="font-medium">
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Sending...
                    </>
                  ) : !isOnline ? (
                    <>
                      <Send className="h-4 w-4 mr-1.5" />
                      Offline
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1.5" />
                      Send Now
                    </>
                  )}
                </Button>

                <Button variant="outline" onClick={saveDraft} disabled={savingDraft}>
                  {savingDraft ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1.5" />
                      Save Draft
                    </>
                  )}
                </Button>

                {/* Attachments Picker Button */}
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachments}
                  className="relative"
                >
                  {uploadingAttachments ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Paperclip className="h-4 w-4 mr-1.5" />
                      Attachments
                      {attachments.length > 0 && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px] px-1 py-0 h-4">
                          {attachments.length}
                        </Badge>
                      )}
                    </>
                  )}
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={!isOnline}>
                      <Clock className="h-4 w-4 mr-1.5" />
                      Schedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Schedule Send</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                      <Button onClick={schedule} disabled={!isOnline || !scheduledAt}>
                        Confirm Schedule
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Layers className="h-4 w-4 mr-1.5" />
                      Save Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Template</DialogTitle>
                    </DialogHeader>
                    <form action={saveTemplate} className="space-y-4 py-2">
                      <Input name="name" placeholder="Template name" required />
                      <Button disabled={savingTemplate}>
                        {savingTemplate ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                            Saving...
                          </>
                        ) : (
                          "Save Template"
                        )}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {!isOnline && (
                <div className="text-xs text-warning bg-warning/10 border border-warning/20 rounded px-2.5 py-1.5 inline-block mt-2">
                  You are currently offline. Sending and scheduling are disabled, but you can save draft locally.
                </div>
              )}

              <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                {autoSaveStatus === "saving" && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-primary" /> Saving draft...
                  </>
                )}
                {autoSaveStatus === "saved" && "✓ Draft saved"}
                {autoSaveStatus === "error" && <span className="text-destructive">Draft save failed</span>}
              </div>

              {/* Mobile FAB Send Button & Confirmation Dialog */}
              <div className="fixed bottom-20 right-4 z-40 md:hidden">
                <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <DialogTrigger asChild>
                    <Button
                      size="icon"
                      className="h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center cursor-pointer"
                      disabled={dailyHit || sending || !isOnline}
                    >
                      {sending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Send Email</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <p className="text-sm text-muted-foreground">Are you sure you want to send this email now?</p>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            setConfirmOpen(false);
                            await sendNow();
                          }}
                          disabled={sending}
                        >
                          Confirm Send
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: QR Placeholders & Templates */}
          <div className="space-y-5">
            {qrFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>QR Placeholders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {qrFields.map((field) => {
                    const selected = qrCampaigns.find((campaign) => campaign.id === qrConfig[field]?.campaignId);
                    return (
                      <div key={field} className="grid gap-3 rounded-md border bg-card p-3">
                        <Label>
                          {`{{${field}}}`} Campaign
                          <select
                            className="mt-2 w-full rounded-md border bg-background p-2"
                            value={qrConfig[field]?.campaignId || ""}
                            onChange={(event) => {
                              const nextCampaign = qrCampaigns.find((campaign) => campaign.id === event.target.value);
                              setQrConfig((current) => ({
                                ...current,
                                [field]: {
                                  ...(current[field] || {}),
                                  campaignId: event.target.value,
                                  contentType: nextCampaign?.type || "checkin"
                                }
                              }));
                            }}
                          >
                            <option value="">Select campaign</option>
                            {qrCampaigns.map((campaign) => (
                              <option key={campaign.id} value={campaign.id}>
                                {campaign.name} ({campaign.type})
                              </option>
                            ))}
                          </select>
                        </Label>
                        {selected?.type === "checkin" && (
                          <>
                            <Label>
                              Name
                              <Input
                                value={qrConfig[field]?.name || ""}
                                onChange={(event) =>
                                  setQrConfig((current) => ({
                                    ...current,
                                    [field]: { ...(current[field] || {}), name: event.target.value }
                                  }))
                                }
                              />
                            </Label>
                            <Label>
                              Email
                              <Input
                                value={qrConfig[field]?.email || ""}
                                onChange={(event) =>
                                  setQrConfig((current) => ({
                                    ...current,
                                    [field]: { ...(current[field] || {}), email: event.target.value }
                                  }))
                                }
                              />
                            </Label>
                          </>
                        )}
                        {selected?.type === "url" && (
                          <Label>
                            URL
                            <Input
                              placeholder="https://..."
                              value={qrConfig[field]?.url || ""}
                              onChange={(event) =>
                                setQrConfig((current) => ({
                                  ...current,
                                  [field]: { ...(current[field] || {}), url: event.target.value }
                                }))
                              }
                            />
                          </Label>
                        )}
                        {selected?.type === "text" && (
                          <Label>
                            Text
                            <Textarea
                              maxLength={300}
                              value={qrConfig[field]?.text || ""}
                              onChange={(event) =>
                                setQrConfig((current) => ({
                                  ...current,
                                  [field]: { ...(current[field] || {}), text: event.target.value }
                                }))
                              }
                            />
                          </Label>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <Label>
                            Width
                            <Input
                              type="number"
                              value={qrConfig[field]?.width || 200}
                              onChange={(event) =>
                                setQrConfig((current) => ({
                                  ...current,
                                  [field]: { ...(current[field] || {}), width: Number(event.target.value) || 200 }
                                }))
                              }
                            />
                          </Label>
                          <Label>
                            Height
                            <Input
                              type="number"
                              value={qrConfig[field]?.height || 200}
                              onChange={(event) =>
                                setQrConfig((current) => ({
                                  ...current,
                                  [field]: { ...(current[field] || {}), height: Number(event.target.value) || 200 }
                                }))
                              }
                            />
                          </Label>
                        </div>
                        <Label>
                          Alt text
                          <Input
                            value={qrConfig[field]?.alt || "QR Code"}
                            onChange={(event) =>
                              setQrConfig((current) => ({
                                ...current,
                                [field]: { ...(current[field] || {}), alt: event.target.value }
                              }))
                            }
                          />
                        </Label>
                      </div>
                    );
                  })}
                  <Button variant="outline" disabled={!canRenderQrPreview || previewLoading} onClick={renderQrPreview}>
                    Render QR Preview
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Preview Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Eye className="h-4 w-4 text-primary" />
                  Quick View
                </CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveMainTab("preview")}
                  className="h-6 px-2 text-[11px] text-primary hover:underline cursor-pointer"
                >
                  Full Preview &rarr;
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="rounded-md border bg-background p-3 text-xs max-h-60 overflow-y-auto leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveMainTab("preview")}
                  className="w-full text-xs gap-1.5"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Inspect Mobile &amp; Dark Mode
                </Button>
              </CardContent>
            </Card>

            {/* Template Library */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Load Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {templatesLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="space-y-2">
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {favouriteTemplates.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Favourites</p>
                        {favouriteTemplates.map((template) => (
                          <Button
                            key={template._id}
                            variant="outline"
                            size="sm"
                            className="w-full justify-start text-xs font-normal"
                            onClick={() => loadTemplate(template)}
                          >
                            <Star className="h-3.5 w-3.5 fill-current text-amber-500 mr-1.5" />
                            {template.name}
                          </Button>
                        ))}
                      </div>
                    )}
                    {otherTemplates.map((template) => (
                      <Button
                        key={template._id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs font-normal"
                        onClick={() => loadTemplate(template)}
                      >
                        {template.name}
                      </Button>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: FULL INTERACTIVE DEVICE & DARK MODE PREVIEW */}
      {activeMainTab === "preview" && (
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="h-5 w-5 text-primary" />
                Mobile &amp; Dark Mode Simulator
              </CardTitle>
              <CardDescription>
                Preview how this drafted email appears across Desktop clients, iPhone mobile viewports, Dark Mode, and Lock Screen notifications.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveMainTab("write")}
              className="text-xs gap-1.5"
            >
              &larr; Return to Composer
            </Button>
          </CardHeader>
          <CardContent>
            <EmailDevicePreview
              html={previewHtml}
              subject={subject}
              fromName={quickStats?.user?.name || "Sender"}
              fromEmail={quickStats?.user?.email || "me@example.com"}
              toAddresses={to.length > 0 ? to : ["recipient@example.com"]}
              attachments={attachments}
              initialDevice="mobile"
              initialTheme="light"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuickStat({ label, value, limit }: { label: string; value: number; limit?: number }) {
  const pct = limit ? Math.min(100, Math.round((value / limit) * 100)) : 0;
  const color = pct > 90 ? "bg-failed" : pct >= 75 ? "bg-warning" : "bg-sent";
  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">
        {value}
        {limit ? ` / ${limit}` : ""}
      </div>
      {Boolean(limit) && (
        <div className="h-1.5 rounded-full bg-muted">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
