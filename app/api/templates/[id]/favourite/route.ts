import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { Template } from "@/lib/models";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const template = await Template.findOne({ _id: id, userId: user._id });
  if (!template) return jsonError("Template not found", 404);
  template.isFavourite = !template.isFavourite;
  await template.save();
  return Response.json({ success: true, isFavourite: template.isFavourite });
}
