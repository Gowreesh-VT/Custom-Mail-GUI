import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { cancelAgendaJob } from "@/lib/scheduler";
import { ScheduledEmail } from "@/models/ScheduledEmail";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const scheduled = await ScheduledEmail.find({ userId: user._id }).sort({ scheduledAt: 1 }).limit(100).lean();
  return Response.json({ success: true, scheduled });
}

export async function DELETE(req: NextRequest) {
  const { user } = await requireUser(req);
  const id = new URL(req.url).searchParams.get("id");
  const item = await ScheduledEmail.findOne({ _id: id, userId: user._id });
  if (item) {
    item.status = "cancelled";
    await item.save();
    await cancelAgendaJob(item.agendaJobId || undefined);
    await logAudit("email.schedule_cancelled", String(user._id), { subject: item.subject }, String(item._id), req);
  }
  return Response.json({ success: true });
}
