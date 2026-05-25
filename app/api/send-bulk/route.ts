import Papa from "papaparse";
import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { sendMailForUser } from "@/lib/mailer";
import { applyMergeFields, jsonError } from "@/lib/utils";
import { injectTracking } from "@/lib/tracking";
import { logAudit } from "@/lib/audit";
import { fromJson, toJson } from "@/lib/json-fields";
import { prisma } from "@/lib/prisma";
import { createQrForBody, objectToStrings } from "@/lib/qr-api";
import { detectQrPlaceholders, replaceMergeFields } from "@/lib/qr";

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
      for (let index = 0; index < rows.length; index++) {
        if (req.signal.aborted) break;
        const row = rows[index];
        const values = valuesFromMap(row, columnMap);
        const payload = {
          to: [row.email],
          subject: applyMergeFields(template.subjectLine || template.name, values),
          bodyHtml: await renderBulkQrHtml(applyMergeFields(template.bodyHtml, values), qrConfig, row, values, String(user._id))
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
          controller.enqueue(encoder.encode(`${toJson({ type: "sent", index, email: row.email })}\n`));
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
          controller.enqueue(encoder.encode(`${toJson({ type: "failed", index, email: row.email, error: error.message })}\n`));
        }
        if (index < rows.length - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      await logAudit(req.signal.aborted ? "email.bulk_stopped" : "email.bulk_completed", String(user._id), { recipientCount: rows.length, templateId }, undefined, req);
      controller.enqueue(encoder.encode(`${toJson({ type: req.signal.aborted ? "stopped" : "completed" })}\n`));
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

async function renderBulkQrHtml(
  html: string,
  qrConfig: Record<string, any>,
  row: Record<string, string>,
  values: Record<string, string>,
  userId: string
) {
  let rendered = html;
  for (const placeholder of detectQrPlaceholders(html)) {
    const config = qrConfig[placeholder];
    if (!config?.campaignId) continue;
    const mappedFields = fieldsFromQrConfig(config, row, values);
    const result = await createQrForBody(userId, {
      campaignId: config.campaignId,
      contentType: config.contentType,
      fields: mappedFields,
      url: config.urlTemplate ? replaceMergeFields(config.urlTemplate, objectToStrings({ ...row, ...values })) : row.url,
      text: config.textTemplate ? replaceMergeFields(config.textTemplate, objectToStrings({ ...row, ...values })) : row.text,
      recipientEmail: row.email,
      recipientName: row.name || values.name || values.NAME,
      mergeData: { ...row, ...values }
    });
    if (!result.qrCode) continue;
    const absoluteUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}${result.qrCode.imageUrl}`;
    rendered = rendered.replaceAll(`{{${placeholder}}}`, `<img src="${absoluteUrl}" width="${config.width || 200}" height="${config.height || 200}" alt="QR Code" />`);
  }
  return rendered;
}

function fieldsFromQrConfig(config: any, row: Record<string, string>, values: Record<string, string>) {
  const source = { ...row, ...values };
  const output: Record<string, string> = {};
  for (const [field, mapping] of Object.entries(config.fields || {}) as Array<[string, string]>) {
    output[field.toUpperCase()] = source[mapping] || "";
  }
  for (const [field, value] of Object.entries(config.staticFields || {}) as Array<[string, string]>) {
    output[field.toUpperCase()] = value || "";
  }
  return output;
}
