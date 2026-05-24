import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { Email } from "@/models/Email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  await Email.updateOne({ _id: id, userId: user._id }, { $set: { acknowledged: true } });
  return Response.json({ success: true });
}
