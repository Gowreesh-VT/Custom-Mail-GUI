"use client";

import * as React from "react";
import {
  Server,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Activity,
  Layers
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FailoverSimulator } from "../failover-simulator";

export function SmtpPoolSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Infrastructure & SMTP
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Core Reliability</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">SMTP Server Pool & Failover</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Postly v2.5 features an enterprise-grade multi-server SMTP pool. Configure primary and secondary relays to guarantee zero dropped emails during provider rate limits, authentication glitches, or cloud outages.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Pool Concept */}
      <section id="pool-concept" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          Pool Architecture & Dual Roles
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Every tenant user can maintain an arbitrary number of SMTP relay configurations within their workspace pool. Each entry represents a distinct physical or cloud mail relay (e.g. Amazon SES, Zoho ZeptoMail, Google Workspace, or on-premise Postfix).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Primary Relay</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">DEFAULT DISPATCH</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              The main engine used for all outbound campaign and transactional sends. Highly optimized for your highest sending volume and deliverability tier.
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Fallback Relay</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">HOT STANDBY</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Pre-warmed secondary relay waiting in standby. When a transmission fails on the primary node due to a timeout or provider outage, Postly automatically reroutes the payload through this relay.
            </p>
          </div>
        </div>
      </section>

      {/* Failover Triggers */}
      <section id="failover-triggers" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          Automatic Failover Triggers
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Postly incorporates an intelligent circuit-breaker heuristic. Not all errors warrant a failover (e.g., an invalid recipient address <code>550 No such user</code> should fail fast, rather than retrying through fallback). The system automatically triggers fallback under the following transient conditions:
        </p>
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
          <Table>
            <TableHeader className="bg-zinc-900/60">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-300 font-bold">Trigger Condition</TableHead>
                <TableHead className="text-zinc-300 font-bold">SMTP / Socket Code</TableHead>
                <TableHead className="text-zinc-300 font-bold">Automated Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Connection Timeout</TableCell>
                <TableCell className="text-xs font-mono text-amber-400">ETIMEDOUT / ESOCKETTIMEDOUT</TableCell>
                <TableCell className="text-xs text-zinc-400">Instantly switch to Fallback node within 250ms</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Provider Rate Limit Hit</TableCell>
                <TableCell className="text-xs font-mono text-amber-400">421 4.7.0 / 451 4.3.0</TableCell>
                <TableCell className="text-xs text-zinc-400">Reroute remainder of batch to Fallback relay</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Credentials Expired / Revoked</TableCell>
                <TableCell className="text-xs font-mono text-rose-400">535 5.7.8 Authentication failed</TableCell>
                <TableCell className="text-xs text-zinc-400">Flag primary node in dashboard, dispatch via Fallback</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">DNS / Relay Unreachable</TableCell>
                <TableCell className="text-xs font-mono text-amber-400">ENOTFOUND / ECONNREFUSED</TableCell>
                <TableCell className="text-xs text-zinc-400">Fallback relay activated, alert recorded in SmtpFallbackLog</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Interactive Failover Demo */}
      <section id="interactive-failover-demo" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-400" />
          Interactive Failover Demonstration
        </h2>
        <FailoverSimulator />
      </section>

      {/* Managing Server Entries */}
      <section id="pool-management-ui" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Managing Server Entries in Settings
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Navigate to <strong>Preferences → Settings → SMTP Connection</strong>. The <em>SMTP Server Pool</em> card displays all configured relays along with their live status, average latency, and one-click role assignment buttons:
        </p>
        <ul className="space-y-2 text-xs text-zinc-400 pl-4 list-disc">
          <li><strong>Set Primary:</strong> Designates this entry as the main outbound dispatch server.</li>
          <li><strong>Set Fallback:</strong> Designates this entry as the failover standby node.</li>
          <li><strong>Test:</strong> Sends a four-way handshake ping (EHLO, STARTTLS, AUTH, QUIT) without sending an email to measure latency.</li>
          <li><strong>Delete / Edit:</strong> Updates server credentials or removes obsolete relays.</li>
        </ul>
      </section>

      {/* Fallback Audit Trail */}
      <section id="fallback-audit-trail" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Fallback Logging & Audit Inspection
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Every time a failover occurs, Postly writes a persistent record to the <code>SmtpFallbackLog</code> database table, recording:
        </p>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 space-y-1">
          <div><span className="text-zinc-500">primaryError:</span> &quot;ETIMEDOUT: Connection socket hung up after 5000ms&quot;</div>
          <div><span className="text-zinc-500">primaryErrorCode:</span> &quot;ETIMEDOUT&quot;</div>
          <div><span className="text-zinc-500">fallbackUsed:</span> true</div>
          <div><span className="text-zinc-500">fallbackSuccess:</span> true</div>
          <div><span className="text-zinc-500">latencyMs:</span> 184</div>
        </div>
      </section>
    </div>
  );
}

