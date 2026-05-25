import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/json-fields";
import { draftRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.string().optional(),
  to: z.array(z.string()).default([]),
  cc: z.array(z.string()).default([]),
  bcc: z.array(z.string()).default([]),
  replyTo: z.string().optional(),
  subject: z.string().default(""),
  bodyHtml: z.string().default(""),
  attachments: z.array(z.any()).default([])
});

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const drafts = await prisma.draft.findMany({ where: { userId: String(user._id) }, orderBy: { updatedAt: "desc" }, take: 100 });
  return Response.json({ success: true, drafts: drafts.map(draftRecord) });
}

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);
  const body = schema.parse(await req.json());
  const data = {
    userId: String(user._id),
    toAddresses: toJson(body.to),
    ccAddresses: toJson(body.cc),
    bccAddresses: toJson(body.bcc),
    replyTo: body.replyTo ?? null,
    subject: body.subject,
    bodyHtml: body.bodyHtml,
    attachments: toJson(body.attachments)
  };
  const draft = body.id
    ? await prisma.draft.updateMany({ where: { id: body.id, userId: String(user._id) }, data }).then(async (result) => result.count ? prisma.draft.findUnique({ where: { id: body.id } }) : null)
    : await prisma.draft.create({ data });
  if (!draft) return jsonError("Draft not found", 404);
  return Response.json({ success: true, draft: draftRecord(draft) });
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  const { user } = await requireUser(req);
  const id = new URL(req.url).searchParams.get("id");
  if (id) await prisma.draft.deleteMany({ where: { id, userId: String(user._id) } });
  return Response.json({ success: true });
}
