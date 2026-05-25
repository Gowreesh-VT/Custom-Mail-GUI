import Papa from "papaparse";
import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { sendMailForUser } from "@/lib/mailer";
import { applyMergeFields, jsonError } from "@/lib/utils";
import { injectTracking } from "@/lib/tracking";
import { logAudit } from "@/lib/audit";
import { fromJson, toJson } from "@/lib/json-fields";
import { prisma } from "@/lib/prisma";
import { detectQrPlaceholders, replaceQrPlaceholders, type QrFieldConfig } from "@/lib/qr";

const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);
  const form = await req.formData();
  const file = form.get("csv");
  if (!(file instanceof File)) return jsonError("CSV file is required", 400);
  const body = {
    templateId: String(form.get("templateId") || ""),
    delayMs: Number(form.get("delayMs") || 500),
    columnMap: fromJson<Record<string, string>>(String(form.get("columnMap") || "{}"), {}),
    qrConfig: fromJson<Record<string, any>>(String(form.get("qrConfig") || "{}"), {}),
    qrFieldConfigs: fromJson<QrFieldConfig[]>(String(form.get("qrFieldConfigs") || "[]"), [])
  };
  console.log("[send-bulk] body keys:", Object.keys(body));
  console.log("[send-bulk] qrFieldConfigs:", JSON.stringify(body.qrFieldConfigs));
  console.log("[send-bulk] templateId:", body.templateId);

  const { templateId, columnMap, delayMs, qrConfig, qrFieldConfigs: requestQrFieldConfigs = [] } = body;
  const template = await prisma.template.findFirst({ where: { id: templateId, userId: String(user._id) } });
  if (!template) return jsonError("Template not found", 404);

  const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true });
  const rows = parsed.data.filter((row) => row.email);
  if (!rows.length) return jsonError("CSV must include at least one row with an email column", 400, "CSV_EMPTY");
  await logAudit("email.bulk_started", String(user._id), { recipientCount: rows.length, templateId }, undefined, req);

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`${toJson({ type: "started", total: rows.length })}\n`));
      let failedQrCount = 0;
      for (let index = 0; index < rows.length; index++) {
        if (req.signal.aborted) break;
        const row = rows[index];
        const values = valuesFromMap(row, columnMap);
        const subject = applyMergeFields(template.subjectLine || template.name, values);
        let bodyHtml = applyTextMergeFields(template.bodyHtml, values);
        const recipient = { email: row.email, data: { ...row, ...values } };
        const qrFieldConfigs = buildQrFieldConfigs(requestQrFieldConfigs, qrConfig, bodyHtml);
        console.log("[send-bulk] recipient:", recipient.email);
        console.log("[send-bulk] html before QR replace:", bodyHtml.includes("{{qr_") ? "HAS QR PLACEHOLDERS" : "no qr placeholders");
        console.log("[send-bulk] qrFieldConfigs length:", qrFieldConfigs?.length ?? 0);
        if (qrFieldConfigs.length) {
          bodyHtml = await replaceQrPlaceholders(bodyHtml, qrFieldConfigs, recipient, String(user._id), {
            onGenerated: (imageUrl) => {
              console.log(`[send-bulk] QR generated for ${recipient.email}: ${imageUrl}`);
            },
            onError: (error, config) => {
              failedQrCount += 1;
              console.error(`[send-bulk] QR generation failed for ${recipient.email}:`, error);
              controller.enqueue(encoder.encode(`${toJson({ type: "qr_error", recipient: row.email, placeholder: config.placeholderName, error: error.message })}\n`));
            }
          });
        }
        const payload = {
          to: [row.email],
          subject,
          bodyHtml
        };
        try {
          const email = await prisma.email.create({
            data: {
              userId: String(user._id),
              toAddresses: toJson(payload.to)!,
              subject: payload.subject,
              bodyHtml: payload.bodyHtml,
              status: "sent",
              isBulk: true,
              sentAt: new Date(),
              templateId,
              templateName: template.name,
              mergeData: toJson(values)
            }
          });
          await sendMailForUser(user, { ...payload, bodyHtml: injectTracking(payload.bodyHtml, email.id, true) });
          await logAudit("email.sent", String(user._id), { to: payload.to, subject: payload.subject, isBulk: true }, email.id, req);
          controller.enqueue(encoder.encode(`${toJson({ type: "sent", index, email: row.email, failedQrCount })}\n`));
        } catch (error: any) {
          const email = await prisma.email.create({
            data: {
              userId: String(user._id),
              toAddresses: toJson(payload.to)!,
              subject: payload.subject,
              bodyHtml: payload.bodyHtml,
              status: "failed",
              errorMsg: error.message,
              isBulk: true,
              sentAt: new Date(),
              templateId,
              templateName: template.name,
              mergeData: toJson(values)
            }
          });
          await logAudit("email.failed", String(user._id), { to: payload.to, subject: payload.subject, error: error.message, isBulk: true }, email.id, req);
          controller.enqueue(encoder.encode(`${toJson({ type: "failed", index, email: row.email, error: error.message, failedQrCount })}\n`));
        }
        if (index < rows.length - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      await logAudit(req.signal.aborted ? "email.bulk_stopped" : "email.bulk_completed", String(user._id), { recipientCount: rows.length, templateId }, undefined, req);
      controller.enqueue(encoder.encode(`${toJson({ type: req.signal.aborted ? "stopped" : "completed", failedQrCount })}\n`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache"
    }
  });
}

function valuesFromMap(row: Record<string, string>, columnMap: Record<string, string>) {
  return Object.fromEntries(Object.entries(columnMap).map(([field, column]) => [field, row[column] || ""]));
}

function applyTextMergeFields(input: string, data: Record<string, string>) {
  return input.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (token, key) => {
    if (/^qr_[a-z_]+$/.test(key)) return token;
    return data[key] ?? "";
  });
}

function buildQrFieldConfigs(requestQrFieldConfigs: QrFieldConfig[], qrConfig: Record<string, any>, html: string): QrFieldConfig[] {
  const byPlaceholder = new Map(requestQrFieldConfigs.map((config) => [config.placeholderName, config]));
  return detectQrPlaceholders(html).map((placeholder) => ({
    placeholderName: placeholder,
    ...(byPlaceholder.get(placeholder) || {}),
    ...(qrConfig[placeholder] || {})
  }));
}
