"use client";

import * as React from "react";
import {
  Lock,
  Users,
  AlertTriangle,
  BarChart,
  Bell,
  Smartphone
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function RbacRolesSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
            Security & Governance
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Access Control</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Access Control & Roles</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Granular Role-Based Access Control (RBAC) separating Super Administrators, Workspace Members, and Gate Operators.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Permissions Matrix */}
      <section id="role-hierarchy" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Role Hierarchy & Permissions Matrix
        </h2>
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
          <Table>
            <TableHeader className="bg-zinc-900/60">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-300 font-bold">Feature / Action</TableHead>
                <TableHead className="text-zinc-300 font-bold">Admin</TableHead>
                <TableHead className="text-zinc-300 font-bold">Workspace Member</TableHead>
                <TableHead className="text-zinc-300 font-bold">Operator</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">SMTP Pool Configuration</TableCell>
                <TableCell className="text-xs text-emerald-400 font-bold">Full Access</TableCell>
                <TableCell className="text-xs text-zinc-300">Own Relays Only</TableCell>
                <TableCell className="text-xs text-zinc-600">No Access</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Compose & Bulk Campaigns</TableCell>
                <TableCell className="text-xs text-emerald-400 font-bold">Full Access</TableCell>
                <TableCell className="text-xs text-emerald-400 font-bold">Full Access</TableCell>
                <TableCell className="text-xs text-zinc-600">No Access</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Template & Certificate Studio</TableCell>
                <TableCell className="text-xs text-emerald-400 font-bold">Full Access</TableCell>
                <TableCell className="text-xs text-emerald-400 font-bold">Full Access</TableCell>
                <TableCell className="text-xs text-zinc-600">No Access</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Operator Mobile Scanner</TableCell>
                <TableCell className="text-xs text-emerald-400 font-bold">Manage & Scan</TableCell>
                <TableCell className="text-xs text-zinc-600">No Access</TableCell>
                <TableCell className="text-xs text-emerald-400 font-bold">Assigned Passes Only</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Audit Logs & Quota Overrides</TableCell>
                <TableCell className="text-xs text-emerald-400 font-bold">Full Access</TableCell>
                <TableCell className="text-xs text-zinc-600">No Access</TableCell>
                <TableCell className="text-xs text-zinc-600">No Access</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

export function QuotasSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
            Security & Governance
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Rate Limiting</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Send Quotas & Rate Limits</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Enforce daily and monthly sending caps per tenant to safeguard sender domain reputation and prevent unauthorized usage spikes.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Quotas */}
      <section id="quota-levels" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          Daily & Monthly Quota Enforcement
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Administrators can assign quotas to any user account under <strong>Admin Console → Quotas</strong>:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1">
            <span className="font-bold text-white text-sm">Daily Sending Limit</span>
            <p className="text-zinc-400 leading-relaxed">
              Resets automatically at 00:00 UTC every midnight. Useful for aligning with Google Workspace (2,000/day) or trial accounts.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1">
            <span className="font-bold text-white text-sm">Monthly Ceiling</span>
            <p className="text-zinc-400 leading-relaxed">
              Calculates rolling 30-day usage to prevent exceeding overall monthly cloud allowances (e.g. AWS free tier 62,000/month).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AuditAnomaliesSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
            Security & Governance
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Compliance</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Audit Trail & Anomaly Engine</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Immutable audit logs across AUTH, EMAIL, and ADMIN categories, coupled with real-time heuristic anomaly detection.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Heuristics */}
      <section id="anomaly-detection-rules" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          Heuristic Anomaly Detection Rules
        </h2>
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
          <Table>
            <TableHeader className="bg-zinc-900/60">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-300 font-bold">Observed Activity</TableHead>
                <TableHead className="text-zinc-300 font-bold">Severity</TableHead>
                <TableHead className="text-zinc-300 font-bold">Flagged Security Alert</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">200+ emails dispatched in &lt; 2 minutes</TableCell>
                <TableCell className="text-xs font-bold text-amber-400 uppercase">Warning</TableCell>
                <TableCell className="text-xs text-amber-400">⚠️ Unusually high send velocity spike</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">5+ failed logins from same IP in 10 minutes</TableCell>
                <TableCell className="text-xs font-bold text-rose-400 uppercase">Critical</TableCell>
                <TableCell className="text-xs text-rose-400">🚨 Potential credential brute-force attack</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-white">Admin role granted between 11 PM and 5 AM</TableCell>
                <TableCell className="text-xs font-bold text-amber-400 uppercase">Warning</TableCell>
                <TableCell className="text-xs text-amber-400">⚠️ Off-hours privilege escalation</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

export function DomainAnalyticsSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
            Security & Governance
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Deliverability</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Domain & ISP Analytics</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Monitor deliverability health across specific mailbox providers: Gmail, Microsoft Outlook, Yahoo, and Corporate domains.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* ISP Breakdown */}
      <section id="isp-aggregation" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart className="h-5 w-5 text-primary" />
          Automated Domain & ISP Grouping
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Under <strong>Admin Console → Domain Analytics</strong>, Postly automatically clusters recipient email addresses by their parent mail infrastructure (e.g. <code>gmail.com</code>, <code>outlook.com</code>, <code>yahoo.com</code>, and enterprise domains). This reveals if your emails are being filtered by a specific spam filter while landing safely in others.
        </p>
      </section>
    </div>
  );
}

export function AnnouncementsPushSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
            Security & Governance
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Broadcasts</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Announcements & Web Push</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Notify all workspace members of scheduled maintenance or urgent deliverability notices, and receive Web Push notifications on your device.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Banners & Push */}
      <section id="broadcast-banners" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-400" />
          Global Announcement Banners
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Administrators can publish system banners with levels <strong>Info</strong>, <strong>Warning</strong>, or <strong>Critical</strong>. Banners appear at the top of every authenticated user page and can be individually dismissed per user.
        </p>
      </section>

      <section id="web-push-vapid" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-emerald-400" />
          VAPID Web Push Notification Setup
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Users can enable browser notifications in <strong>Settings → App & Notifications</strong>. Postly signs notifications using standard VAPID Web Push keys, delivering instant desktop and mobile notifications when bulk campaigns finish or when the DLQ records an error spike.
        </p>
      </section>
    </div>
  );
}
