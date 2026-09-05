"use client";

import * as React from "react";
import {
  Server,
  Zap,
  Shield,
  Layers,
  CheckCircle2,
  Lock,
  Cpu,
  Database
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CodeTabs } from "../code-tabs";

export function OverviewSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
            Getting Started
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Pillar 01</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Platform Overview</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Postly v2.5 is an enterprise-grade, self-hosted mail engine and campaign studio designed for organizations that demand total ownership over their email delivery infrastructure, sender reputation, and recipient data.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* What is Postly */}
      <section id="what-is-postly" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          What is Postly?
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Unlike traditional proprietary SaaS email platforms (which charge steep per-email markups, enforce strict arbitrary sending quotas, and hold your contact lists in closed silos), Postly provides a complete, modern web interface and high-performance dispatch worker layer backed by your own database and SMTP relays.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {[
            {
              title: "Zero Per-Email Markups",
              desc: "Send millions of emails at raw SMTP cost using your existing infrastructure (Amazon SES, ZeptoMail, Gmail Workspace, or self-hosted Postfix)."
            },
            {
              title: "BYO-SMTP Relay Pool",
              desc: "Configure primary and secondary relays with automated circuit breakers and millisecond failover to prevent transmission halts."
            },
            {
              title: "Integrated Event Passes",
              desc: "Generate cryptographically signed dynamic QR passes and issue verified PDF certificates directly inside transactional workflows."
            }
          ].map((card, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-1.5">
              <span className="text-xs font-bold text-white">{card.title}</span>
              <p className="text-xs text-zinc-400 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Pillars */}
      <section id="core-pillars" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Core Platform Pillars
        </h2>
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
          <Table>
            <TableHeader className="bg-zinc-900/60">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-300 font-bold">Subsystem</TableHead>
                <TableHead className="text-zinc-300 font-bold">Capabilities</TableHead>
                <TableHead className="text-zinc-300 font-bold">Latency / Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">SMTP Pool & Failover</TableCell>
                <TableCell className="text-xs text-zinc-400">Multi-relay pool, automated failover on 535/timeout, latency tracking, fallback logs.</TableCell>
                <TableCell className="text-xs font-mono text-emerald-400">&lt; 250ms failover</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Bulk Dispatcher</TableCell>
                <TableCell className="text-xs text-zinc-400">Streaming CSV parsing, RFC syntax check, live MX record DNS verification, rate throttling.</TableCell>
                <TableCell className="text-xs font-mono text-emerald-400">Up to 2,500 msgs/min</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Certificate Studio</TableCell>
                <TableCell className="text-xs text-zinc-400">Vector PDF canvas generator, coordinate font placement, dynamic QR verification badge.</TableCell>
                <TableCell className="text-xs font-mono text-emerald-400">&lt; 80ms render/cert</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Dynamic QR & Scanner</TableCell>
                <TableCell className="text-xs text-zinc-400">HMAC anti-tampering passes, offline PWA gate scanner with IndexedDB synchronization.</TableCell>
                <TableCell className="text-xs font-mono text-emerald-400">Real-time local scan</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Live Telemetry</TableCell>
                <TableCell className="text-xs text-zinc-400">Server-Sent Events (SSE), dead-letter queue recovery, 1-click &lsquo;Retry-All&rsquo; batch re-dispatch.</TableCell>
                <TableCell className="text-xs font-mono text-emerald-400">Sub-second streaming</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Why BYO-SMTP */}
      <section id="why-byo-smtp" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-emerald-400" />
          Why Bring-Your-Own-SMTP?
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Traditional shared-IP email services frequently bundle your deliverability with thousands of other unknown senders. If an unrelated company sends low-quality spam, the shared IP gets blacklisted by Spamhaus or Barracuda, harming your deliverability.
        </p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-3">
          <span className="text-xs font-bold text-zinc-200">The Postly Advantage:</span>
          <ul className="space-y-2 text-xs text-zinc-400">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Independent Sender Reputation:</strong> Your domain establishes its own SPF, DKIM, and DMARC alignment directly with destination ISPs.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Provider Redundancy:</strong> Route high-priority transactional emails through Amazon SES, and fall back to Google Workspace or ZeptoMail without editing application code.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Total Privacy & Compliance:</strong> Recipient lists and message content reside in your database, not on external third-party servers.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Security Model */}
      <section id="security-guarantees" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Security & Privacy Model
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Postly encrypts all SMTP credentials at rest using AES-256-GCM authenticated encryption. Passwords and secret tokens are never logged in clear text or exposed over client telemetry streams.
        </p>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-primary leading-relaxed flex items-center gap-3">
          <Lock className="h-4 w-4 shrink-0 text-primary" />
          <span>Postly uses secure HTTP-only cookies with SameSite strict policies, preventing CSRF and token theft across administrative sessions.</span>
        </div>
      </section>
    </div>
  );
}

