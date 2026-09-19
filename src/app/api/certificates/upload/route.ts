import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { detectPlaceholders, extractPdfInfo, generatePdfPreview, labelFromPlaceholder, type CertField } from "@/lib/certificate";
import { jsonError } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("PDF file is required", 400);
  if (file.size > MAX_PDF_BYTES) return jsonError("PDF file must be 10MB or smaller", 400);
  if (file.type && file.type !== "application/pdf") return jsonError("Only PDF files are supported", 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("utf8") !== "%PDF-") return jsonError("Invalid PDF file", 400);

  const pdfBase64 = bytes.toString("base64");
  const info = await extractPdfInfo(pdfBase64);
  const detectedPlaceholders = await detectPlaceholders(pdfBase64);
  const fields: CertField[] = detectedPlaceholders.map((placeholder) => ({
    id: crypto.randomUUID(),
    placeholder,
    label: labelFromPlaceholder(placeholder),
    defaultValue: "",
    fontSize: 24,
    color: "#000000",
    isBold: false,
    isItalic: false,
    alignment: "center"
  }));
  const previewImage = await generatePdfPreview(pdfBase64);
  const fallbackName = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() || "Certificate Template";
  const name = String(form.get("name") || fallbackName);
  const description = String(form.get("description") || "");

  const template = await prisma.certificateTemplate.create({
    data: {
      userId: String(user._id),
      name,
      description: description || null,
      pdfBase64,
      pdfFileName: file.name,
      pdfSizeBytes: file.size,
      pageWidth: info.pageWidth,
      pageHeight: info.pageHeight,
      pageCount: info.pageCount,
      fields: JSON.stringify(fields),
      previewImage
    }
  });
  await logAudit({ action: "certificate.template_created", category: "ADMIN", userId: String(user._id), metadata: { name }, req });

  return Response.json({
    template: {
      ...template,
      fields,
      pdfBase64: undefined
    },
    detectedPlaceholders,
    pageCount: info.pageCount,
    pageWidth: info.pageWidth,
    pageHeight: info.pageHeight
  });
}
