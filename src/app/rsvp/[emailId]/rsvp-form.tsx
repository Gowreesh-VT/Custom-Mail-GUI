"use client";

import { useState } from "react";
import { CheckCircle2, CircleHelp, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RSVP_CHOICES, RSVP_NOTE_MAX, type RsvpChoice } from "@/lib/rsvp-shared";
import { cn } from "@/lib/utils";

type Saved = { response: RsvpChoice; note: string | null; respondedAt: string };

const OPTIONS: Record<RsvpChoice, { label: string; confirmed: string; icon: typeof CheckCircle2; active: string }> = {
  yes: { label: "Yes, I'll attend", confirmed: "You're attending", icon: CheckCircle2, active: "border-green-500 bg-green-500/10 text-green-500" },
  no: { label: "No, I can't make it", confirmed: "You're not attending", icon: XCircle, active: "border-red-500 bg-red-500/10 text-red-500" },
  maybe: { label: "Maybe", confirmed: "You might attend", icon: CircleHelp, active: "border-amber-500 bg-amber-500/10 text-amber-500" }
};

export function RsvpForm({
  emailId,
  token,
  preview,
  subject,
  senderName,
  recipient,
  initialChoice,
  existing
}: {
  emailId: string;
  token: string;
  preview: boolean;
  subject: string;
  senderName: string;
  recipient: string;
  initialChoice: RsvpChoice | null;
  existing: Saved | null;
}) {
  const [saved, setSaved] = useState<Saved | null>(existing);
  const [editing, setEditing] = useState(!existing || (initialChoice !== null && initialChoice !== existing.response));
  const [choice, setChoice] = useState<RsvpChoice | null>(initialChoice ?? existing?.response ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!choice) return;
    setError("");
    if (preview) {
      setSaved({ response: choice, note, respondedAt: new Date().toISOString() });
      setEditing(false);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rsvp/${emailId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: choice, note, token })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || "Could not save your response. Please try again.");
      setSaved(data.rsvp);
      setEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const header = (
    <CardHeader>
      <CardDescription>RSVP · from {senderName}</CardDescription>
      <CardTitle className="text-xl leading-snug">{subject}</CardTitle>
      {recipient && <CardDescription>Responding as {recipient}</CardDescription>}
      {preview && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          This is a test email. Responses here aren&apos;t recorded.
        </p>
      )}
    </CardHeader>
  );

  if (saved && !editing) {
    const option = OPTIONS[saved.response];
    const Icon = option.icon;
    return (
      <Card className="w-full max-w-md">
        {header}
        <CardContent className="space-y-4">
          <div className={cn("flex items-center gap-3 rounded-lg border p-4", option.active)}>
            <Icon className="h-6 w-6 shrink-0" />
            <div>
              <div className="font-semibold">{option.confirmed}</div>
              <div className="text-xs opacity-80">Thanks, {senderName} has your response.</div>
            </div>
          </div>
          {saved.note && <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">&ldquo;{saved.note}&rdquo;</p>}
          <Button variant="outline" className="w-full" onClick={() => setEditing(true)}>
            Change my response
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      {header}
      <CardContent className="space-y-4">
        <div className="grid gap-2" role="radiogroup" aria-label="Your response">
          {RSVP_CHOICES.map((value) => {
            const option = OPTIONS[value];
            const Icon = option.icon;
            const selected = choice === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setChoice(value)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-left text-sm font-medium transition-colors hover:bg-muted/40",
                  selected && option.active
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="space-y-1">
          <Label htmlFor="rsvp-note">Note for {senderName} (optional)</Label>
          <Textarea
            id="rsvp-note"
            value={note}
            maxLength={RSVP_NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dietary needs, plus-ones, questions…"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button className="w-full" disabled={!choice || submitting} onClick={submit}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved ? "Update RSVP" : "Confirm RSVP"}
        </Button>
      </CardContent>
    </Card>
  );
}
