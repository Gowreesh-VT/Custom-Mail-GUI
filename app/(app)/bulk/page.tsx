"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { AlertTriangle, Award, Check, FileSpreadsheet, Layers, Loader2, Play, QrCode, Square, Upload, CheckCircle2, AlertCircle, ArrowRight, Download, RotateCcw, ShieldCheck, BarChart2, Clock, Timer, Zap, FileText, FolderOpen, Laptop, Sparkles, FlaskConical, ClipboardList } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
  const [hasRun, setHasRun] = useState(false);
  const [logsCleared, setLogsCleared] = useState(false);
  const [parsingCsv, setParsingCsv] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [qrWarningOpen, setQrWarningOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Batching and Anti-Duplicate Resume Engine
  const [batchSize, setBatchSize] = useState(30);
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);
  const [processedEmails, setProcessedEmails] = useState<Set<string>>(new Set());
  const [currentBatchInfo, setCurrentBatchInfo] = useState<{ current: number; total: number } | null>(null);
  const bulkJobIdRef = useRef<string>("");

  // Live ETA and Timer Engine
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Personalized Letter & Local PDF Engine (Localhost)
  const [attachLetters, setAttachLetters] = useState(false);
  const [letterMode, setLetterMode] = useState<"generate_docx" | "local_pdf_folder">("generate_docx");
  const [defaultDocxName, setDefaultDocxName] = useState("MIC_Letter_Normal.docx");
  const [entrepreneurshipDocxName, setEntrepreneurshipDocxName] = useState("MIC_Letter_Entrepreneurship.docx");
  const [pdfFolder, setPdfFolder] = useState("generated_pdf");
  const [defaultDocxFile, setDefaultDocxFile] = useState<File | null>(null);
  const [entrepreneurshipDocxFile, setEntrepreneurshipDocxFile] = useState<File | null>(null);
  const [letterPreviewLoading, setLetterPreviewLoading] = useState(false);
  const [letterPreviewPdf, setLetterPreviewPdf] = useState<string | null>(null);
  const [letterPreviewOpen, setLetterPreviewOpen] = useState(false);
  const [isLocalhostEnv, setIsLocalhostEnv] = useState(true);

  // Validation & Deduplication States
  const [validationLoading, setValidationLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [validationReport, setValidationReport] = useState<any>(null);
  const [checkSentGlobally, setCheckSentGlobally] = useState(false);
  const [checkSentHistory, setCheckSentHistory] = useState(true);

  // Feature: Test Mail Send
  const [testMailOpen, setTestMailOpen] = useState(false);
  const [testMailAddresses, setTestMailAddresses] = useState("");
  const [testMailSending, setTestMailSending] = useState(false);

  // Feature: Paste Emails Mode
  const [inputMode, setInputMode] = useState<"csv" | "paste">("csv");
  const [pastedEmails, setPastedEmails] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLocal =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "::1";
      setIsLocalhostEnv(isLocal);
    }
  }, []);

  useEffect(() => {
    if (!sending || !startTime) return;
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sending, startTime]);

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
        const exactMatch = columns.find((c) => c === field);
        const caseMatch = columns.find((c) => c.toLowerCase().trim() === field.toLowerCase().trim());
        nextMap[field] = exactMatch || caseMatch || "";
      });
      setColumnMap(nextMap);
    }).catch((error) => toast.error(error.message));
  }, [templateId, columns]);

  /** Normalise a flat list of raw objects into rows with a resolved `email` key */
  function normaliseRows(rawRows: Record<string, unknown>[]): { fields: string[]; cleanRows: Record<string, string>[]; emailKey: string | undefined } {
    if (rawRows.length === 0) return { fields: [], cleanRows: [], emailKey: undefined };
    
    // Gather all unique keys across all rows (handles JSON with optional fields & sparse Excel sheets)
    const allKeysSet = new Set<string>();
    for (const r of rawRows) {
      if (r && typeof r === "object") {
        for (const k of Object.keys(r)) {
          allKeysSet.add(k);
        }
      }
    }
    const fields = Array.from(allKeysSet);

    const emailKey = fields.find((f) => {
      const clean = f.toLowerCase().trim();
      return clean === "email" || clean === "e-mail" || clean === "email address" || clean === "recipient" || clean === "to";
    });

    const cleanRows = rawRows
      .filter((row) => row && typeof row === "object")
      .map((row) => {
        const cleaned: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          cleaned[String(k)] = String(v ?? "").trim();
        }
        if (emailKey && cleaned[emailKey]) {
          cleaned.email = cleaned[emailKey];
        }
        return cleaned;
      })
      .filter((row) => Boolean(emailKey && row[emailKey]?.trim()));

    return { fields, cleanRows, emailKey };
  }

  async function inspect(nextFile: File | null) {
    setParsingCsv(true);
    setFile(nextFile);
    try {
      if (!nextFile) return;
      const ext = nextFile.name.split(".").pop()?.toLowerCase() ?? "";
      let rawRows: Record<string, unknown>[] = [];

      if (ext === "csv") {
        // ── CSV via PapaParse ──────────────────────────────────────────────
        const parsed = Papa.parse<Record<string, string>>(await nextFile.text(), { header: true, skipEmptyLines: true });
        rawRows = parsed.data as Record<string, unknown>[];

      } else if (ext === "xlsx" || ext === "xls") {
        // ── Excel via xlsx (SheetJS) ───────────────────────────────────────
        const arrayBuffer = await nextFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });

      } else if (ext === "json") {
        // ── JSON ───────────────────────────────────────────────────────────
        const text = await nextFile.text();
        const parsed = JSON.parse(text);
        // Accept either a top-level array or an object with an array value
        if (Array.isArray(parsed)) {
          rawRows = parsed;
        } else if (typeof parsed === "object" && parsed !== null) {
          const arrayVal = Object.values(parsed).find(Array.isArray);
          if (arrayVal) {
            rawRows = arrayVal as Record<string, unknown>[];
          } else {
            return toast.error("JSON must contain an array of records (or an object whose value is an array)");
          }
        } else {
          return toast.error("JSON file must contain an array of objects");
        }

      } else {
        return toast.error("Unsupported file type. Please use CSV, Excel (.xlsx/.xls), or JSON.");
      }

      const { fields, cleanRows, emailKey } = normaliseRows(rawRows);

      if (!emailKey) {
        setRows([]);
        setColumns(fields);
        return toast.error('File must include an "email", "Email", "recipient", or "to" column');
      }
      setColumns(fields);
      setRows(cleanRows);
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Failed to parse file");
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
  // canSend: works for both CSV/Excel/JSON (file present) and paste mode (file is null)
  const canSend = fullTemplate && rows.length > 0 && (Object.values(columnMap).every(Boolean) || Object.keys(columnMap).length === 0);
  const validRecipients = rows.length;
  // Memoised so we don't recompute parsePastedEmails on every keystroke outside paste mode
  const parsedPastedCount = useMemo(() => parsePastedEmails(pastedEmails).length, [pastedEmails]); // eslint-disable-line react-hooks/exhaustive-deps
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

  const duplicateEmailsSet = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((row) => {
      const email = String(row.email || "").toLowerCase().trim();
      if (email) counts[email] = (counts[email] || 0) + 1;
    });
    return new Set(Object.keys(counts).filter((email) => counts[email] > 1));
  }, [rows]);

  function deduplicateKeepFirst() {
    const seen = new Set<string>();
    const nextRows = rows.filter((row) => {
      const email = String(row.email || "").toLowerCase().trim();
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });
    setRows(nextRows);
    toast.success(`Removed duplicates (kept first). Remaining: ${nextRows.length}`);
  }

  function deduplicateKeepLast() {
    const seen = new Set<string>();
    const nextRows = [...rows].reverse().filter((row) => {
      const email = String(row.email || "").toLowerCase().trim();
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    }).reverse();
    setRows(nextRows);
    toast.success(`Removed duplicates (kept last). Remaining: ${nextRows.length}`);
  }

  async function runPreSendValidation() {
    if (!canSend || !fullTemplate) return toast.error("Complete all steps first");
    setValidationLoading(true);
    try {
      const requiredCols = ["email", ...Object.values(columnMap)];
      
      const invalidEmails: Array<{ email: string; row: number; reason: string }> = [];
      const duplicatesMap: Record<string, number[]> = {};
      const requiredColsMissing: string[] = [];
      
      const missingCols = requiredCols.filter(col => !columns.includes(col));
      if (missingCols.length > 0) {
        requiredColsMissing.push(...missingCols);
      }
      
      rows.forEach((row, index) => {
        const rowNum = index + 1;
        const email = String(row.email || "").trim();
        
        if (!email) {
          invalidEmails.push({ email: "(Empty)", row: rowNum, reason: "Email is empty" });
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          invalidEmails.push({ email, row: rowNum, reason: "Invalid format" });
        }
        
        Object.entries(row).forEach(([col, val]) => {
          if (val && /[\x00-\x1F\x7F-\x9F]/.test(val)) {
            invalidEmails.push({ email: email || `Row ${rowNum}`, row: rowNum, reason: `Control characters in "${col}"` });
          }
        });
        
        if (email) {
          const key = email.toLowerCase();
          if (!duplicatesMap[key]) duplicatesMap[key] = [];
          duplicatesMap[key].push(rowNum);
        }
      });
      
      const duplicatesList = Object.entries(duplicatesMap)
        .filter(([, rows]) => rows.length > 1)
        .map(([email, rows]) => ({ email, rows }));
        
      const emailList = rows.map((r) => String(r.email || "").toLowerCase().trim()).filter(Boolean);
      
      let invalidMxDomains: string[] = [];
      let alreadySent: string[] = [];
      
      if (emailList.length > 0) {
        const res = await apiFetch<any>("/api/validate-bulk", {
          method: "POST",
          body: JSON.stringify({
            emails: emailList,
            templateId: fullTemplate._id,
            globalCheck: checkSentGlobally
          })
        });
        invalidMxDomains = res.invalidMxDomains || [];
        alreadySent = res.alreadySent || [];
      }
      
      const invalidDomainsSet = new Set(invalidMxDomains.map(d => d.toLowerCase()));
      const alreadySentSet = new Set(alreadySent.map(e => e.toLowerCase()));
      
      // Calculate final count
      const finalSendRows = rows.filter((row) => {
        const email = String(row.email || "").toLowerCase().trim();
        if (!email) return false;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
        const parts = email.split("@");
        const domain = parts[parts.length - 1];
        if (invalidDomainsSet.has(domain)) return false;
        if (checkSentHistory && alreadySentSet.has(email)) return false;
        return true;
      });
      
      setValidationReport({
        totalRows: rows.length,
        validCount: rows.length - invalidEmails.length - invalidMxDomains.length,
        invalidEmails,
        invalidMxDomains,
        duplicates: duplicatesList,
        alreadySent,
        finalCount: finalSendRows.length,
        requiredColsMissing
      });
      setReportOpen(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to run validations");
    } finally {
      setValidationLoading(false);
    }
  }

  function proceedWithValidSend() {
    if (!validationReport) return;
    
    const invalidDomainsSet = new Set(validationReport.invalidMxDomains.map((d: string) => d.toLowerCase()));
    const alreadySentSet = new Set(validationReport.alreadySent.map((e: string) => e.toLowerCase()));
    
    const validRows = rows.filter((row) => {
      const email = String(row.email || "").toLowerCase().trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
      const parts = email.split("@");
      const domain = parts[parts.length - 1];
      if (invalidDomainsSet.has(domain)) return false;
      if (checkSentHistory && alreadySentSet.has(email)) return false;
      return true;
    });
    
    if (validRows.length === 0) {
      toast.error("No valid emails remaining after filtering");
      setReportOpen(false);
      return;
    }
    
    const csvString = Papa.unparse(validRows);
    const updatedFile = new File([csvString], file?.name || "valid_emails.csv", { type: "text/csv" });
    
    setRows(validRows);
    setFile(updatedFile);
    setReportOpen(false);
    
    setTimeout(() => {
      sendBulk(true);
    }, 100);
  }

  const unsentRows = useMemo(() => {
    return rows.filter((r) => {
      const email = String(r.email || "").toLowerCase().trim();
      return email && !processedEmails.has(email);
    });
  }, [rows, processedEmails]);

  async function sendBulk(sendAnyway = false, resumeOnly = false) {
    if (!canSend || !fullTemplate) return toast.error("Complete all steps before sending");
    if (hasMissingQrConfig && !sendAnyway) {
      setQrWarningOpen(true);
      return;
    }

    const targetRows = resumeOnly ? unsentRows : rows;
    if (targetRows.length === 0) {
      toast.info("All recipients in this list have already been sent or processed.");
      return;
    }

    setSending(true);
    setQrWarningOpen(false);
    setHasRun(true);
    setStartTime(Date.now());
    setElapsedSeconds(0);

    if (!resumeOnly) {
      setLogsCleared(false);
      setLogs([]);
      setProcessedEmails(new Set());
      bulkJobIdRef.current = crypto.randomUUID();
    } else if (!bulkJobIdRef.current) {
      bulkJobIdRef.current = crypto.randomUUID();
    }

    const currentCampaignId = bulkJobIdRef.current;

    // Split target rows into manageable batches to prevent Vercel 300s timeout
    const currentBatchSize = Math.max(5, batchSize || 30);
    const chunks: Record<string, string>[][] = [];
    for (let i = 0; i < targetRows.length; i += currentBatchSize) {
      chunks.push(targetRows.slice(i, i + currentBatchSize));
    }

    let completedBatches = 0;
    let aborted = false;

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (abortRef.current?.signal.aborted) {
          aborted = true;
          break;
        }

        const chunk = chunks[i];
        setCurrentBatchInfo({ current: i + 1, total: chunks.length });

        const controller = new AbortController();
        abortRef.current = controller;

        const form = new FormData();
        form.set("rowsJson", JSON.stringify(chunk));
        form.set("templateId", fullTemplate._id);
        form.set("columnMap", JSON.stringify(columnMap));
        form.set("qrConfig", JSON.stringify(qrConfig));
        form.set("qrFieldConfigs", JSON.stringify(qrFieldConfigs));
        if (certificateConfig) form.set("certificateConfig", JSON.stringify(certificateConfig));
        if (attachLetters) {
          form.set("letterConfig", JSON.stringify({
            enabled: true,
            mode: letterMode,
            defaultTemplateName: defaultDocxName,
            entrepreneurshipTemplateName: entrepreneurshipDocxName,
            pdfFolder: pdfFolder
          }));
          if (defaultDocxFile) form.set("defaultDocx", defaultDocxFile);
          if (entrepreneurshipDocxFile) form.set("entrepreneurshipDocx", entrepreneurshipDocxFile);
        }
        form.set("delayMs", String(delayMs));
        form.set("bulkJobId", currentCampaignId);
        form.set("skipAlreadySent", String(skipAlreadySent));
        form.set("startIndex", String(resumeOnly ? (rows.length - targetRows.length + i * currentBatchSize) : i * currentBatchSize));
        form.set("isLastBatch", String(i === chunks.length - 1));

        try {
          const res = await fetch("/api/send-bulk", { method: "POST", body: form, signal: controller.signal });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server returned error (${res.status}) on batch ${i + 1}`);
          }
          if (!res.body) throw new Error("No response stream received from server");

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines.filter(Boolean)) {
              try {
                const logObj = JSON.parse(line);
                setLogs((current) => [logObj, ...current].slice(0, 500));
                if (logObj.email) {
                  const emailKey = String(logObj.email).toLowerCase().trim();
                  if (logObj.type === "sent" || logObj.type === "skipped" || logObj.type === "failed") {
                    setProcessedEmails((prev) => new Set([...prev, emailKey]));
                  }
                }
              } catch {}
            }
          }
          completedBatches++;
        } catch (err: any) {
          if (err.name === "AbortError" || controller.signal.aborted) {
            aborted = true;
            setLogs((current) => [{ type: "stopped", reason: "User stopped the campaign" }, ...current]);
            toast.info("Bulk dispatch paused / stopped");
            break;
          } else {
            toast.error(`Batch ${i + 1} interrupted: ${err.message}`);
            setLogs((current) => [{ type: "failed", error: `Batch ${i + 1} interrupted: ${err.message}` }, ...current]);
            break;
          }
        }
      }

      if (!aborted && completedBatches === chunks.length) {
        toast.success("Bulk run finished successfully!");
      }
    } finally {
      setSending(false);
      setCurrentBatchInfo(null);
      abortRef.current = null;
    }
  }

  function stopSending() {
    abortRef.current?.abort();
    setSending(false);
  }

  function exportUnsentCsv() {
    if (unsentRows.length === 0) {
      toast.info("No unsent recipients to export");
      return;
    }
    const csv = Papa.unparse(unsentRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `unsent_recipients_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${unsentRows.length} unsent recipients`);
  }

  // ── Feature: Test Mail Send ────────────────────────────────────────────────
  async function sendTestMail() {
    if (!fullTemplate) return toast.error("Select a template first");
    const rawAddresses = testMailAddresses.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validAddresses = rawAddresses.filter((e) => emailRe.test(e));
    if (validAddresses.length === 0) return toast.error("Enter at least one valid email address");

    setTestMailSending(true);
    try {
      // Use first CSV row (or empty) for merge-field substitution
      const mergeValues = mappedSample;
      const substitutedSubject = replaceTemplateValues(
        fullTemplate.subjectLine || fullTemplate.subject || "(No subject)",
        mergeValues
      );
      const substitutedBody = replaceTemplateValues(fullTemplate.bodyHtml || "", mergeValues);

      const res = await apiFetch<{ success: boolean; messageId?: string }>("/api/send", {
        method: "POST",
        body: JSON.stringify({
          to: validAddresses,
          subject: `[TEST] ${substitutedSubject}`,
          bodyHtml: substitutedBody,
          qrConfig: qrConfig,
          trackingEnabled: false,
        }),
      });

      if (res.success) {
        toast.success(`Test email sent to ${validAddresses.join(", ")}`);
        setTestMailOpen(false);
        setTestMailAddresses("");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send test email");
    } finally {
      setTestMailSending(false);
    }
  }

  // ── Feature: Paste Emails Mode ────────────────────────────────────────────
  function parsePastedEmails(raw: string): string[] {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seen = new Set<string>();
    return raw
      .split(/[,;\n\r]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((e) => e && emailRe.test(e) && !seen.has(e) && seen.add(e) !== undefined);
  }

  function usePastedEmails() {
    const parsed = parsePastedEmails(pastedEmails);
    if (parsed.length === 0) return toast.error("No valid email addresses found");
    const nextRows = parsed.map((email) => ({ email }));
    setRows(nextRows);
    setColumns(["email"]);
    setColumnMap({});
    setFile(null);
    setStep(2);
    toast.success(`Loaded ${parsed.length} email${parsed.length === 1 ? "" : "s"}`);
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

  async function previewLetter() {
    if (rows.length === 0) return toast.error("Upload a CSV with recipients first");
    setLetterPreviewLoading(true);
    try {
      const sampleRow = rows[certPreviewRow] || rows[0];
      const formData = new FormData();
      formData.append("row", JSON.stringify(sampleRow));
      formData.append("letterConfig", JSON.stringify({
        enabled: true,
        mode: letterMode,
        defaultTemplateName: defaultDocxName,
        entrepreneurshipTemplateName: entrepreneurshipDocxName,
        pdfFolder: pdfFolder
      }));
      if (defaultDocxFile) formData.append("defaultDocx", defaultDocxFile);
      if (entrepreneurshipDocxFile) formData.append("entrepreneurshipDocx", entrepreneurshipDocxFile);

      const res = await fetch("/api/letters/preview", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate letter preview");
      }
      setLetterPreviewPdf(data.pdfBase64);
      setLetterPreviewOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to preview letter");
    } finally {
      setLetterPreviewLoading(false);
    }
  }

  const stats = useMemo(() => {
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    let certs = 0;
    let failedCerts = 0;
    let letters = 0;
    let failedLetters = 0;
    let failedQrs = 0;
    const failureDetails: Array<{ email: string; reason: string; type: string; bothFailed?: boolean; primaryError?: string; fallbackError?: string }> = [];

    logs.forEach((log) => {
      if (log.type === "sent") {
        sent++;
      } else if (log.type === "skipped") {
        skipped++;
      } else if (log.type === "failed") {
        failed++;
        failureDetails.push({
          email: log.email || "Unknown Recipient",
          reason: log.error || "Unknown SMTP delivery failure",
          type: "Email Delivery",
          bothFailed: log.bothFailed,
          primaryError: log.primaryError,
          fallbackError: log.fallbackError
        });
      } else if (log.type === "certificate_error") {
        failedCerts++;
        failureDetails.push({
          email: log.recipient || "Unknown Recipient",
          reason: log.error || "Certificate PDF generation error",
          type: "Certificate Attachment"
        });
      } else if (log.type === "letter_error") {
        failedLetters++;
        failureDetails.push({
          email: log.recipient || "Unknown Recipient",
          reason: log.error || "Letter generation/attachment error",
          type: "Letter Document"
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

    const latestProgressLog = logs.find((l) => l.type === "sent" || l.type === "failed" || l.type === "skipped");
    if (latestProgressLog) {
      certs = latestProgressLog.certificateCount || 0;
      letters = latestProgressLog.letterCount || 0;
    }

    return {
      sent,
      failed,
      skipped,
      certs,
      failedCerts,
      letters,
      failedLetters,
      failedQrs,
      failureDetails
    };
  }, [logs]);

  const etaInfo = useMemo(() => {
    const processed = stats.sent + stats.failed + stats.skipped;
    const total = validRecipients;
    const remaining = Math.max(0, total - processed);

    const formatTime = (secs: number) => {
      if (secs <= 0 || !Number.isFinite(secs)) return "0s";
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      if (m === 0) return `${s}s`;
      return `${m}m ${s}s`;
    };

    const elapsedText = formatTime(elapsedSeconds);

    if (!sending && !hasRun) {
      return { etaText: null, speedText: null, elapsedText: null, remaining };
    }

    if (!sending && hasRun) {
      return {
        etaText: "Completed",
        speedText: elapsedSeconds > 0 ? `${Math.round((processed / elapsedSeconds) * 60)}/min` : null,
        elapsedText,
        remaining
      };
    }

    if (processed === 0 || elapsedSeconds < 2) {
      const estimatedSecs = Math.round((remaining * (delayMs + 350)) / 1000);
      const speed = Math.round(60000 / (delayMs + 350));
      return {
        etaText: `~${formatTime(estimatedSecs)}`,
        speedText: `~${speed}/min`,
        elapsedText,
        remaining
      };
    }

    const ratePerSec = processed / elapsedSeconds;
    const speedMin = Math.round(ratePerSec * 60);
    const remainingSecs = Math.round(remaining / ratePerSec);

    return {
      etaText: remaining === 0 ? "Finishing..." : `~${formatTime(remainingSecs)}`,
      speedText: `${speedMin}/min`,
      elapsedText,
      remaining
    };
  }, [stats, validRecipients, sending, hasRun, elapsedSeconds, delayMs]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Bulk Send</h1>
        <p className="text-sm text-muted-foreground">CSV to saved HTML template mail merge, with editable field mapping and streaming progress.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        {["Upload File", "Select Template", "Map Fields", "Preview & Send"].map((label, index) => (
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Add Recipients
            </CardTitle>
            <CardDescription>Upload a CSV, Excel, or JSON file — or paste addresses directly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Tabs */}
            <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 w-fit">
              <button
                type="button"
                onClick={() => setInputMode("csv")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  inputMode === "csv"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setInputMode("paste")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  inputMode === "paste"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Paste Emails
              </button>
            </div>

            {/* File Upload Mode (CSV / Excel / JSON) */}
            {inputMode === "csv" && (
              <>
                <Label
                  htmlFor="datafile"
                  className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-accent/20 p-6 text-center hover:bg-accent/30 transition-colors"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{file?.name || "Click to choose a file"}</p>
                    <p className="text-xs text-muted-foreground">or drag and drop</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <FileSpreadsheet className="h-2.5 w-2.5" /> CSV
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <FileSpreadsheet className="h-2.5 w-2.5" /> XLSX
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <FileSpreadsheet className="h-2.5 w-2.5" /> XLS
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      <FileText className="h-2.5 w-2.5" /> JSON
                    </span>
                  </div>
                </Label>
                <Input
                  id="datafile"
                  className="hidden"
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  onChange={(event) => inspect(event.target.files?.[0] || null)}
                />
                {parsingCsv && (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Parsing file...</p>
                  </div>
                )}
              </>
            )}

            {/* Paste Emails Mode */}
            {inputMode === "paste" && (
              <div className="space-y-3">
                <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Best for templates with no merge fields.</span> One email per line, or separated by commas / semicolons. Duplicates are removed automatically.
                </div>
                <Textarea
                  placeholder={"alice@example.com\nbob@example.com\ncarol@example.com"}
                  value={pastedEmails}
                  onChange={(e) => setPastedEmails(e.target.value)}
                  className="min-h-[180px] font-mono text-xs resize-y"
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {parsedPastedCount > 0
                      ? `${parsedPastedCount} valid, unique address${parsedPastedCount === 1 ? "" : "es"} detected`
                      : "No valid addresses yet"}
                  </span>
                  <Button
                    size="sm"
                    disabled={parsedPastedCount === 0}
                    onClick={usePastedEmails}
                  >
                    Use These Emails
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
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
          <CardHeader><CardTitle>Map Columns &amp; Merge Fields</CardTitle><CardDescription>Exact column matches were selected automatically. Review and adjust before sending.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {columns.length <= 1 && textFields.length > 0 && (
              <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 space-y-1">
                <div className="font-semibold flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> Template Contains Merge Placeholders</div>
                <div>This template uses {textFields.map((f: string) => `{{${f}}}`).join(", ")}. Because you pasted plain email addresses without other columns, merge fields will default to empty unless mapped.</div>
              </div>
            )}
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

            {/* Personalized Letter & Local PDF Engine Card */}
            <div className="space-y-4 rounded-md border border-primary/20 bg-primary/5 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <h3 className="flex items-center gap-2 font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    Personalized Letter / Local PDF Attachments
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider ml-1">
                      <Laptop className="h-3 w-3 mr-1" />
                      Localhost
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Generate individual merged DOCX/PDF letters per member or match pre-generated PDFs from a local directory.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold shrink-0">
                  <input
                    type="checkbox"
                    checked={attachLetters}
                    onChange={(e) => setAttachLetters(e.target.checked)}
                    className="h-4 w-4 rounded border-primary"
                  />
                  <span>Enable Letter Attachments</span>
                </label>
              </div>

              {attachLetters && (
                <div className="space-y-4 pt-2 border-t border-primary/10">
                  {/* Mode Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setLetterMode("generate_docx")}
                      className={`p-3 rounded-lg border text-left transition-colors flex flex-col gap-1.5 ${letterMode === "generate_docx" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted/50"}`}
                    >
                      <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Generate from DOCX Template
                      </div>
                      <div className="text-xs">
                        Auto-replaces [Name], [Reg_No], [Position], [Dept], and Dept Heads across Word document.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLetterMode("local_pdf_folder")}
                      className={`p-3 rounded-lg border text-left transition-colors flex flex-col gap-1.5 ${letterMode === "local_pdf_folder" ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted/50"}`}
                    >
                      <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        Match from Local PDF Directory
                      </div>
                      <div className="text-xs">
                        Reads existing PDFs from folder (e.g. ./generated_pdf) matched by Reg No / Dept / Email.
                      </div>
                    </button>
                  </div>

                  {/* Mode 1 Settings: DOCX Generation */}
                  {letterMode === "generate_docx" && (
                    <div className="space-y-3 p-3 rounded-md bg-background/60 border text-xs">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Standard DOCX Template Path or Upload</Label>
                          <Input
                            placeholder="MIC_Letter_Normal.docx"
                            value={defaultDocxName}
                            onChange={(e) => setDefaultDocxName(e.target.value)}
                            className="text-xs"
                          />
                          <div className="pt-1">
                            <input
                              type="file"
                              accept=".docx"
                              id="defaultDocxFileInput"
                              className="hidden"
                              onChange={(e) => setDefaultDocxFile(e.target.files?.[0] || null)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px]"
                              onClick={() => document.getElementById("defaultDocxFileInput")?.click()}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              {defaultDocxFile ? defaultDocxFile.name : "Upload Custom Normal .docx"}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Entrepreneurship DOCX Template Path or Upload</Label>
                          <Input
                            placeholder="MIC_Letter_Entrepreneurship.docx"
                            value={entrepreneurshipDocxName}
                            onChange={(e) => setEntrepreneurshipDocxName(e.target.value)}
                            className="text-xs"
                          />
                          <div className="pt-1">
                            <input
                              type="file"
                              accept=".docx"
                              id="entDocxFileInput"
                              className="hidden"
                              onChange={(e) => setEntrepreneurshipDocxFile(e.target.files?.[0] || null)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px]"
                              onClick={() => document.getElementById("entDocxFileInput")?.click()}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              {entrepreneurshipDocxFile ? entrepreneurshipDocxFile.name : "Upload Custom Ent .docx"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mode 2 Settings: Local PDF Folder */}
                  {letterMode === "local_pdf_folder" && (
                    <div className="space-y-2 p-3 rounded-md bg-background/60 border text-xs">
                      <Label className="text-xs font-semibold">Local PDF Folder Path</Label>
                      <Input
                        placeholder="generated_pdf"
                        value={pdfFolder}
                        onChange={(e) => setPdfFolder(e.target.value)}
                        className="text-xs font-mono"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Files in this directory will be matched against recipient registration numbers (e.g. <code>management_21bce1234.pdf</code> or <code>21bce1234.pdf</code>).
                      </p>
                    </div>
                  )}

                  {/* Preview Letter Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Label className="text-xs">Preview Recipient:</Label>
                      <select
                        className="rounded border bg-background px-2 py-1 text-xs"
                        value={certPreviewRow}
                        onChange={(e) => setCertPreviewRow(Number(e.target.value))}
                      >
                        {rows.slice(0, 100).map((row, index) => (
                          <option key={index} value={index}>
                            {row.name || row.NAME || row.email || `Row ${index + 1}`} ({row.department || row.dept || "Member"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={letterPreviewLoading}
                      onClick={previewLetter}
                      className="border-primary/30 hover:bg-primary/5 text-primary text-xs"
                    >
                      {letterPreviewLoading ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Generating Letter...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-1.5 h-3.5 w-3.5" />
                          Preview Letter PDF
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={() => setStep(4)}>Continue to Preview</Button>
          </CardContent>
        </Card>
      )}

      {step === 4 && fullTemplate && (
        <div className="space-y-6">
          {/* Top Panel: Live Status & Progress Bar */}
          {(sending || hasRun) && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {sending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span>Sending Campaign in Progress...</span>
                          {currentBatchInfo && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                              Batch {currentBatchInfo.current} of {currentBatchInfo.total}
                            </Badge>
                          )}
                        </>
                      ) : unsentRows.length === 0 ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-sent" />
                          <span>Campaign Execution Finished (All Delivered)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                          <span>Campaign Paused / Incomplete ({unsentRows.length} unsent)</span>
                        </>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {sending 
                        ? `Processing ${batchSize} emails per serverless batch to prevent timeouts.`
                        : `Real-time stats and dispatch status for campaign ${bulkJobIdRef.current ? `#${bulkJobIdRef.current.slice(0, 8)}` : ""}`}
                    </CardDescription>
                    
                    {/* Live ETA & Timer Badges */}
                    {(sending || hasRun) && (
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap text-xs">
                        {sending ? (
                          <>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-mono flex items-center gap-1.5 py-1 px-2.5">
                              <Clock className="h-3.5 w-3.5 animate-spin" />
                              <span>Elapsed: <strong>{etaInfo.elapsedText}</strong></span>
                            </Badge>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-mono flex items-center gap-1.5 py-1 px-2.5">
                              <Timer className="h-3.5 w-3.5" />
                              <span>ETA: <strong>{etaInfo.etaText}</strong></span>
                            </Badge>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-mono flex items-center gap-1.5 py-1 px-2.5">
                              <Zap className="h-3.5 w-3.5" />
                              <span>Speed: <strong>{etaInfo.speedText}</strong></span>
                            </Badge>
                          </>
                        ) : (
                          <>
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 font-mono flex items-center gap-1.5 py-1 px-2.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>Total Duration: <strong>{etaInfo.elapsedText}</strong></span>
                            </Badge>
                            {etaInfo.speedText && (
                              <Badge variant="outline" className="bg-muted text-muted-foreground font-mono flex items-center gap-1.5 py-1 px-2.5">
                                <Zap className="h-3.5 w-3.5 text-amber-500" />
                                <span>Avg Speed: <strong>{etaInfo.speedText}</strong></span>
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {sending && (
                      <Button variant="destructive" size="sm" onClick={stopSending}>
                        <Square className="mr-1 h-3.5 w-3.5" />
                        Stop Campaign
                      </Button>
                    )}
                    {!sending && hasRun && unsentRows.length > 0 && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white font-medium"
                          onClick={() => sendBulk(true, true)}
                        >
                          <Play className="mr-1 h-3.5 w-3.5" />
                          Resume Remaining ({unsentRows.length})
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportUnsentCsv}>
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Export Unsent ({unsentRows.length})
                        </Button>
                      </>
                    )}
                    {!sending && hasRun && bulkJobIdRef.current && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/sent/campaign/${bulkJobIdRef.current}`}>
                          <BarChart2 className="mr-1.5 h-3.5 w-3.5 text-primary" />
                          View Analytics
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Successful</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-foreground">{stats.sent}</span>
                      <span className="text-xs text-muted-foreground">emails</span>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-yellow-500/5 border-yellow-500/20 p-3">
                    <div className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 uppercase">Skipped / Sent</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-yellow-600 dark:text-yellow-400">{stats.skipped}</span>
                      <span className="text-xs text-muted-foreground">duplicate</span>
                    </div>
                  </div>

                  <div className={`rounded-lg border p-3 ${stats.failed > 0 ? "border-destructive/20 bg-destructive/5" : "bg-muted/40"}`}>
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Failed</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className={`text-2xl font-extrabold ${stats.failed > 0 ? "text-destructive" : "text-foreground"}`}>{stats.failed}</span>
                      <span className="text-xs text-muted-foreground">emails</span>
                    </div>
                  </div>

                  {attachCertificate && (
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Certificates</div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-foreground">{stats.certs}</span>
                        <span className="text-xs text-muted-foreground">attached</span>
                      </div>
                    </div>
                  )}

                  {attachLetters && (
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Letters</div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-foreground">{stats.letters}</span>
                        <span className="text-xs text-muted-foreground">attached</span>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border bg-muted/40 p-3 col-span-2 sm:col-span-1">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Processed</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-foreground">
                        {validRecipients > 0
                          ? `${Math.min(100, Math.round(((stats.sent + stats.failed + stats.skipped) / validRecipients) * 100))}%`
                          : "0%"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({stats.sent + stats.failed + stats.skipped}/{validRecipients})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & ETA subtitle */}
                <div className="space-y-1.5">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{
                        width: `${validRecipients > 0 ? Math.min(100, ((stats.sent + stats.failed + stats.skipped) / validRecipients) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground font-mono">
                    <span>{etaInfo.remaining > 0 ? `${etaInfo.remaining} recipients remaining` : "All recipients processed"}</span>
                    {sending && <span>Estimated remaining: <strong className="text-foreground">{etaInfo.etaText}</strong></span>}
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
              {!logsCleared && stats.failureDetails.length > 0 && (
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
                            {failure.bothFailed ? (
                              <div className="mt-1 space-y-1.5 font-sans">
                                <div className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">Dual SMTP Connection Failures</div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="rounded border border-red-500/10 bg-red-500/5 p-2 text-xs">
                                    <div className="font-semibold text-red-500 mb-0.5">Primary SMTP Error:</div>
                                    <span className="font-mono leading-relaxed text-destructive break-all">{failure.primaryError}</span>
                                  </div>
                                  <div className="rounded border border-orange-500/10 bg-orange-500/5 p-2 text-xs">
                                    <div className="font-semibold text-orange-500 mb-0.5">Fallback SMTP Error:</div>
                                    <span className="font-mono leading-relaxed text-orange-600 dark:text-orange-400 break-all">{failure.fallbackError}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs font-mono text-destructive bg-destructive/5 border border-destructive/10 rounded px-2 py-1 leading-relaxed break-all">
                                {failure.reason}
                              </p>
                            )}
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
                  <CardDescription>Configure batching, anti-duplicate protection, and dispatch.</CardDescription>
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

                  {/* Batch size and Delay settings */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="batchSize">Batch size</Label>
                      <Input
                        id="batchSize"
                        type="number"
                        min={5}
                        max={100}
                        value={batchSize}
                        disabled={sending}
                        onChange={(event) => setBatchSize(Number(event.target.value))}
                      />
                      <p className="text-[10px] text-muted-foreground">Emails per request (prevents 300s timeout).</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="delay">Delay (ms)</Label>
                      <Input
                        id="delay"
                        type="number"
                        min={0}
                        value={delayMs}
                        disabled={sending}
                        onChange={(event) => setDelayMs(Number(event.target.value))}
                      />
                      <p className="text-[10px] text-muted-foreground">Delay between emails.</p>
                    </div>
                  </div>

                  {/* Anti Duplicate Toggle */}
                  <div className="flex items-center justify-between rounded-md border bg-muted/20 p-2.5 text-xs">
                    <div className="space-y-0.5 pr-2">
                      <Label htmlFor="antiDuplicate" className="font-semibold flex items-center gap-1.5 cursor-pointer">
                        <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                        Skip Already Sent
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Never re-sends emails to applicants who already received this template.
                      </p>
                    </div>
                    <input
                      id="antiDuplicate"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                      checked={skipAlreadySent}
                      disabled={sending}
                      onChange={(e) => setSkipAlreadySent(e.target.checked)}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    {hasRun && unsentRows.length > 0 && !sending && (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                        onClick={() => sendBulk(true, true)}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Resume Remaining ({unsentRows.length} unsent)
                      </Button>
                    )}

                    <Button className="w-full" disabled={!canSend || sending || validationLoading} onClick={runPreSendValidation}>
                      {validationLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Validating CSV...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Verify & Send ({validRecipients})
                        </>
                      )}
                    </Button>

                    <Button variant="outline" className="w-full border-primary/30 hover:bg-primary/5 text-primary" disabled={!canSend || sending} onClick={() => sendBulk(true, false)}>
                      {sending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending Campaign in Batches...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Send Direct (Skip Pre-Check)
                        </>
                      )}
                    </Button>

                    {/* Test Mail Send */}
                    <div className="relative my-1">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-card px-2 text-[10px] text-muted-foreground uppercase tracking-wider">or</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-xs border-dashed"
                      disabled={!fullTemplate || sending}
                      onClick={() => setTestMailOpen(true)}
                    >
                      <FlaskConical className="mr-2 h-3.5 w-3.5 text-primary" />
                      Send Test Email
                    </Button>

                    {hasRun && unsentRows.length > 0 && (
                      <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={exportUnsentCsv}>
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Export Unsent CSV ({unsentRows.length})
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Console log display */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Live Dispatch Logs</CardTitle>
                    <CardDescription className="text-[11px]">Real-time batch events</CardDescription>
                  </div>
                  {!logsCleared && logs.length > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2" onClick={() => setLogsCleared(true)}>
                      Clear Logs
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="max-h-[360px] min-h-[160px] overflow-y-auto rounded-md border bg-zinc-950 p-3 font-mono text-[11px] text-zinc-200 shadow-inner divide-y divide-zinc-900">
                    {logsCleared || logs.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-zinc-500 py-10">
                        Console is empty. Start the run to see live feedback.
                      </div>
                    ) : (
                      logs.map((log, index) => {
                        const isFailed = log.type === "failed" || log.type === "certificate_error" || log.type === "qr_error";
                        const isBothFailed = log.type === "failed" && log.bothFailed;
                        const isSkipped = log.type === "skipped";
                        return (
                          <div key={index} className={`py-2 first:pt-0 last:pb-0 space-y-1 ${isBothFailed ? "bg-red-500/10 border border-red-500/20 px-2 rounded-md my-1" : isSkipped ? "bg-yellow-500/5 px-2 rounded-md my-0.5" : ""}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-zinc-300 font-semibold">{log.email || log.recipient || "System Log"}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                                isBothFailed
                                  ? "bg-red-600/35 text-red-100 border border-red-500/50"
                                  : isFailed 
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                    : isSkipped
                                      ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                      : log.type === "sent" 
                                        ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}>
                                {isBothFailed ? "❌❌ Both Failed" : isSkipped ? "⏭️ Skipped (Sent)" : log.type}
                              </span>
                            </div>
                            {isBothFailed ? (
                              <div className="mt-1 space-y-1 pl-1 border-l-2 border-red-500/50 leading-normal text-[10px] text-red-300 font-sans">
                                <div><span className="font-semibold text-red-400">Primary:</span> {log.primaryError}</div>
                                <div><span className="font-semibold text-orange-400">Fallback:</span> {log.fallbackError}</div>
                              </div>
                            ) : log.reason ? (
                              <div className="text-yellow-400/90 whitespace-pre-wrap pl-1 border-l-2 border-yellow-500/50 mt-1 leading-normal font-sans">
                                Note: {log.reason}
                              </div>
                            ) : log.error ? (
                              <div className="text-red-400 whitespace-pre-wrap pl-1 border-l-2 border-red-500/50 mt-1 leading-normal font-sans">
                                Reason: {log.error}
                              </div>
                            ) : null}
                            {log.total && <div className="text-zinc-500">Initiated batch: {log.total} recipients</div>}
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
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle>Recipients Preview</CardTitle>
            <CardDescription>Preview of parsed data ({file?.name ?? "pasted emails"}). Highlighted rows represent duplicate emails.</CardDescription>
          </div>
          {duplicateEmailsSet.size > 0 && (
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/10 border-yellow-500/20">
                {duplicateEmailsSet.size} duplicates
              </Badge>
              <Button variant="outline" size="sm" onClick={deduplicateKeepFirst}>
                Keep First
              </Button>
              <Button variant="outline" size="sm" onClick={deduplicateKeepLast}>
                Keep Last
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {parsingCsv ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Parsing CSV...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((key) => <TableHead key={key}>{key}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 15).map((row, index) => {
                  const isDuplicate = row.email && duplicateEmailsSet.has(row.email.toLowerCase().trim());
                  return (
                    <TableRow key={index} className={isDuplicate ? "bg-yellow-500/5 dark:bg-yellow-500/10 hover:bg-yellow-500/10" : ""}>
                      {columns.map((column) => <TableCell key={column}>{row[column]}</TableCell>)}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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

      <Dialog open={letterPreviewOpen} onOpenChange={setLetterPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Personalized Letter Preview (Localhost Generated)
            </DialogTitle>
          </DialogHeader>
          {letterPreviewPdf && (
            <iframe
              title="Personalized letter preview"
              className="h-[720px] w-full rounded-md border shadow-inner"
              src={`data:application/pdf;base64,${letterPreviewPdf}`}
            />
          )}
          <DialogFooter>
            <Button onClick={() => setLetterPreviewOpen(false)}>Close Preview</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Pre-Send CSV Validation Report
            </DialogTitle>
            <DialogDescription>
              We validated your list. Review the summary and choose how to proceed.
            </DialogDescription>
          </DialogHeader>

          {validationReport && (
            <div className="space-y-4 py-2">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-muted/40">
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-muted-foreground font-medium">Total Rows</div>
                    <div className="text-xl font-bold mt-1">{validationReport.totalRows}</div>
                  </CardContent>
                </Card>
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">Valid</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {validationReport.validCount}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-500/20 bg-red-500/5">
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium">Errors</div>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {validationReport.invalidEmails.length + validationReport.invalidMxDomains.length}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-yellow-500/20 bg-yellow-500/5">
                  <CardContent className="p-3 text-center">
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Already Sent</div>
                    <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                      {validationReport.alreadySent.length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Toggle Options */}
              <div className="flex flex-col gap-2 p-3 rounded-md border bg-muted/20 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkSentHistory}
                    onChange={(e) => {
                      setCheckSentHistory(e.target.checked);
                      setValidationReport((prev: any) => {
                        if (!prev) return prev;
                        const invalidDomainsSet = new Set(prev.invalidMxDomains.map((d: string) => d.toLowerCase()));
                        const alreadySentSet = new Set(prev.alreadySent.map((e: string) => e.toLowerCase()));
                        const finalCount = rows.filter((row) => {
                          const email = String(row.email || "").toLowerCase().trim();
                          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
                          const parts = email.split("@");
                          const domain = parts[parts.length - 1];
                          if (invalidDomainsSet.has(domain)) return false;
                          if (e.target.checked && alreadySentSet.has(email)) return false;
                          return true;
                        }).length;
                        return { ...prev, finalCount };
                      });
                    }}
                  />
                  <span>Exclude addresses that already received emails (sent history cross-reference)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkSentGlobally}
                    onChange={(e) => {
                      setCheckSentGlobally(e.target.checked);
                      toast.info("Sent history scope changed. Re-validating...");
                      setTimeout(() => {
                        runPreSendValidation();
                      }, 100);
                    }}
                  />
                  <span>Check sent history globally (uncheck to check by campaign template only)</span>
                </label>
              </div>

              {/* Ready to send count */}
              <div className="p-3 rounded-md border bg-green-500/10 text-green-800 dark:text-green-200 border-green-500/20 text-sm font-semibold flex items-center justify-between">
                <span>Final Delivery Count:</span>
                <span className="text-lg font-bold">{validationReport.finalCount} emails ready</span>
              </div>

              {/* Warnings details */}
              <div className="space-y-3">
                {/* 1. Missing required cols */}
                {validationReport.requiredColsMissing.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Missing Required Columns
                    </div>
                    <div className="bg-red-500/5 border border-red-500/10 p-2.5 rounded text-muted-foreground leading-relaxed">
                      Your CSV is missing these columns mapped in your template:{" "}
                      <span className="font-mono text-red-600 dark:text-red-400">
                        {validationReport.requiredColsMissing.join(", ")}
                      </span>. Please add them or map different columns first.
                    </div>
                  </div>
                )}

                {/* 2. Format errors or null bytes */}
                {validationReport.invalidEmails.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <div className="font-semibold text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Formatting Errors ({validationReport.invalidEmails.length})
                    </div>
                    <div className="max-h-36 overflow-y-auto border rounded divide-y bg-background font-mono text-[10px]">
                      {validationReport.invalidEmails.map((err: any, idx: number) => (
                        <div key={idx} className="p-2 flex items-center justify-between gap-2 hover:bg-muted/10">
                          <span className="text-foreground truncate">{err.email}</span>
                          <div className="flex gap-2 items-center shrink-0">
                            <span className="text-zinc-500 font-medium">Row {err.row}</span>
                            <span className="bg-red-500/10 text-red-400 px-1 py-0.5 rounded border border-red-500/20 text-[9px] uppercase font-semibold">
                              {err.reason}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. MX Domain check failures */}
                {validationReport.invalidMxDomains.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <div className="font-semibold text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Invalid / Unresolvable Email Domains ({validationReport.invalidMxDomains.length})
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded p-2 bg-background flex flex-wrap gap-1.5">
                      {validationReport.invalidMxDomains.map((domain: string, idx: number) => (
                        <Badge key={idx} variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/20 font-mono text-[10px] hover:bg-red-500/10">
                          {domain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Duplicates report */}
                {validationReport.duplicates.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    <div className="font-semibold text-yellow-500 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Duplicate Recipients inside CSV ({validationReport.duplicates.length})
                    </div>
                    <div className="max-h-36 overflow-y-auto border rounded divide-y bg-background font-mono text-[10px]">
                      {validationReport.duplicates.map((dup: any, idx: number) => (
                        <div key={idx} className="p-2 flex items-center justify-between gap-2 hover:bg-muted/10">
                          <span className="text-foreground truncate">{dup.email}</span>
                          <span className="text-zinc-500 shrink-0 font-medium">Rows: {dup.rows.join(", ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Already Sent emails */}
                {validationReport.alreadySent.length > 0 && checkSentHistory && (
                  <div className="space-y-1.5 text-xs">
                    <div className="font-semibold text-orange-500 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Already Sent Recipients ({validationReport.alreadySent.length})
                    </div>
                    <div className="max-h-32 overflow-y-auto border rounded p-2 bg-background flex flex-wrap gap-1.5 font-mono text-[10px]">
                      {validationReport.alreadySent.map((email: string, idx: number) => (
                        <span key={idx} className="bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded px-1.5 py-0.5">
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Fix CSV First
            </Button>
            <Button
              disabled={!canSend || (validationReport && validationReport.finalCount === 0) || (validationReport && validationReport.requiredColsMissing.length > 0)}
              onClick={proceedWithValidSend}
              className="bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              Proceed with Valid Only
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Mail Send Dialog */}
      <Dialog open={testMailOpen} onOpenChange={setTestMailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Send Test Email
            </DialogTitle>
            <DialogDescription>
              Send the current template (with first-row merge values) to specific addresses before running the full campaign.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <Label className="text-sm font-medium" htmlFor="testMailAddresses">
              Recipient addresses
            </Label>
            <Textarea
              id="testMailAddresses"
              placeholder={"you@example.com\ncolleague@example.com"}
              value={testMailAddresses}
              onChange={(e) => setTestMailAddresses(e.target.value)}
              className="min-h-[100px] font-mono text-xs resize-y"
            />
            <p className="text-[11px] text-muted-foreground">
              One per line, or comma / semicolon separated. The subject will be prefixed with <span className="font-mono bg-muted px-1 rounded">[TEST]</span>. Merge fields use the first CSV row&apos;s values.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setTestMailOpen(false); setTestMailAddresses(""); }}>
              Cancel
            </Button>
            <Button
              disabled={testMailSending || !testMailAddresses.trim()}
              onClick={sendTestMail}
              className="bg-primary text-primary-foreground"
            >
              {testMailSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Send Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
