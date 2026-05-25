import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { toJson, toStringArray } from "@/lib/json-fields";

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
          prisma.email.findMany({ where: { userId: String(user._id), sentAt: { gt: lastSeen } }, orderBy: { sentAt: "asc" }, take: 20 }),
          prisma.scheduledEmail.findMany({ where: { userId: String(user._id), updatedAt: { gt: lastSeen } }, orderBy: { updatedAt: "asc" }, take: 20 })
        ]);
        lastSeen = new Date();
        emails.forEach((email) => send({ type: email.status, to: toStringArray(email.toAddresses)[0], subject: email.subject, error: email.errorMsg, at: email.sentAt }));
        scheduled.forEach((item) => send({ type: "scheduled", subject: item.subject, status: item.status, at: item.updatedAt }));
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
