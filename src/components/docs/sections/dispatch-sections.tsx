"use client";

import * as React from "react";
import {
  PenLine,
  FileSpreadsheet,
  Clock,
  Layers,
  ShieldCheck,
  Zap,
  RotateCcw
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CodeTabs } from "../code-tabs";

export function ComposeSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
            Dispatch Engine
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Single Send</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Campaign Composer</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          The single-send Campaign Composer at <code>/compose</code> provides an interactive workspace for testing layouts, dispatching ad-hoc transactional notifications, and auditing variable replacements.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Composer Features */}
      <section id="composer-features" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <PenLine className="h-5 w-5 text-primary" />
          Composer Capabilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1.5">
            <span className="font-bold text-white">Full Header Control</span>
            <p className="text-zinc-400">Specify primary To addresses, CC (carbon copy), BCC (blind carbon copy), and a custom Reply-To header.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1.5">
            <span className="font-bold text-white">Template Selection</span>
            <p className="text-zinc-400">Instantly pull in pre-built HTML layouts from your Template Studio, or write bespoke HTML directly.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1.5">
            <span className="font-bold text-white">File Attachments</span>
            <p className="text-zinc-400">Attach PDFs, images, spreadsheets, and calendar invites (.ics) with automated MIME-type detection.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1.5">
            <span className="font-bold text-white">Save as Draft</span>
            <p className="text-zinc-400">Store work-in-progress emails in Drafts at /drafts, synchronized across your workspace account.</p>
          </div>
        </div>
      </section>

      {/* Variable Prompting */}
      <section id="variable-prompting" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Dynamic Variable Detection
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          When you load a template containing merge tags (such as <code>{"{{name}}"}</code> or <code>{"{{invoice_id}}"}</code>), Postly scans the AST and dynamically renders form inputs for each placeholder so you can preview and test real data before sending.
        </p>
      </section>

      {/* Attachments */}
      <section id="attachments-handling" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          File Attachments & Size Limits
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Attachments are uploaded to temporary secure storage via <code>/api/attachments</code> and encoded as base64 MIME parts during SMTP transmission. Maximum file size per attachment is <strong>25MB</strong> (standard across Gmail and Office365 relays).
        </p>
      </section>
    </div>
  );
}

export function BulkSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
            Dispatch Engine
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">High-Throughput Batch</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Bulk CSV Campaigns</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Broadcast personalized campaigns to thousands of recipients using streaming CSV file parsing, batch concurrency, rate throttling, and pause/resume control.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* CSV Format */}
      <section id="csv-format-rules" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          CSV Header & Data Requirements
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          The uploaded CSV file must have a header row as line 1. An <code>email</code> column is strictly required. Any other column names automatically become available as dynamic merge variables in your selected template:
        </p>
        <CodeTabs
          tabs={[
            {
              language: "CSV",
              filename: "attendees.csv",
              code: `email,name,ticket_type,seat_number,vip_lounge
alex@example.com,Alex Rivera,VIP All-Access,A-12,true
sarah@partner.org,Sarah Lin,Speaker Pass,B-04,true
jordan@techcorp.io,Jordan Smith,Standard,E-31,false`
            }
          ]}
        />
      </section>

      {/* Concurrency & Rate Throttling */}
      <section id="rate-throttling" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          Throughput Throttling & Delay Profiles
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          To prevent triggering anti-spam rate limits on your SMTP provider, Postly includes adjustable dispatch throttles:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <span className="font-bold text-white block">Conservative (Google)</span>
            <span className="text-zinc-400 mt-1 block">5 msgs/sec • 100ms inter-message sleep</span>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <span className="font-bold text-emerald-400 block">Balanced (ZeptoMail / SendGrid)</span>
            <span className="text-zinc-400 mt-1 block">15 msgs/sec • 30ms sleep • 5 concurrent sockets</span>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
            <span className="font-bold text-blue-400 block">High-Throughput (Amazon SES)</span>
            <span className="text-zinc-400 mt-1 block">30+ msgs/sec • 10 concurrent streams</span>
          </div>
        </div>
      </section>

      {/* Progress Monitoring */}
      <section id="progress-tracking" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Real-Time Job Monitoring
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          During an active bulk dispatch, Postly renders a live progress bar displaying: sent count, failed count, current send speed (emails/sec), estimated completion time (ETA), and a one-click <strong>Pause / Abort</strong> button.
        </p>
      </section>
    </div>
  );
}