export function ProvidersSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Infrastructure & SMTP
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Recipes</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Provider Setup Guides</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Step-by-step connection recipes and best practices for the most popular transactional and enterprise email relays.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Gmail / Google Workspace */}
      <section id="provider-gmail" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-bold">1.</span> Google Workspace & Gmail (App Passwords)
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Google requires 2-Step Verification and a dedicated 16-character <strong>App Password</strong> for SMTP authentication. Standard account passwords will be rejected with error <code>535-5.7.8</code>.
        </p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-xs">
          <div className="font-semibold text-white">How to generate a Gmail App Password:</div>
          <ol className="list-decimal pl-5 space-y-1.5 text-zinc-400">
            <li>Open your Google Account security settings at <code className="text-primary">myaccount.google.com/security</code>.</li>
            <li>Ensure <strong>2-Step Verification</strong> is enabled.</li>
            <li>Search for <strong>&ldquo;App Passwords&rdquo;</strong> in the search bar.</li>
            <li>Create a new password labeled <code>Postly Mail Engine</code> and copy the 16-letter code.</li>
          </ol>
          <div className="mt-3 pt-3 border-t border-zinc-800 font-mono text-zinc-300 space-y-1">
            <div>SMTP Host: <span className="text-emerald-400">smtp.gmail.com</span></div>
            <div>Port: <span className="text-emerald-400">587</span> (TLS) or <span className="text-emerald-400">465</span> (SSL)</div>
            <div>Username: <span className="text-emerald-400">your.email@yourdomain.com</span></div>
            <div>Encryption: <span className="text-emerald-400">TLS</span></div>
          </div>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span><strong>Sending Quota Note:</strong> Free Gmail accounts have a hard ceiling of 500 emails/day. Paid Google Workspace accounts allow up to 2,000 emails/day. For higher volume, use Amazon SES or ZeptoMail.</span>
        </div>
      </section>

      {/* Amazon SES */}
      <section id="provider-ses" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-bold">2.</span> Amazon Simple Email Service (SES)
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Amazon SES is the gold standard for high-volume, low-cost delivery ($0.10 per 1,000 emails).
        </p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-xs font-mono text-zinc-300">
          <div>SMTP Host: <span className="text-emerald-400">email-smtp.us-east-1.amazonaws.com</span> (Match your AWS region)</div>
          <div>Port: <span className="text-emerald-400">587</span> (STARTTLS)</div>
          <div>Username: <span className="text-emerald-400">AKIAIOSFODNN7EXAMPLE</span> (IAM SMTP Username)</div>
          <div>Password: <span className="text-emerald-400">BM/0uEXAMPLEpassKey/SecretHash</span> (Generated SMTP Secret)</div>
          <div>Encryption: <span className="text-emerald-400">TLS</span></div>
        </div>
        <p className="text-xs text-zinc-400">
          * Ensure your AWS SES account is moved out of the SES Sandbox to dispatch emails to unverified recipient domains.
        </p>
      </section>

      {/* ZeptoMail */}
      <section id="provider-zeptomail" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-bold">3.</span> Zoho ZeptoMail
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          ZeptoMail is engineered strictly for transactional and event notifications with dedicated IP isolation.
        </p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-xs font-mono text-zinc-300">
          <div>SMTP Host: <span className="text-emerald-400">smtp.zeptomail.in</span> (or .com / .eu)</div>
          <div>Port: <span className="text-emerald-400">587</span> (STARTTLS)</div>
          <div>Username: <span className="text-emerald-400">emailapikey</span></div>
          <div>Password: <span className="text-emerald-400">PHtE6602EXAMPLETokenFromMailAgent</span></div>
          <div>Encryption: <span className="text-emerald-400">TLS</span></div>
        </div>
      </section>

      {/* SendGrid */}
      <section id="provider-sendgrid" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-bold">4.</span> SendGrid / Twilio
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-xs font-mono text-zinc-300">
          <div>SMTP Host: <span className="text-emerald-400">smtp.sendgrid.net</span></div>
          <div>Port: <span className="text-emerald-400">587</span> (STARTTLS)</div>
          <div>Username: <span className="text-emerald-400">apikey</span> (Literal string &ldquo;apikey&rdquo;)</div>
          <div>Password: <span className="text-emerald-400">SG.EXAMPLE_API_KEY_STRING</span></div>
          <div>Encryption: <span className="text-emerald-400">TLS</span></div>
        </div>
      </section>

      {/* Custom Postfix */}
      <section id="provider-custom-postfix" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-primary font-bold">5.</span> Custom Postfix / Local SMTP Relay
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          For completely private on-premise deployments or Dockerized mail clusters:
        </p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-xs font-mono text-zinc-300">
          <div>SMTP Host: <span className="text-emerald-400">mail.internal.corp</span> or <span className="text-emerald-400">127.0.0.1</span></div>
          <div>Port: <span className="text-emerald-400">25</span> or <span className="text-emerald-400">587</span></div>
          <div>Reject Unauthorized TLS: <span className="text-emerald-400">Toggle OFF</span> (if using self-signed internal certs)</div>
        </div>
      </section>
    </div>
  );
}

