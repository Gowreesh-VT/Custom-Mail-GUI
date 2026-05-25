import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { detectTemplateFields, formatInvalidImagesMessage, isValidHtmlTemplate, validateExternalImageUrls } from "@/lib/template-html";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/json-fields";
import { templateRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  subjectLine: z.string().min(1),
  bodyHtml: z.string().min(1),
  mergeFields: z.array(z.string()).default([]),
  previewImage: z.string().optional().default("")
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = schema.parse(await req.json());
    const invalidImages = validateExternalImageUrls(body.bodyHtml);
    if (invalidImages.length) return jsonError(formatInvalidImagesMessage(invalidImages), 400, "INVALID_TEMPLATE_IMAGES");
    if (!isValidHtmlTemplate(body.bodyHtml)) return jsonError("Template HTML is empty or invalid", 400, "INVALID_TEMPLATE_HTML");
    const mergeFields = Array.from(new Set((body.mergeFields.length ? body.mergeFields : detectTemplateFields(body.subjectLine, body.bodyHtml)).map((field) => field.trim()).filter(Boolean)));
    const template = await prisma.template.create({
      data: {
        userId: String(user._id),
        name: body.name,
        description: body.description,
        subjectLine: body.subjectLine,
        bodyHtml: body.bodyHtml,
        mergeFields: toJson(mergeFields),
        previewImage: body.previewImage
      }
    });
    return Response.json({ success: true, template: templateRecord(template) });
  } catch (error: any) {
    return jsonError(error.message || "Unable to upload template", 400);
  }
}
