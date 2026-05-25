import { NextResponse, type NextRequest } from "next/server";
import { updateEmailTracking } from "@/lib/tracking";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ emailId: string }> }) {
  const { emailId } = await params;
  const url = new URL(req.url).searchParams.get("url") || "/";
  const email = await prisma.email.findUnique({ where: { id: emailId }, select: { userId: true, trackingEnabled: true } });
  if (email && email.trackingEnabled !== false) {
    await prisma.emailEvent.create({ data: { emailId, userId: email.userId, type: "click", url, ip: req.headers.get("x-forwarded-for") || "", userAgent: req.headers.get("user-agent") || "" } });
    await updateEmailTracking(emailId, "click");
  }
  return NextResponse.redirect(url);
}