export function QuickstartSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
            Getting Started
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Pillar 02</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">5-Minute Quickstart</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Follow this guided walkthrough to configure your first SMTP relay, build a dynamic template, and dispatch your first verified test email.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Steps */}
      <div className="space-y-6">
        <section id="step-1-account" className="space-y-3 scroll-mt-24">
          <div className="flex items-center gap-3">
            <span className="h-7 w-7 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">1</span>
            <h2 className="text-lg font-bold text-white">Account Provisioning & Access</h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed pl-10">
            Navigate to the login portal at <code>/login</code> or initialize your administrator account at <code>/signup</code>. Once logged in, you will be redirected to the Postly Dashboard overview.
          </p>
        </section>

        <section id="step-2-smtp" className="space-y-3 scroll-mt-24">
          <div className="flex items-center gap-3">
            <span className="h-7 w-7 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">2</span>
            <h2 className="text-lg font-bold text-white">Connecting Your First SMTP Relay</h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed pl-10">
            Head to <strong>Preferences → Settings → SMTP Connection</strong>. Click <strong>&ldquo;Add SMTP Server&rdquo;</strong> to configure your primary relay:
          </p>
          <div className="pl-10">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-2 text-xs font-mono text-zinc-300">
              <div>Host: <span className="text-primary">smtp.gmail.com</span> (or your provider)</div>
              <div>Port: <span className="text-primary">587</span> (STARTTLS) or <span className="text-primary">465</span> (SSL)</div>
              <div>Username: <span className="text-primary">you@company.com</span></div>
              <div>Password: <span className="text-primary">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span> (Use 16-char App Password for Gmail)</div>
              <div>Role: <span className="text-emerald-400 font-bold">Set as Primary</span></div>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Click <strong>&ldquo;Test&rdquo;</strong> on the server row. Postly will execute a 4-way handshake test and display the round-trip latency (e.g. <code>Ok (180ms)</code>).
            </p>
          </div>
        </section>

        <section id="step-3-template" className="space-y-3 scroll-mt-24">
          <div className="flex items-center gap-3">
            <span className="h-7 w-7 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">3</span>
            <h2 className="text-lg font-bold text-white">Creating a Dynamic Template</h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed pl-10">
            Go to <strong>Studio → Templates</strong>. Click <strong>&ldquo;New Template&rdquo;</strong> and paste the following HTML snippet containing variable merge tags:
          </p>
          <div className="pl-10">
            <CodeTabs
              tabs={[
                {
                  language: "HTML",
                  filename: "welcome-template.html",
                  code: `<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
  <h2>Welcome to the team, {{name}}!</h2>
  <p>Your workspace access tier is <strong>{{tier}}</strong>.</p>
  <p>Please present your event check-in pass below:</p>
  <div style="text-align: center; margin: 20px 0;">
    {{QR_CODE}}
  </div>
  <p>Confirm your attendance here:</p>
  <p>{{TRACKED_URL:confirm_rsvp:https://company.org/rsvp}}</p>
</div>`
                }
              ]}
            />
          </div>
        </section>

        <section id="step-4-dispatch" className="space-y-3 scroll-mt-24">
          <div className="flex items-center gap-3">
            <span className="h-7 w-7 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">4</span>
            <h2 className="text-lg font-bold text-white">Executing Your First Send</h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed pl-10">
            Click <strong>Dispatch → Compose</strong> in the sidebar. Select the template you just saved. Postly automatically identifies the merge tags (<code>{"{{name}}"}</code>, <code>{"{{tier}}"}</code>) and displays input fields to supply values for this test. Enter your own email address and click <strong>&ldquo;Send Email&rdquo;</strong>.
          </p>
        </section>

        <section id="step-5-telemetry" className="space-y-3 scroll-mt-24">
          <div className="flex items-center gap-3">
            <span className="h-7 w-7 rounded-lg bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">5</span>
            <h2 className="text-lg font-bold text-white">Inspecting Delivery Telemetry</h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed pl-10">
            Navigate to <strong>Observability → Telemetry & Logs</strong>. Observe your live transmission in the real-time event graph, verify the delivery status in <strong>Sent History</strong>, and review open/click events as soon as you open the message in your inbox.
          </p>
        </section>
      </div>
    </div>
  );
}

