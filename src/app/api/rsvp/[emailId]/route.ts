import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRsvpToken } from "@/lib/rsvp";
import { isRsvpChoice, RSVP_NOTE_MAX } from "@/lib/rsvp-shared";
import { getRequestIp, rateLimitAttempt } from "@/lib/security";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Public: recipients submit their RSVP from the confirmation page. Authorised by the signed token in the email link.
export async function POST(req: NextRequest, { params }: { params: Promise<{ emailId: string }> }) {
  const { emailId } = await params;
  const ip = getRequestIp(req);
  if (!rateLimitAttempt(`rsvp:${ip}`, 30, 60_000).allowed) {
    return jsonError("Too many requests. Please try again in a minute.", 429, "RATE_LIMITED");
  }

  const body = await req.json().catch(() => null);
  const response = body?.response;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, RSVP_NOTE_MAX) : "";

  if (!verifyRsvpToken(emailId, body?.token)) return jsonError("This RSVP link is invalid.", 403, "INVALID_TOKEN");
  if (!isRsvpChoice(response)) return jsonError("Choose Yes, No or Maybe.", 400, "INVALID_RESPONSE");

  const email = await prisma.email.findUnique({ where: { id: emailId }, select: { id: true, rsvp: true } });
  if (!email) return jsonError("This invitation no longer exists.", 404, "NOT_FOUND");

  const now = new Date();
  const userAgent = req.headers.get("user-agent") || "";
  const changed = email.rsvp && email.rsvp.response !== response;

  const rsvp = await prisma.rsvpResponse.upsert({
    where: { emailId },
    create: { emailId, response, note: note || null, ip, userAgent, firstRespondedAt: now, respondedAt: now },
    update: {
      response,
      note: note || null,
      ip,
      userAgent,
      respondedAt: now,
      ...(changed ? { changeCount: { increment: 1 } } : {})
    }
  });

  return Response.json({ success: true, rsvp: { response: rsvp.response, note: rsvp.note, respondedAt: rsvp.respondedAt.toISOString() } });
}
