import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { parseList } from "@/lib/utils";
import { scheduleEmailJob } from "@/lib/scheduler";
import { ScheduledEmail } from "@/models/ScheduledEmail";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  to: z.union([z.string(), z.array(z.string())]),
  cc: z.union([z.string(), z.array(z.string())]).optional(),
  bcc: z.union([z.string(), z.array(z.string())]).optional(),
  subject: z.string().min(1),
  bodyHtml: z.string().default(""),
  scheduledAt: z.string()
});

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);
  const body = schema.parse(await req.json());
  const scheduled = await ScheduledEmail.create({
    userId: user._id,
    to: parseList(body.to),
    cc: parseList(body.cc),
    bcc: parseList(body.bcc),
    subject: body.subject,
    bodyHtml: body.bodyHtml,
    scheduledAt: new Date(body.scheduledAt),
    status: "pending"
  });
  scheduled.agendaJobId = await scheduleEmailJob(String(scheduled._id), scheduled.scheduledAt);
  await scheduled.save();
  await logAudit("email.scheduled", String(user._id), { subject: scheduled.subject, scheduledAt: scheduled.scheduledAt }, String(scheduled._id), req);
  return Response.json({ success: true, scheduled });
}
