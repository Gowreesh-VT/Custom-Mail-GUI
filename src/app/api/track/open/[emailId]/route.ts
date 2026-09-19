import { type NextRequest } from "next/server";
import { updateEmailTracking } from "@/lib/tracking";
import { prisma } from "@/lib/prisma";

const gif = Buffer.from("R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");

export async function GET(req: NextRequest, { params }: { params: Promise<{ emailId: string }> }) {
  const { emailId } = await params;
  const email = await prisma.email.findUnique({ where: { id: emailId }, select: { userId: true, trackingEnabled: true } });
  if (email && email.trackingEnabled !== false) {
    await prisma.emailEvent.create({ data: { emailId, userId: email.userId, type: "open", ip: req.headers.get("x-forwarded-for") || "", userAgent: req.headers.get("user-agent") || "" } });
    await updateEmailTracking(emailId, "open");
  }
  return new Response(gif, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
}
