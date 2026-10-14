import crypto from "crypto";
import type { RsvpChoice } from "@/lib/rsvp-shared";

// Test sends (template "Send test") have no Email row, so their RSVP links point here.
export const RSVP_PREVIEW_ID = "preview";

function rsvpSecret() {
  const secret = process.env.RSVP_SECRET || process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("RSVP_SECRET or ENCRYPTION_SECRET must be configured");
  return secret;
}

export function rsvpToken(emailId: string) {
  return crypto.createHmac("sha256", rsvpSecret()).update(`rsvp:${emailId}`).digest("base64url").slice(0, 22);
}

export function verifyRsvpToken(emailId: string, token: string | null | undefined) {
  if (!token) return false;
  const expected = Buffer.from(rsvpToken(emailId));
  const given = Buffer.from(token);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export function rsvpUrl(base: string, emailId: string, choice: RsvpChoice) {
  if (emailId === RSVP_PREVIEW_ID) return `${base}/rsvp/${RSVP_PREVIEW_ID}?r=${choice}`;
  return `${base}/rsvp/${emailId}?r=${choice}&amp;t=${rsvpToken(emailId)}`;
}

// Replaces {{RSVP:yes|no|maybe}} with signed links to the RSVP confirmation page.
export function expandRsvpTags(html: string, emailId: string, base: string) {
  return html.replace(/\{\{\s*RSVP:\s*(yes|no|maybe)\s*\}\}/gi, (_match, choice: string) =>
    rsvpUrl(base, emailId, choice.toLowerCase() as RsvpChoice)
  );
}
