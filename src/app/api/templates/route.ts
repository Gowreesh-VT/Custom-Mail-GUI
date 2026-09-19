import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { detectTemplateFields, formatInvalidImagesMessage, isValidHtmlTemplate, validateExternalImageUrls } from "@/lib/template-html";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/json-fields";
import { templateRecord } from "@/lib/records";

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
  const sortMap = {
    newest: { updatedAt: "desc" as const },
    oldest: { updatedAt: "asc" as const },
    az: { name: "asc" as const }
  };
  const templates = await prisma.template.findMany({
    where: { userId: String(user._id), ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}) },
    select: { id: true, name: true, description: true, subjectLine: true, mergeFields: true, previewImage: true, isFavourite: true, createdAt: true, updatedAt: true },
    orderBy: sortMap[sort as keyof typeof sortMap] || sortMap.newest
  });

  return Response.json({
    success: true,
    templates: templates.map((template) => ({ ...templateRecord(template), subjectLine: template.subjectLine || "" }))
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
    const result = await prisma.template.updateMany({
      where: { id: body.id, userId: String(user._id) },
      data: {
        name: body.name,
        description: body.description,
        subjectLine: body.subjectLine,
        bodyHtml: body.bodyHtml,
        mergeFields: toJson(mergeFields),
        previewImage: body.previewImage
      }
    });
    const template = result.count ? await prisma.template.findUnique({ where: { id: body.id } }) : null;
    if (!template) return jsonError("Template not found", 404);
    return Response.json({ success: true, template: templateRecord(template) });
  } catch (error: any) {
    return jsonError(error.message || "Unable to update template", 400);
  }
}

export async function DELETE(req: NextRequest) {
  const { user } = await requireUser(req);
  const id = new URL(req.url).searchParams.get("id");
  if (id) await prisma.template.deleteMany({ where: { id, userId: String(user._id) } });
  return Response.json({ success: true });
}

function sanitizeMergeFields(fields: string[]) {
  return Array.from(new Set(fields.map((field) => field.trim()).filter(Boolean)));
}
