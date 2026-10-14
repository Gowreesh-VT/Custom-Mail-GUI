"use client";

import { CalendarCheck, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RSVP_LABELS, isRsvpChoice } from "@/lib/rsvp-shared";
import { cn } from "@/lib/utils";

export type RsvpInfo = { response: string; note: string | null; respondedAt: string; changeCount: number } | null;
export type RsvpSummary = { enabled: boolean; yes: number; no: number; maybe: number; pending: number };

const BADGE_VARIANT = { yes: "sent", no: "failed", maybe: "warning" } as const;

export function RsvpBadge({ rsvp }: { rsvp: RsvpInfo }) {
  if (!rsvp || !isRsvpChoice(rsvp.response)) return <span className="text-xs text-muted-foreground">No response</span>;
  return (
    <Badge
      variant={BADGE_VARIANT[rsvp.response]}
      className="text-[10px] py-0.5"
      title={`${new Date(rsvp.respondedAt).toLocaleString()}${rsvp.changeCount ? ` · changed ${rsvp.changeCount}×` : ""}${rsvp.note ? `\n“${rsvp.note}”` : ""}`}
    >
      {RSVP_LABELS[rsvp.response]}
    </Badge>
  );
}

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function downloadRsvpCsv(filename: string, rows: Array<{ email: string; rsvp: RsvpInfo }>) {
  const lines = [["Email", "Response", "Note", "Responded At", "Times Changed"].join(",")];
  for (const row of rows) {
    const r = row.rsvp;
    lines.push(
      [
        row.email,
        r && isRsvpChoice(r.response) ? RSVP_LABELS[r.response] : "No response",
        r?.note || "",
        r ? new Date(r.respondedAt).toISOString() : "",
        r ? String(r.changeCount) : ""
      ]
        .map(csvCell)
        .join(",")
    );
  }
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function RsvpSummaryCard({ summary, onExport }: { summary: RsvpSummary; onExport?: () => void }) {
  const total = summary.yes + summary.no + summary.maybe + summary.pending;
  const tiles = [
    { key: "yes", label: "Attending", value: summary.yes, bar: "bg-sent", text: "text-sent" },
    { key: "no", label: "Not attending", value: summary.no, bar: "bg-failed", text: "text-failed" },
    { key: "maybe", label: "Maybe", value: summary.maybe, bar: "bg-warning", text: "text-warning" },
    { key: "pending", label: "No response", value: summary.pending, bar: "bg-muted-foreground/30", text: "text-muted-foreground" }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> RSVP Responses</CardTitle>
          <CardDescription>Each recipient&apos;s latest confirmed answer. Opening the link alone isn&apos;t counted.</CardDescription>
        </div>
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.key} className="rounded-lg border p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tile.label}</div>
              <div className={cn("mt-1 text-2xl font-bold", tile.text)}>{tile.value}</div>
              <div className="text-xs text-muted-foreground">{total ? Math.round((tile.value / total) * 100) : 0}%</div>
            </div>
          ))}
        </div>
        {total > 0 && (
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            {tiles.map((tile) =>
              tile.value > 0 ? <div key={tile.key} className={tile.bar} style={{ width: `${(tile.value / total) * 100}%` }} /> : null
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
