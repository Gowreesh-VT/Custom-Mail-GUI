import { NextResponse, type NextRequest } from "next/server";
import { updateEmailTracking } from "@/lib/tracking";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ emailId: string }> }) {
  const { emailId } = await params;
  const searchParams = new URL(req.url).searchParams;
  const url = searchParams.get("url") || "/";
  const label = searchParams.get("label") || "Link Click";

  const email = await prisma.email.findUnique({ where: { id: emailId }, select: { userId: true, trackingEnabled: true } });
  if (email && email.trackingEnabled !== false) {
    const ip = req.headers.get("x-forwarded-for") || "";
    const userAgent = req.headers.get("user-agent") || "";

    await prisma.emailEvent.create({
      data: {
        emailId,
        userId: email.userId,
        type: "click",
        url,
        ip,
        userAgent
      }
    });

    await prisma.clickEvent.create({
      data: {
        emailId,
        label,
        url,
        ip,
        userAgent
      }
    });

    await updateEmailTracking(emailId, "click");
  }
  return NextResponse.redirect(url);
}

