"use client";

import * as React from "react";
import {
  ShieldCheck,
  Flame,
  HelpCircle
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DeliverabilitySection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            Production Guides
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">DNS & Auth</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">DKIM, SPF & DMARC Setup</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Google and Yahoo enforce strict email authentication requirements. Without proper SPF, DKIM, and DMARC DNS records, outbound emails will be rejected or placed in the spam folder.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* SPF */}
      <section id="spf-setup" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          Sender Policy Framework (SPF) Records
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          An SPF record is a DNS TXT record on your root domain declaring which mail servers are authorized to send on your behalf:
        </p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-xs font-mono text-zinc-300">
          <div className="text-zinc-500"># TXT record on yourdomain.com</div>
          <div className="text-emerald-400">v=spf1 include:_spf.google.com include:amazonses.com ~all</div>
        </div>
      </section>

      {/* DKIM */}
      <section id="dkim-keys" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          DomainKeys Identified Mail (DKIM) 2048-bit
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          DKIM attaches a cryptographic signature to every outbound email header that matches a public key published in your DNS:
        </p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-xs font-mono text-zinc-300">
          <div className="text-zinc-500"># TXT record on postly._domainkey.yourdomain.com</div>
          <div className="text-primary break-all">v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0sQ...</div>
        </div>
      </section>

      {/* DMARC */}
      <section id="dmarc-policy" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          DMARC Alignment & Reporting (p=reject)
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          DMARC dictates what receiving ISPs should do if an email fails SPF or DKIM checks:
        </p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-xs font-mono text-zinc-300">
          <div className="text-zinc-500"># TXT record on _dmarc.yourdomain.com</div>
          <div className="text-emerald-400">v=DMARC1; p=reject; rua=mailto:dmarc-reports@yourdomain.com; pct=100;</div>
        </div>
      </section>
    </div>
  );
}

export function SmtpErrorsSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            Production Guides
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Diagnostics</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">SMTP Error Dictionary (535, 550)</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Quick reference table for diagnosing raw SMTP error codes returned by remote mail servers.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Codes Table */}
      <section id="common-fixes" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Prescribed Fixes for Common Failures
        </h2>
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
          <Table>
            <TableHeader className="bg-zinc-900/60">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-300 font-bold">Code</TableHead>
                <TableHead className="text-zinc-300 font-bold">Standard Meaning</TableHead>
                <TableHead className="text-zinc-300 font-bold">Root Cause & Resolution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs font-bold text-emerald-400">250 2.0.0</TableCell>
                <TableCell className="font-semibold text-white">OK (Message Accepted)</TableCell>
                <TableCell className="text-xs text-zinc-400">Message successfully accepted for queue delivery.</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs font-bold text-amber-400">421 4.7.0</TableCell>
                <TableCell className="font-semibold text-white">Service Unavailable / Throttled</TableCell>
                <TableCell className="text-xs text-zinc-400">Too many concurrent socket streams. Lower dispatch concurrency in Bulk settings or failover to secondary.</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs font-bold text-amber-400">451 4.3.0</TableCell>
                <TableCell className="font-semibold text-white">Temporary Local Processing Error</TableCell>
                <TableCell className="text-xs text-zinc-400">Destination ISP temporary greylisting or queue congestion. Safe to retry after 5-10 minutes.</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs font-bold text-rose-400">535 5.7.8</TableCell>
                <TableCell className="font-semibold text-white">Authentication Credentials Invalid</TableCell>
                <TableCell className="text-xs text-zinc-400">Password/API key rejected. If using Gmail, make sure to use a 16-character App Password, not your standard login password.</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs font-bold text-rose-400">550 5.1.1</TableCell>
                <TableCell className="font-semibold text-white">Mailbox Does Not Exist</TableCell>
                <TableCell className="text-xs text-zinc-400">Recipient email address is invalid or terminated. Address will be added to suppression list to prevent hard bounce penalties.</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-mono text-xs font-bold text-rose-400">554 5.7.1</TableCell>
                <TableCell className="font-semibold text-white">Relay Access Denied / Spamhaus</TableCell>
                <TableCell className="text-xs text-zinc-400">Your sending IP or domain is listed on a DNSBL blacklist, or DMARC p=reject alignment failed.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

export function IpWarmupSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            Production Guides
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Scaling</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">High-Volume IP Warm-up Ramp</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          If you are sending from a newly registered domain or a fresh dedicated IP address, follow this 30-day volume schedule to build sender trust with anti-spam filters.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Schedule */}
      <section id="30-day-ramp-schedule" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-400" />
          Recommended 30-Day Volume Ramp
        </h2>
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
          <Table>
            <TableHeader className="bg-zinc-900/60">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-300 font-bold">Timeline</TableHead>
                <TableHead className="text-zinc-300 font-bold">Max Daily Volume</TableHead>
                <TableHead className="text-zinc-300 font-bold">Target Audience Recommendation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Days 1 – 3</TableCell>
                <TableCell className="font-mono text-xs text-emerald-400">100 – 250 / day</TableCell>
                <TableCell className="text-xs text-zinc-400">Internal employees, highly engaged test users</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Days 4 – 7</TableCell>
                <TableCell className="font-mono text-xs text-emerald-400">500 – 1,000 / day</TableCell>
                <TableCell className="text-xs text-zinc-400">Active recent purchasers with low expected bounce rate</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Days 8 – 14</TableCell>
                <TableCell className="font-mono text-xs text-amber-400">2,500 – 5,000 / day</TableCell>
                <TableCell className="text-xs text-zinc-400">Newsletter subscribers who opened in the last 30 days</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Days 15 – 21</TableCell>
                <TableCell className="font-mono text-xs text-amber-400">10,000 – 25,000 / day</TableCell>
                <TableCell className="text-xs text-zinc-400">Broader customer list; monitor ISP deliverability in Domain Analytics</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Days 22 – 30+</TableCell>
                <TableCell className="font-mono text-xs text-primary">50,000+ / day</TableCell>
                <TableCell className="text-xs text-zinc-400">Fully warmed reputation; scale to maximum campaign volume</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
