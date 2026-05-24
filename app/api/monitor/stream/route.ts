import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { Email } from "@/lib/models";
import { ScheduledEmail } from "@/lib/models";
import { toJson } from "@/lib/json-fields";

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  let lastSeen = new Date(Date.now() - 60_000);
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`data: ${toJson(event)}\n\n`));
      send({ type: "info", message: "Connected to activity stream", at: new Date().toISOString() });
      const timer = setInterval(async () => {
        const [emails, scheduled] = await Promise.all([
          Email.find({ userId: user._id, sentAt: { $gt: lastSeen } }).sort({ sentAt: 1 }).limit(20).lean(),
          ScheduledEmail.find({ userId: user._id, updatedAt: { $gt: lastSeen } }).sort({ updatedAt: 1 }).limit(20).lean()
        ]);
        lastSeen = new Date();
        emails.forEach((email: any) => send({ type: email.status, to: email.to?.[0], subject: email.subject, error: email.errorMsg, at: email.sentAt }));
        scheduled.forEach((item: any) => send({ type: "scheduled", subject: item.subject, status: item.status, at: item.updatedAt }));
      }, 5000);
      req.signal.addEventListener("abort", () => {
        clearInterval(timer);
        controller.close();
      });
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
