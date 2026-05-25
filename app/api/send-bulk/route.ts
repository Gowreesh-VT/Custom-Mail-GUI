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
  const templateId = String(form.get("templateId") || "");
  const delayMs = Number(form.get("delayMs") || 500);
  const columnMap = fromJson<Record<string, string>>(String(form.get("columnMap") || "{}"), {});
  const qrConfig = fromJson<Record<string, any>>(String(form.get("qrConfig") || "{}"), {});
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
        let bodyHtml = applyMergeFields(template.bodyHtml, values);
        const recipient = { email: row.email, data: { ...row, ...values } };
        const qrFieldConfigs = buildQrFieldConfigs(qrConfig, bodyHtml);
        if (qrFieldConfigs.length) {
          bodyHtml = await replaceQrPlaceholders(bodyHtml, qrFieldConfigs, recipient, String(user._id), {
            onError: (error, config) => {
              failedQrCount += 1;
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

function buildQrFieldConfigs(qrConfig: Record<string, any>, html: string): QrFieldConfig[] {
  return detectQrPlaceholders(html).map((placeholder) => ({
    placeholderName: placeholder,
    ...(qrConfig[placeholder] || {})
  }));
}