export function ArchitectureSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
            Getting Started
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Pillar 03</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Architecture & BYO-SMTP</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Deep architectural overview of the Postly runtime, database models, worker concurrency, and zero-trust relay isolation.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* System Flow Diagram */}
      <section id="system-architecture-diagram" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          System Architecture Flow
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center text-xs">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
              <span className="font-bold text-white block">1. Client Layer</span>
              <span className="text-zinc-400 mt-1 block">Next.js 14 App Router, TipTap WYSIWYG, PWA Offline Scanner</span>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
              <span className="font-bold text-primary block">2. API & Queue Gateway</span>
              <span className="text-zinc-400 mt-1 block">Pre-flight validation, MX resolution, quota gatekeeper, token signing</span>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
              <span className="font-bold text-emerald-400 block">3. Failover Engine</span>
              <span className="text-zinc-400 mt-1 block">SmtpPool executor, circuit breaker, instant secondary reroute</span>
            </div>
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
              <span className="font-bold text-blue-400 block">4. Observability Bus</span>
              <span className="text-zinc-400 mt-1 block">SSE stream, dead-letter queue, 1x1 tracking pixel & redirect proxy</span>
            </div>
          </div>
        </div>
      </section>

      {/* BYO-SMTP Concept */}
      <section id="byo-smtp-concept" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          The BYO-SMTP Isolation Model
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          In Postly, each tenant user configures their own SMTP pool entries. Credentials are encrypted in PostgreSQL using AES-256 with tenant salt. When a dispatch job runs, the worker loads the user&apos;s active primary relay, establishes a direct socket connection with the remote mail server (STARTTLS or SSL), and streams the MIME payload.
        </p>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Super Administrators can also optionally configure a <strong>Global System SMTP Relay</strong> in the Admin Console to enforce an enterprise-wide mail server for all users, or lock user SMTP modifications.
        </p>
      </section>

      {/* Database Schema */}
      <section id="storage-database" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Database & Schema Layout
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Postly uses Prisma ORM on PostgreSQL with strict relational foreign keys and cascade delete rules:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            { model: "User", desc: "User credentials, roles ('admin', 'user'), daily/monthly quotas, fallback toggles." },
            { model: "SmtpPool", desc: "Multi-server pool: host, port, AES encrypted password, isPrimary, isFallback flags." },
            { model: "Email", desc: "Full sent audit record, merge data, retry counts, open/click counts, usedFallback flag." },
            { model: "SmtpFallbackLog", desc: "Dedicated log recording primary failure error, timestamp, and fallback outcome." },
            { model: "ScheduledEmail", desc: "Queued dispatches with states: pending, sending, sent, failed, cancelled, missed." },
            { model: "QrCampaign & QrCode", desc: "Tamper-proof HMAC ticket passes, scan logs, and operator assignments." },
            { model: "CertificateTemplate", desc: "PDF base64 canvas template, coordinate dynamic field definitions." },
            { model: "AuditLog", desc: "Comprehensive audit events across AUTH, EMAIL, and ADMIN categories." }
          ].map((item, idx) => (
            <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <span className="font-mono font-bold text-primary">{item.model}</span>
              <p className="text-zinc-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