export function HealthLatencySection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Infrastructure & SMTP
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Health Diagnostics</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Health Checks & Latency</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Continuous connection probing, handshake verification, and millisecond latency telemetry across your active SMTP relays.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Handshake Procedure */}
      <section id="handshake-procedure" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          The 4-Way SMTP Handshake Test
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          When you click <strong>&ldquo;Test&rdquo;</strong> on any relay in Postly, the worker executes a full socket test without sending an email:
        </p>
        <div className="space-y-2 text-xs">
          {[
            { step: "1. TCP Connect", desc: "Opens socket to host:port. Measures TCP round-trip establishment time." },
            { step: "2. EHLO / Greeting", desc: "Validates SMTP banner (220) and queries server capabilities (8BITMIME, SIZE, STARTTLS)." },
            { step: "3. TLS Negotiation", desc: "Upgrades plain connection to encrypted TLS cipher tunnel. Verifies certificate authenticity." },
            { step: "4. AUTH Handshake", desc: "Tests credentials via AUTH LOGIN / PLAIN. Confirms 235 Authentication successful, then executes QUIT." }
          ].map((s, i) => (
            <div key={i} className="flex gap-3 items-start rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <span className="font-mono font-bold text-primary shrink-0">{s.step}</span>
              <span className="text-zinc-400">{s.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Latency Benchmarks */}
      <section id="latency-thresholds" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-400" />
          Latency Benchmarks & SLOs
        </h2>
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
          <Table>
            <TableHeader className="bg-zinc-900/60">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-300 font-bold">Latency Range</TableHead>
                <TableHead className="text-zinc-300 font-bold">Classification</TableHead>
                <TableHead className="text-zinc-300 font-bold">Recommended Max Concurrency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs text-emerald-400">&lt; 250ms</TableCell>
                <TableCell className="font-semibold text-emerald-400">Optimal (Ultra-fast)</TableCell>
                <TableCell className="text-xs text-zinc-400">10-15 parallel socket streams</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs text-amber-400">250ms – 1,200ms</TableCell>
                <TableCell className="font-semibold text-amber-400">Normal Cloud Overhead</TableCell>
                <TableCell className="text-xs text-zinc-400">5-8 parallel socket streams</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs text-rose-400">&gt; 1,500ms</TableCell>
                <TableCell className="font-semibold text-rose-400">High Latency / Geo Mismatch</TableCell>
                <TableCell className="text-xs text-zinc-400">Consider switching to a closer cloud relay region</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Historical Health Logs */}
      <section id="historical-logs" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Analyzing Health History
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Postly keeps a rolling historical timeline of all test handshakes in <code>SmtpHealthLog</code>. You can review connection uptime, historical latency drift, and error dumps directly below the server pool cards in Settings.
        </p>
      </section>
    </div>
  );
}
