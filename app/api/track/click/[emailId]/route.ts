import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { updateEmailTracking } from "@/lib/tracking";
import { Email } from "@/models/Email";
import { EmailEvent } from "@/models/EmailEvent";

export async function GET(req: NextRequest, { params }: { params: Promise<{ emailId: string }> }) {
  await connectToDatabase();
  const { emailId } = await params;
  const url = new URL(req.url).searchParams.get("url") || "/";
  const email = await Email.findById(emailId).select("userId trackingEnabled");
  if (email?.trackingEnabled !== false) {
    await EmailEvent.create({ emailId, userId: email?.userId, type: "click", url, ip: req.headers.get("x-forwarded-for") || "", userAgent: req.headers.get("user-agent") || "" });
    await updateEmailTracking(emailId, "click");
  }
  return NextResponse.redirect(url);
}