export function PreflightSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
            Dispatch Engine
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Deliverability Protection</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Pre-flight MX & Validation</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Protect your domain reputation and prevent high bounce rates with Postly&apos;s 4-tier automated pre-send validation engine.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* 4-Tier Pipeline */}
      <section id="validation-pipeline" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          The 4-Tier Validation Pipeline
        </h2>
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
          <Table>
            <TableHeader className="bg-zinc-900/60">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-300 font-bold">Tier</TableHead>
                <TableHead className="text-zinc-300 font-bold">Inspection Type</TableHead>
                <TableHead className="text-zinc-300 font-bold">Behavior on Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs text-primary">Tier 1</TableCell>
                <TableCell className="font-semibold text-white">RFC 5322 Syntax Regex</TableCell>
                <TableCell className="text-xs text-rose-400">Hard reject: Row quarantined, excluded from send</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs text-primary">Tier 2</TableCell>
                <TableCell className="font-semibold text-white">In-Memory Deduplication</TableCell>
                <TableCell className="text-xs text-amber-400">Duplicates highlighted, 1-click &lsquo;Deduplicate&rsquo; available</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs text-primary">Tier 3</TableCell>
                <TableCell className="font-semibold text-white">Live DNS MX Record Lookup</TableCell>
                <TableCell className="text-xs text-amber-400">Flags dead domains (e.g. non-existent MX hosts)</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs text-primary">Tier 4</TableCell>
                <TableCell className="font-semibold text-white">Suppression List Match</TableCell>
                <TableCell className="text-xs text-zinc-400">Automatically suppresses previously bounced addresses</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* MX DNS Check */}
      <section id="mx-dns-checks" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Live DNS MX Resolution
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Before dispatching, Postly queries DNS servers using <code>dns.resolveMx()</code> for recipient domains. If a domain has no valid MX records (e.g. <code>gmial.com</code> or <code>yaho.com</code>), the row is immediately flagged as &ldquo;Invalid Domain&rdquo;, preventing hard bounces that damage your IP score.
        </p>
      </section>
    </div>
  );
}

export function ScheduledSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
            Dispatch Engine
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Automated Timers</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Scheduled Queue & Cron</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Schedule campaigns for future dispatch, handle timezone offsets automatically, and let Postly&apos;s cron engine process pending queue items.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Queue States */}
      <section id="queue-states" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          State Machine: Pending to Sent
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <span className="font-bold text-amber-400">pending</span>
            <span className="text-[11px] text-zinc-400 mt-1 block">Awaiting target timestamp</span>
          </div>
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
            <span className="font-bold text-blue-400">sending</span>
            <span className="text-[11px] text-zinc-400 mt-1 block">Locked by worker stream</span>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
            <span className="font-bold text-emerald-400">sent</span>
            <span className="text-[11px] text-zinc-400 mt-1 block">Completed & logged</span>
          </div>
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
            <span className="font-bold text-rose-400">failed</span>
            <span className="text-[11px] text-zinc-400 mt-1 block">Moved to DLQ</span>
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3">
            <span className="font-bold text-zinc-400">cancelled</span>
            <span className="text-[11px] text-zinc-400 mt-1 block">Aborted by user</span>
          </div>
        </div>
      </section>

      {/* Cron Runner */}
      <section id="cron-runner" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-primary" />
          The Background Cron Runner
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          The queue is queried every 60 seconds by the background cron worker at <code>/api/cron/process-scheduled</code>. It selects rows where <code>status = &apos;pending&apos; AND scheduledAt &lt;= NOW()</code>, atomically locks them into <code>status = &apos;sending&apos;</code>, and dispatches each item through the user&apos;s active SMTP pool.
        </p>
      </section>
    </div>
  );
}
