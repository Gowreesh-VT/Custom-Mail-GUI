import Papa from "papaparse";
import { type NextRequest } from "next/server";

export const maxDuration = 300; // Allow up to 5 minutes for bulk sending
import { requireUser } from "@/lib/api";
import { sendEmailWithFallback } from "@/lib/mailer";
import { applyMergeFields, jsonError } from "@/lib/utils";
import { injectTracking } from "@/lib/tracking";
import { logAudit } from "@/lib/audit";
import { fromJson, toJson } from "@/lib/json-fields";
import { prisma } from "@/lib/prisma";
import { detectQrPlaceholders, replaceQrPlaceholders, type QrFieldConfig } from "@/lib/qr";
import { generateCertificate, parseCertFields, type CertField } from "@/lib/certificate";
import { generateLetterAttachmentForRow, type LetterConfig } from "@/lib/letter-generator";
import { sendPushToUser } from "@/lib/push";


const encoder = new TextEncoder();

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);
  const form = await req.formData();
  const file = form.get("csv");
  const rowsJson = form.get("rowsJson");

  let rows: Record<string, string>[] = [];

  if (typeof rowsJson === "string" && rowsJson.trim().length > 0) {
    try {
      rows = JSON.parse(rowsJson);
    } catch {
      return jsonError("Invalid rowsJson format", 400);
    }
  } else if (file instanceof File) {
    const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true });
    rows = parsed.data.filter((row) => row.email);
  } else {
    return jsonError("CSV file or rowsJson is required", 400);
  }

  const defaultDocxFile = form.get("defaultDocx") as File | null;
  const entrepreneurshipDocxFile = form.get("entrepreneurshipDocx") as File | null;

  const templateBuffers: { defaultDocx?: Buffer; entrepreneurshipDocx?: Buffer } = {};
  if (defaultDocxFile && defaultDocxFile.size > 0) {
    templateBuffers.defaultDocx = Buffer.from(await defaultDocxFile.arrayBuffer());
  }
  if (entrepreneurshipDocxFile && entrepreneurshipDocxFile.size > 0) {
    templateBuffers.entrepreneurshipDocx = Buffer.from(await entrepreneurshipDocxFile.arrayBuffer());
  }

  const body = {
    templateId: String(form.get("templateId") || ""),
    delayMs: Number(form.get("delayMs") || 500),
    columnMap: fromJson<Record<string, string>>(String(form.get("columnMap") || "{}"), {}),
    qrConfig: fromJson<Record<string, any>>(String(form.get("qrConfig") || "{}"), {}),
    qrFieldConfigs: fromJson<QrFieldConfig[]>(String(form.get("qrFieldConfigs") || "[]"), []),
    certificateConfig: fromJson<CertificateConfig | null>(String(form.get("certificateConfig") || "null"), null),
    letterConfig: fromJson<LetterConfig | null>(String(form.get("letterConfig") || "null"), null),
    bulkJobId: String(form.get("bulkJobId") || "").trim(),
    skipAlreadySent: form.get("skipAlreadySent") !== "false",
    startIndex: Number(form.get("startIndex") || 0),
    isLastBatch: form.get("isLastBatch") === "true" || form.get("isLastBatch") === undefined
  };

  const { templateId, columnMap, qrConfig, qrFieldConfigs: requestQrFieldConfigs = [], certificateConfig, letterConfig, skipAlreadySent, startIndex, isLastBatch } = body;
  const delayMs = Number.isFinite(body.delayMs) && body.delayMs > 0 ? body.delayMs : 0;
  const template = await prisma.template.findFirst({ where: { id: templateId, userId: String(user._id) } });
  if (!template) return jsonError("Template not found", 404);
  const certTemplate = certificateConfig?.templateId
    ? await prisma.certificateTemplate.findFirst({ where: { id: certificateConfig.templateId, userId: String(user._id) } })
    : null;
  if (certificateConfig?.templateId && !certTemplate) return jsonError("Certificate template not found", 404);
  const certFields = certTemplate ? parseCertFields(certTemplate.fields) : [];

  if (!rows.length) return jsonError("CSV must include at least one row with an email column", 400, "CSV_EMPTY");
  
  const bulkJobId = body.bulkJobId || crypto.randomUUID();

  if (startIndex === 0) {
    await logAudit("email.bulk_started", String(user._id), { recipientCount: rows.length, templateId, bulkJobId }, undefined, req);
  }

  // Pre-fetch sent emails for this user and template to skip already sent recipients
  const sentSet = new Set<string>();
  if (skipAlreadySent) {
    const sentRecords = await prisma.email.findMany({
      where: {
        userId: String(user._id),
        status: "sent",
        ...(templateId ? { templateId } : {})
      },
      select: { toAddresses: true }
    });
    for (const record of sentRecords) {
      try {
        const parsedTo = JSON.parse(record.toAddresses);
        if (Array.isArray(parsedTo)) {
          parsedTo.forEach((addr: string) => sentSet.add(String(addr || "").trim().toLowerCase()));
        }
      } catch {
        if (typeof record.toAddresses === "string") {
          record.toAddresses
            .split(",")
            .forEach((addr: string) => sentSet.add(addr.trim().toLowerCase()));
        }
      }
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      let failedQrCount = 0;
      let certificateCount = 0;
      let failedCertificateCount = 0;
      let letterCount = 0;
      let failedLetterCount = 0;
      let successCount = 0;
      let failCount = 0;
      let skippedCount = 0;
      try {
        controller.enqueue(encoder.encode(`${toJson({ type: "started", total: rows.length, startIndex, bulkJobId })}\n`));
        for (let index = 0; index < rows.length; index++) {
          if (req.signal.aborted) break;
          const row = rows[index];
          const globalIndex = startIndex + index;
          const emailAddr = String(row.email || "").trim().toLowerCase();

          // Check if already sent and should be skipped
          if (skipAlreadySent && sentSet.has(emailAddr)) {
            skippedCount++;
            controller.enqueue(encoder.encode(`${toJson({
              type: "skipped",
              index: globalIndex,
              email: row.email,
              reason: "Already sent in this template/campaign",
              failedQrCount,
              certificateCount,
              failedCertificateCount,
              letterCount,
              failedLetterCount,
              skippedCount
            })}\n`));
            continue;
          }

          const values = valuesFromMap(row, columnMap);
          const subject = applyMergeFields(template.subjectLine || template.name, values);
          let bodyHtml = applyTextMergeFields(template.bodyHtml, values);
          const recipient = { email: row.email, data: { ...row, ...values } };
          const qrFieldConfigs = buildQrFieldConfigs(requestQrFieldConfigs, qrConfig, bodyHtml);
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

          // Handle Personalized Letter / Local PDF Attachments
          if (letterConfig && letterConfig.enabled) {
            try {
              const letterAttachment = await generateLetterAttachmentForRow(row, letterConfig, templateBuffers);
              attachments.push(letterAttachment);
              letterCount += 1;
            } catch (letterError: any) {
              failedLetterCount += 1;
              console.error(`Letter attachment failed for ${recipient.email}:`, letterError);
              controller.enqueue(encoder.encode(`${toJson({
                type: "letter_error",
                recipient: row.email,
                error: letterError instanceof Error ? letterError.message : String(letterError)
              })}\n`));
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
              successCount++;
              sentSet.add(emailAddr);
              await prisma.email.update({
                where: { id: email.id },
                data: { status: "sent", usedFallbackSmtp: result.usedFallback }
              });
              await logAudit("email.sent", String(user._id), { to: payload.to, subject: payload.subject, isBulk: true, usedFallback: result.usedFallback }, email.id, req);
              controller.enqueue(encoder.encode(`${toJson({ type: "sent", index: globalIndex, email: row.email, failedQrCount, certificateCount, failedCertificateCount, letterCount, failedLetterCount, skippedCount })}\n`));
            } else {
              failCount++;
              await prisma.email.update({
                where: { id: email.id },
                data: { status: "failed", errorMsg: result.error, usedFallbackSmtp: result.usedFallback }
              });
              await logAudit("email.failed", String(user._id), { to: payload.to, subject: payload.subject, error: result.error, isBulk: true, usedFallback: result.usedFallback }, email.id, req);
              controller.enqueue(encoder.encode(`${toJson({ 
                type: "failed", 
                index: globalIndex, 
                email: row.email, 
                error: result.error, 
                bothFailed: result.bothFailed,
                primaryError: result.primaryError,
                fallbackError: result.fallbackError,
                failedQrCount, 
                certificateCount, 
                failedCertificateCount,
                letterCount,
                failedLetterCount,
                skippedCount
              })}\n`));
            }
          } catch (error: any) {
            failCount++;
            console.error(`Bulk send loop iteration error for recipient ${row.email}:`, error);
            controller.enqueue(encoder.encode(`${toJson({ type: "failed", index: globalIndex, email: row.email, error: error.message, failedQrCount, certificateCount, failedCertificateCount, letterCount, failedLetterCount, skippedCount })}\n`));
          }
          if (index < rows.length - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        if (isLastBatch) {
          await logAudit(req.signal.aborted ? "email.bulk_stopped" : "email.bulk_completed", String(user._id), { recipientCount: rows.length, templateId, bulkJobId }, undefined, req);
          if (certTemplate) {
            await logAudit("certificate.bulk_generated", String(user._id), { templateName: certTemplate.name, count: certificateCount, failed: failedCertificateCount }, undefined, req);
          }
          // Trigger PWA push notification summary
          sendPushToUser(String(user._id), {
            title: "Bulk Send Complete 📤",
            body: `${successCount} sent, ${failCount} failed, ${skippedCount} skipped`,
            url: `/sent/campaign/${bulkJobId}`,
            tag: "bulk-complete"
          }).catch(err => console.error("Error sending bulk-complete push:", err));
        }

        controller.enqueue(encoder.encode(`${toJson({ type: req.signal.aborted ? "stopped" : "completed", bulkJobId, failedQrCount, certificateCount, failedCertificateCount, letterCount, failedLetterCount, successCount, failCount, skippedCount })}\n`));
      } catch (error) {
        console.error("[send-bulk] stream failed:", error);
        controller.enqueue(encoder.encode(`${toJson({ type: "failed", error: error instanceof Error ? error.message : String(error), failedQrCount, certificateCount, failedCertificateCount, letterCount, failedLetterCount, skippedCount })}\n`));
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
