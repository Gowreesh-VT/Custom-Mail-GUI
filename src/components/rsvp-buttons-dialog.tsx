"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildRsvpButtonsHtml, RSVP_CHOICES, RSVP_DEFAULT_BUTTONS, RSVP_LABELS, type RsvpChoice } from "@/lib/rsvp-shared";

type ButtonConfig = { enabled: boolean; label: string; bg: string; text: string };

function defaults(): Record<RsvpChoice, ButtonConfig> {
  return {
    yes: { enabled: true, ...RSVP_DEFAULT_BUTTONS.yes },
    no: { enabled: true, ...RSVP_DEFAULT_BUTTONS.no },
    maybe: { enabled: false, ...RSVP_DEFAULT_BUTTONS.maybe }
  };
}

export function RsvpButtonsDialog({
  open,
  onOpenChange,
  onInsert
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (html: string) => void;
}) {
  const [buttons, setButtons] = useState(defaults);
  const selected = RSVP_CHOICES.filter((choice) => buttons[choice].enabled && buttons[choice].label.trim());

  function update(choice: RsvpChoice, patch: Partial<ButtonConfig>) {
    setButtons((current) => ({ ...current, [choice]: { ...current[choice], ...patch } }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insert RSVP Buttons</DialogTitle>
          <DialogDescription>
            Each recipient gets their own signed link. Responses appear under the email&apos;s or campaign&apos;s analytics.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {RSVP_CHOICES.map((choice) => (
            <div key={choice} className="flex items-center gap-2">
              <Checkbox
                id={`rsvp-${choice}`}
                checked={buttons[choice].enabled}
                onCheckedChange={(checked) => update(choice, { enabled: checked === true })}
              />
              <Label htmlFor={`rsvp-${choice}`} className="w-24 shrink-0 text-xs">{RSVP_LABELS[choice]}</Label>
              <Input
                className="h-9"
                value={buttons[choice].label}
                disabled={!buttons[choice].enabled}
                onChange={(e) => update(choice, { label: e.target.value })}
                aria-label={`${RSVP_LABELS[choice]} button text`}
              />
              <Input
                type="color"
                className="h-9 w-10 shrink-0 p-0.5"
                value={buttons[choice].bg}
                disabled={!buttons[choice].enabled}
                onChange={(e) => update(choice, { bg: e.target.value })}
                aria-label={`${RSVP_LABELS[choice]} button color`}
              />
            </div>
          ))}
          <div className="mt-2 rounded-md border p-3 bg-muted/20">
            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Live Preview</div>
            <div className="flex flex-wrap justify-center gap-2 p-2 border border-dashed rounded bg-background">
              {selected.length === 0 && <span className="text-xs text-muted-foreground">Select at least one option</span>}
              {selected.map((choice) => (
                <span
                  key={choice}
                  style={{
                    display: "inline-block",
                    backgroundColor: buttons[choice].bg,
                    color: buttons[choice].text,
                    padding: "8px 16px",
                    borderRadius: "6px",
                    fontWeight: "600",
                    fontSize: "13px",
                    fontFamily: "sans-serif"
                  }}
                >
                  {buttons[choice].label}
                </span>
              ))}
            </div>
          </div>
          <Button
            disabled={selected.length === 0}
            onClick={() => {
              onInsert(buildRsvpButtonsHtml(selected.map((choice) => ({ choice, ...buttons[choice], label: buttons[choice].label.trim() }))));
              onOpenChange(false);
            }}
          >
            Insert RSVP Buttons
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
