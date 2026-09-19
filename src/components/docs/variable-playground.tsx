"use client";

import * as React from "react";
import { Sparkles, RefreshCw, Eye, Code, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function VariablePlayground() {
  const [recipientName, setRecipientName] = React.useState("Sophia Chen");
  const [recipientEmail, setRecipientEmail] = React.useState("sophia.chen@innovate.org");
  const [ticketTier, setTicketTier] = React.useState("VIP All-Access");
  const [seatNumber, setSeatNumber] = React.useState("Balcony Row A-14");

  const [templateContent, setTemplateContent] = React.useState(
`Hello {{name}},

Congratulations! Your seat for Postly Summit 2026 is confirmed.
Ticket Type: {{ticket_tier}}
Assigned Seat: {{seat_number}}

Please present your check-in code at the entrance:
[QR Code Pass: {{QR_CODE}}]

Claim your welcome kit before arrival:
{{TRACKED_URL:claim_kit:https://summit.postly.dev/welcome-kit}}

Best regards,
The Postly Operations Team`
  );

  const compiledResult = React.useMemo(() => {
    let res = templateContent;
    res = res.replace(/\{\{name\}\}/g, recipientName || "Guest");
    res = res.replace(/\{\{email\}\}/g, recipientEmail || "user@example.com");
    res = res.replace(/\{\{ticket_tier\}\}/g, ticketTier || "Standard");
    res = res.replace(/\{\{seat_number\}\}/g, seatNumber || "Unassigned");
    res = res.replace(/\{\{QR_CODE\}\}/g, `[DYNAMIC_QR_TOKEN:HMAC_SHA256_e89a42f_TIER_${encodeURIComponent(ticketTier)}]`);
    res = res.replace(/\{\{TRACKED_URL:([^:]+):([^}]+)\}\}/g, (_, label, url) => {
      return `https://postly.gowreesh.me/api/track/click/cm_9f2a41?label=${label}&url=${encodeURIComponent(url)}`;
    });
    return res;
  }, [templateContent, recipientName, recipientEmail, ticketTier, seatNumber]);

  const resetDefaults = () => {
    setRecipientName("Sophia Chen");
    setRecipientEmail("sophia.chen@innovate.org");
    setTicketTier("VIP All-Access");
    setSeatNumber("Balcony Row A-14");
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">Interactive Merge Tag Playground</h4>
            <p className="text-xs text-zinc-400">Test merge tags, QR tags, and click redirects against live variables.</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetDefaults}
          className="h-7 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white"
        >
          <RefreshCw className="h-3 w-3 mr-1" /> Reset
        </Button>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-zinc-400">{"{{name}}"}</Label>
          <Input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="h-8 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-100"
            placeholder="Recipient Name"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-zinc-400">{"{{email}}"}</Label>
          <Input
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="h-8 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-100"
            placeholder="Recipient Email"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-zinc-400">{"{{ticket_tier}}"}</Label>
          <Input
            value={ticketTier}
            onChange={(e) => setTicketTier(e.target.value)}
            className="h-8 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-100"
            placeholder="Ticket Tier"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-zinc-400">{"{{seat_number}}"}</Label>
          <Input
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value)}
            className="h-8 text-xs bg-zinc-900/60 border-zinc-800 text-zinc-100"
            placeholder="Seat Number"
          />
        </div>
      </div>

      {/* Editor & Preview Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold">
            <Code className="h-3.5 w-3.5 text-primary" />
            <span>Template Raw Body</span>
          </div>
          <textarea
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-xs font-mono text-zinc-300 focus:outline-hidden focus:border-primary resize-none leading-relaxed"
          />
        </div>

        {/* Compiled Output */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <Eye className="h-3.5 w-3.5" />
            <span>Compiled Output (Recipient View)</span>
          </div>
          <div className="w-full h-[216px] overflow-y-auto rounded-lg border border-emerald-900/40 bg-zinc-900/70 p-3 text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap selection:bg-emerald-500/30">
            {compiledResult}
          </div>
        </div>
      </div>

      <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 pt-1">
        <ArrowRight className="h-3 w-3 text-primary" />
        Notice how <code>{"{{QR_CODE}}"}</code> automatically binds to a unique HMAC token, and <code>{"{{TRACKED_URL}}"}</code> signs and proxies through Postly telemetry.
      </div>
    </div>
  );
}
