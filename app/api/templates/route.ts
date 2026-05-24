import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { detectTemplateFields, formatInvalidImagesMessage, isValidHtmlTemplate, validateExternalImageUrls } from "@/lib/template-html";
import { Template } from "@/lib/models";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(""),
  subjectLine: z.string().min(1),
  bodyHtml: z.string().min(1),
  mergeFields: z.array(z.string()).optional(),
  previewImage: z.string().optional().default("")
});

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const url = new URL(req.url);
  const search = url.searchParams.get("q") || "";
  const sort = url.searchParams.get("sort") || "newest";
  const filter: Record<string, unknown> = { userId: user._id };
  if (search) filter.name = new RegExp(search, "i");
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    newest: { updatedAt: -1 },
    oldest: { updatedAt: 1 },
    az: { name: 1 }
  };
  const templates = await Template.find(filter)
    .select("_id name description subjectLine mergeFields previewImage isFavourite createdAt updatedAt")
    .sort(sortMap[sort] || sortMap.newest)
    .lean();

  return Response.json({
    success: true,
    templates: templates.map((template: any) => ({
      ...template,
      subjectLine: template.subjectLine || template.subject || ""
    }))
  });
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = createSchema.parse(await req.json());
    const invalidImages = validateExternalImageUrls(body.bodyHtml);
    if (invalidImages.length) return jsonError(formatInvalidImagesMessage(invalidImages), 400, "INVALID_TEMPLATE_IMAGES");
    if (!isValidHtmlTemplate(body.bodyHtml)) return jsonError("Template HTML is empty or invalid", 400, "INVALID_TEMPLATE_HTML");
    const mergeFields = sanitizeMergeFields(body.mergeFields?.length ? body.mergeFields : detectTemplateFields(body.subjectLine, body.bodyHtml));
    const template = await Template.create({
      userId: user._id,
      name: body.name,
      description: body.description,
      subjectLine: body.subjectLine,
      subject: body.subjectLine,
      bodyHtml: body.bodyHtml,
      mergeFields,
      previewImage: body.previewImage
    });
    return Response.json({ success: true, template });
  } catch (error: any) {
    return jsonError(error.message || "Unable to create template", 400);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = createSchema.extend({ id: z.string().min(1) }).parse(await req.json());
    const invalidImages = validateExternalImageUrls(body.bodyHtml);
    if (invalidImages.length) return jsonError(formatInvalidImagesMessage(invalidImages), 400, "INVALID_TEMPLATE_IMAGES");
    const mergeFields = sanitizeMergeFields(body.mergeFields?.length ? body.mergeFields : detectTemplateFields(body.subjectLine, body.bodyHtml));
    const template = await Template.findOneAndUpdate(
      { _id: body.id, userId: user._id },
      {
        name: body.name,
        description: body.description,
        subjectLine: body.subjectLine,
        subject: body.subjectLine,
        bodyHtml: body.bodyHtml,
        mergeFields,
        previewImage: body.previewImage
      },
      { new: true }
    );
    if (!template) return jsonError("Template not found", 404);
    return Response.json({ success: true, template });
  } catch (error: any) {
    return jsonError(error.message || "Unable to update template", 400);
  }
}

export async function DELETE(req: NextRequest) {
  const { user } = await requireUser(req);
  const id = new URL(req.url).searchParams.get("id");
  await Template.deleteOne({ _id: id, userId: user._id });
  return Response.json({ success: true });
}

function sanitizeMergeFields(fields: string[]) {
  return Array.from(new Set(fields.map((field) => field.trim()).filter(Boolean)));
}
