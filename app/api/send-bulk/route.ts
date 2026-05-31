import Papa from "papaparse";
import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { sendEmailWithFallback } from "@/lib/mailer";
import { applyMergeFields, jsonError } from "@/lib/utils";
import { injectTracking } from "@/lib/tracking";
import { logAudit } from "@/lib/audit";
import { fromJson, toJson } from "@/lib/json-fields";
import { prisma } from "@/lib/prisma";
import { detectQrPlaceholders, replaceQrPlaceholders, type QrFieldConfig } from "@/lib/qr";
import { generateCertificate, parseCertFields, type CertField } from "@/lib/certificate";

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
    qrFieldConfigs: fromJson<QrFieldConfig[]>(String(form.get("qrFieldConfigs") || "[]"), []),
    certificateConfig: fromJson<CertificateConfig | null>(String(form.get("certificateConfig") || "null"), null)
  };
  console.log("[send-bulk] body keys:", Object.keys(body));
  console.log("[send-bulk] qrFieldConfigs:", JSON.stringify(body.qrFieldConfigs));
  console.log("[send-bulk] templateId:", body.templateId);

  const { templateId, columnMap, qrConfig, qrFieldConfigs: requestQrFieldConfigs = [], certificateConfig } = body;
  const delayMs = Number.isFinite(body.delayMs) && body.delayMs > 0 ? body.delayMs : 0;
  const template = await prisma.template.findFirst({ where: { id: templateId, userId: String(user._id) } });
  if (!template) return jsonError("Template not found", 404);
  const certTemplate = certificateConfig?.templateId
    ? await prisma.certificateTemplate.findFirst({ where: { id: certificateConfig.templateId, userId: String(user._id) } })
    : null;
  if (certificateConfig?.templateId && !certTemplate) return jsonError("Certificate template not found", 404);
  const certFields = certTemplate ? parseCertFields(certTemplate.fields) : [];

  const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true });
  const rows = parsed.data.filter((row) => row.email);
  if (!rows.length) return jsonError("CSV must include at least one row with an email column", 400, "CSV_EMPTY");
  await logAudit("email.bulk_started", String(user._id), { recipientCount: rows.length, templateId }, undefined, req);

  const bulkJobId = crypto.randomUUID();

  const stream = new ReadableStream({
    async start(controller) {
      let failedQrCount = 0;
      let certificateCount = 0;
      let failedCertificateCount = 0;
      try {
        controller.enqueue(encoder.encode(`${toJson({ type: "started", total: rows.length, bulkJobId })}\n`));
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
          const attachments: Array<{ name: string; content: Buffer; contentType: string }> = [];
          if (certificateConfig && certTemplate) {
            try {
              const certMergeData = buildCertificateMergeData(certificateConfig, certFields, row);
              const pdfBuffer = await generateCertificate({
                pdfBase64: certTemplate.pdfBase64,
                fields: certFields,
                mergeData: certMergeData
              });
              attachments.push({
                name: `${certTemplate.name.replace(/[^\w.-]+/g, "_") || "certificate"}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf"
              });
              certificateCount += 1;
              await prisma.certificateGeneration.create({
                data: {
                  templateId: certificateConfig.templateId,
                  userId: String(user._id),
                  recipientEmail: row.email,
                  recipientName: row.PARTICIPANT_NAME || row.name || row.NAME || "",
                  mergeData: toJson(certMergeData),
                  status: "attached",
                  generatedAt: new Date()
                }
              });
            } catch (certError) {
              failedCertificateCount += 1;
              console.error(`Certificate generation failed for ${recipient.email}:`, certError);
              await prisma.certificateGeneration.create({
                data: {
                  templateId: certificateConfig.templateId,
                  userId: String(user._id),
                  recipientEmail: row.email,
                  recipientName: row.PARTICIPANT_NAME || row.name || row.NAME || "",
                  status: "failed",
                  errorMsg: certError instanceof Error ? certError.message : String(certError)
                }
              });
              controller.enqueue(encoder.encode(`${toJson({ type: "certificate_error", recipient: row.email, error: certError instanceof Error ? certError.message : String(certError) })}\n`));
            }
          }
          const payload = {
            to: [row.email],
            subject,
            bodyHtml,
            attachments
          };
          try {
            const email = await prisma.email.create({
              data: {
                userId: String(user._id),
                toAddresses: toJson(payload.to)!,
                subject: payload.subject,
                bodyHtml: payload.bodyHtml,
                attachments: toJson(attachments.map((attachment) => ({ name: attachment.name, size: attachment.content.length, mimeType: attachment.contentType }))),
                status: "sending",
                isBulk: true,
                bulkJobId,
                sentAt: new Date(),
                templateId,
                templateName: template.name,
                mergeData: toJson(values)
              }
            });
            
            const result = await sendEmailWithFallback({
              userId: String(user._id),
              to: payload.to,
              subject: payload.subject,
              html: injectTracking(payload.bodyHtml, email.id, true),
              attachments: payload.attachments,
              emailId: email.id
            });

            if (result.success) {
              await prisma.email.update({
                where: { id: email.id },
                data: { status: "sent", usedFallbackSmtp: result.usedFallback }
              });
              await logAudit("email.sent", String(user._id), { to: payload.to, subject: payload.subject, isBulk: true, usedFallback: result.usedFallback }, email.id, req);
              controller.enqueue(encoder.encode(`${toJson({ type: "sent", index, email: row.email, failedQrCount, certificateCount, failedCertificateCount })}\n`));
            } else {
              await prisma.email.update({
                where: { id: email.id },
                data: { status: "failed", errorMsg: result.error, usedFallbackSmtp: result.usedFallback }
              });
              await logAudit("email.failed", String(user._id), { to: payload.to, subject: payload.subject, error: result.error, isBulk: true, usedFallback: result.usedFallback }, email.id, req);
              controller.enqueue(encoder.encode(`${toJson({ 
                type: "failed", 
                index, 
                email: row.email, 
                error: result.error, 
                bothFailed: result.bothFailed,
                primaryError: result.primaryError,
                fallbackError: result.fallbackError,
                failedQrCount, 
                certificateCount, 
                failedCertificateCount 
              })}\n`));
            }
          } catch (error: any) {
            console.error(`Bulk send loop iteration error for recipient ${row.email}:`, error);
            controller.enqueue(encoder.encode(`${toJson({ type: "failed", index, email: row.email, error: error.message, failedQrCount, certificateCount, failedCertificateCount })}\n`));
          }
          if (index < rows.length - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        await logAudit(req.signal.aborted ? "email.bulk_stopped" : "email.bulk_completed", String(user._id), { recipientCount: rows.length, templateId }, undefined, req);
        if (certTemplate) {
          await logAudit("certificate.bulk_generated", String(user._id), { templateName: certTemplate.name, count: certificateCount, failed: failedCertificateCount }, undefined, req);
        }
        controller.enqueue(encoder.encode(`${toJson({ type: req.signal.aborted ? "stopped" : "completed", bulkJobId, failedQrCount, certificateCount, failedCertificateCount })}\n`));
      } catch (error) {
        console.error("[send-bulk] stream failed:", error);
        controller.enqueue(encoder.encode(`${toJson({ type: "failed", error: error instanceof Error ? error.message : String(error), failedQrCount, certificateCount, failedCertificateCount })}\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache"
    }
  });
}

type CertificateConfig = {
  templateId: string;
  fieldMappings: Record<string, string>;
  fallbackValues?: Record<string, string>;
};

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

function buildCertificateMergeData(config: CertificateConfig, fields: CertField[], row: Record<string, string>) {
  const fieldDefaults = new Map(fields.map((field) => [field.placeholder, field.defaultValue]));
  return Object.fromEntries(Object.entries(config.fieldMappings || {}).map(([placeholder, csvColumn]) => [
    placeholder,
    row[csvColumn] || config.fallbackValues?.[placeholder] || fieldDefaults.get(placeholder) || ""
  ]));
}
