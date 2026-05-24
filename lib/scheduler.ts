import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { connectToDatabase } from "@/lib/mongodb";
import { Email } from "@/models/Email";
import { ScheduledEmail } from "@/models/ScheduledEmail";
import { User } from "@/models/User";
import { sendMailForUser } from "@/lib/mailer";

let agenda: Agenda | null = null;

export async function getAgenda() {
  if (agenda) return agenda;
  await connectToDatabase();
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  agenda = new Agenda({
    backend: new MongoBackend({ address: process.env.MONGODB_URI, collection: "agendaJobs" })
  });

  agenda.define("send scheduled email", async (job: any) => {
    const { scheduledEmailId } = job.attrs.data as { scheduledEmailId: string };
    const scheduled = await ScheduledEmail.findById(scheduledEmailId);
    if (!scheduled || scheduled.status !== "pending") return;
    const user = await User.findById(scheduled.userId);
    if (!user) return;
    try {
      await sendMailForUser(user, {
        to: scheduled.to,
        cc: scheduled.cc,
        bcc: scheduled.bcc,
        subject: scheduled.subject,
        bodyHtml: scheduled.bodyHtml,
        attachments: scheduled.attachments as any
      });
      scheduled.status = "sent";
      scheduled.sentAt = new Date();
      await scheduled.save();
      await Email.create({ userId: scheduled.userId, to: scheduled.to, cc: scheduled.cc, bcc: scheduled.bcc, subject: scheduled.subject, bodyHtml: scheduled.bodyHtml, attachments: scheduled.attachments, status: "sent", sentAt: new Date() });
    } catch (error: any) {
      scheduled.status = "failed";
      scheduled.errorMsg = error.message;
      await scheduled.save();
      await Email.create({ userId: scheduled.userId, to: scheduled.to, cc: scheduled.cc, bcc: scheduled.bcc, subject: scheduled.subject, bodyHtml: scheduled.bodyHtml, attachments: scheduled.attachments, status: "failed", errorMsg: error.message, sentAt: new Date() });
    }
  });

  await agenda.start();
  await reconcileMissedJobs();
  return agenda;
}

export async function scheduleEmailJob(scheduledEmailId: string, when: Date) {
  const instance = await getAgenda();
  const job = await instance.schedule(when, "send scheduled email", { scheduledEmailId });
  return String(job.attrs._id);
}

export async function cancelAgendaJob(jobId?: string) {
  if (!jobId) return;
  const instance = await getAgenda();
  await instance.cancel({ id: jobId });
}

async function reconcileMissedJobs() {
  const now = new Date();
  const pending = await ScheduledEmail.find({ status: "pending", scheduledAt: { $lt: now } }).limit(100);
  for (const item of pending) {
    const hoursOverdue = (now.getTime() - item.scheduledAt.getTime()) / 36e5;
    if (hoursOverdue > 24) {
      item.status = "missed";
      await item.save();
    } else {
      await scheduleEmailJob(String(item._id), new Date(Date.now() + 1000));
    }
  }
}
