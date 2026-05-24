import { type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { updateEmailTracking } from "@/lib/tracking";
import { Email } from "@/models/Email";
import { EmailEvent } from "@/models/EmailEvent";

const gif = Buffer.from("R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");

export async function GET(req: NextRequest, { params }: { params: Promise<{ emailId: string }> }) {
  await connectToDatabase();
  const { emailId } = await params;
  const email = await Email.findById(emailId).select("userId trackingEnabled");
  if (email?.trackingEnabled !== false) {
    await EmailEvent.create({ emailId, userId: email?.userId, type: "open", ip: req.headers.get("x-forwarded-for") || "", userAgent: req.headers.get("user-agent") || "" });
    await updateEmailTracking(emailId, "open");
  }
  return new Response(gif, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
}
