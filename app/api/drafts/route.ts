import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { Draft } from "@/lib/models";

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
  const drafts = await Draft.find({ userId: user._id }).sort({ updatedAt: -1 }).limit(100).lean();
  return Response.json({ success: true, drafts });
}

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);
  const body = schema.parse(await req.json());
  const draft = body.id
    ? await Draft.findOneAndUpdate({ _id: body.id, userId: user._id }, body, { new: true })
    : await Draft.create({ ...body, userId: user._id });
  if (!draft) return jsonError("Draft not found", 404);
  return Response.json({ success: true, draft });
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  const { user } = await requireUser(req);
  const id = new URL(req.url).searchParams.get("id");
  await Draft.deleteOne({ _id: id, userId: user._id });
  return Response.json({ success: true });
}
