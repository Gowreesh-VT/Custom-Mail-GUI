// Client-safe RSVP constants and helpers (no Node crypto here).

export const RSVP_CHOICES = ["yes", "no", "maybe"] as const;
export type RsvpChoice = (typeof RSVP_CHOICES)[number];

export const RSVP_LABELS: Record<RsvpChoice, string> = {
  yes: "Attending",
  no: "Not attending",
  maybe: "Maybe"
};

export const RSVP_DEFAULT_BUTTONS: Record<RsvpChoice, { label: string; bg: string; text: string }> = {
  yes: { label: "Yes, I'll be there", bg: "#16a34a", text: "#ffffff" },
  no: { label: "Sorry, can't make it", bg: "#dc2626", text: "#ffffff" },
  maybe: { label: "Maybe", bg: "#6b7280", text: "#ffffff" }
};

export const RSVP_NOTE_MAX = 500;

export function isRsvpChoice(value: unknown): value is RsvpChoice {
  return typeof value === "string" && (RSVP_CHOICES as readonly string[]).includes(value);
}

export function hasRsvpTags(html: string) {
  return /\{\{\s*RSVP:\s*(yes|no|maybe)\s*\}\}/i.test(html);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildRsvpButtonsHtml(buttons: Array<{ choice: RsvpChoice; label: string; bg: string; text: string }>) {
  const links = buttons.map(
    ({ choice, label, bg, text }) =>
      `<a href="{{RSVP:${choice}}}" style="display:inline-block;background-color:${escapeHtml(bg)};color:${escapeHtml(text)};padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:600;font-family:sans-serif;margin:4px 6px 4px 0;">${escapeHtml(label)}</a>`
  );
  return `<p>${links.join(" ")}</p>`;
}
