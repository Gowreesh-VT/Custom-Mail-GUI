import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { detectTemplateFields, formatInvalidImagesMessage, validateExternalImageUrls } from "@/lib/template-html";
import { Template } from "@/lib/models";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  subjectLine: z.string().min(1),
  bodyHtml: z.string().min(1),
  mergeFields: z.array(z.string()).optional(),
  previewImage: z.string().optional().default("")
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const template = await Template.findOne({ _id: id, userId: user._id }).lean();
  if (!template) return jsonError("Template not found", 404);
  return Response.json({ success: true, template: { ...template, subjectLine: template.subjectLine || template.subject || "" } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(req);
    const { id } = await params;
    const body = updateSchema.parse(await req.json());
    const invalidImages = validateExternalImageUrls(body.bodyHtml);
    if (invalidImages.length) return jsonError(formatInvalidImagesMessage(invalidImages), 400, "INVALID_TEMPLATE_IMAGES");
    const mergeFields = Array.from(new Set((body.mergeFields?.length ? body.mergeFields : detectTemplateFields(body.subjectLine, body.bodyHtml)).map((field) => field.trim()).filter(Boolean)));
    const template = await Template.findOneAndUpdate(
      { _id: id, userId: user._id },
      { ...body, subject: body.subjectLine, mergeFields },
      { new: true }
    );
    if (!template) return jsonError("Template not found", 404);
    return Response.json({ success: true, template });
  } catch (error: any) {
    return jsonError(error.message || "Unable to update template", 400);
  }
}
