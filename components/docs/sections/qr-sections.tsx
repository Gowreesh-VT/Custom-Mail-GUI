"use client";

import * as React from "react";
import {
  QrCode,
  Smartphone,
  Scan,
  Zap,
  Lock,
  WifiOff
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function QrEngineSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            Dynamic QR & Gate Scanner
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Pass Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Dynamic QR Generation</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Issue cryptographically signed, dynamically branded QR codes for tickets, badges, vouchers, and secure gate admittance at <code>/qr</code>.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Dynamic QR Architecture */}
      <section id="dynamic-qr-overview" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Dynamic QR Architecture
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Static QR codes encode a fixed URL or text that cannot be changed once distributed. In contrast, Postly Dynamic QR codes encode a secure token pointer:
        </p>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
          https://postly.gowreesh.me/qr/{'{qrTokenId}'}
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">
          This allows administrators to update the destination URL, change pass metadata, invalidate stolen tickets, or inspect scan analytics without re-issuing the printed or emailed QR code.
        </p>
      </section>

      {/* Branding */}
      <section id="visual-customization" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          Branding: Colors, Corners & Logos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1">
            <span className="font-bold text-white">Custom Palettes</span>
            <p className="text-zinc-400">Specify brand foreground and background hex colors (e.g. #000000 on #ffffff).</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1">
            <span className="font-bold text-white">Corner Radius</span>
            <p className="text-zinc-400">Render modern rounded QR dots and corner markers with adjustable border radiuses.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1">
            <span className="font-bold text-white">Center Logo Overlay</span>
            <p className="text-zinc-400">Embed your organization logo in the center with high error correction (Level H - 30% recovery).</p>
          </div>
        </div>
      </section>

      {/* Security HMAC */}
      <section id="security-hmac" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          HMAC Anti-Tampering Protection
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          To prevent malicious attendees from crafting fake QR codes or altering ticket parameters, Postly signs the payload using an HMAC-SHA256 signature calculated from the campaign secret key. Gate scanners verify this cryptographic signature locally before validating check-in.
        </p>
      </section>
    </div>
  );
}

export function OperatorPwaSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            Dynamic QR & Gate Scanner
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Staff PWA</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Operator Mobile PWA</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          The Operator portal is an installable, mobile-optimized Progressive Web App (PWA) at <code>/operator</code> designed specifically for venue entrance staff.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* PWA Features */}
      <section id="pwa-features" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          PWA Operator Experience
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Venue gate staff do not require access to your main administrative dashboard. Instead, they log into the dedicated mobile interface using an email and 4-digit PIN:
        </p>
        <ul className="space-y-2 text-xs text-zinc-400 pl-4 list-disc">
          <li><strong>Installable App:</strong> Installable on iOS (Add to Home Screen) and Android with full-screen standalone display.</li>
          <li><strong>Zero Latency Camera Scanner:</strong> Uses <code>html5-qrcode</code> hardware camera stream with auto-focus and torch/flashlight toggle.</li>
          <li><strong>Audio & Haptic Feedback:</strong> High-pitch chime and double vibration for valid entry; low-pitch buzz and long vibration for invalid or already-scanned tickets.</li>
        </ul>
      </section>

      {/* Operator Provisioning */}
      <section id="operator-provisioning" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Lock className="h-5 w-5 text-emerald-400" />
          Creating Operator Accounts & PINs
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Admins create operator accounts under <strong>Admin Console → Operators</strong>. Each operator is assigned specific QR campaigns and given a numeric PIN (hashed via bcrypt in the database).
        </p>
      </section>
    </div>
  );
}

export function GateCheckinSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            Dynamic QR & Gate Scanner
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Offline Gate</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Gate Check-in & Offline</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Maintain continuous venue entry even when cell reception or venue Wi-Fi drops completely.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Check-in Outcomes */}
      <section id="checkin-states" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Scan className="h-5 w-5 text-primary" />
          Scan Verification Outcomes
        </h2>
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
          <Table>
            <TableHeader className="bg-zinc-900/60">
              <TableRow className="border-zinc-800">
                <TableHead className="text-zinc-300 font-bold">Outcome Banner</TableHead>
                <TableHead className="text-zinc-300 font-bold">System Status</TableHead>
                <TableHead className="text-zinc-300 font-bold">Staff Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-emerald-400">✅ VALID PASS</TableCell>
                <TableCell className="text-xs text-zinc-300">Ticket authentic, scanMode once or unlimited, unused.</TableCell>
                <TableCell className="text-xs text-zinc-400">Admit attendee immediately</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-amber-400">⚠️ ALREADY CHECKED IN</TableCell>
                <TableCell className="text-xs text-zinc-300">Single-use pass previously verified. Displays original timestamp.</TableCell>
                <TableCell className="text-xs text-zinc-400">Deny entry; potential duplicate screenshot</TableCell>
              </TableRow>
              <TableRow className="border-zinc-800/60">
                <TableCell className="font-semibold text-rose-400">❌ INVALID / EXPIRED</TableCell>
                <TableCell className="text-xs text-zinc-300">Token signature invalid or expired beyond campaign window.</TableCell>
                <TableCell className="text-xs text-zinc-400">Direct to customer service desk</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Offline Sync */}
      <section id="offline-queue-sync" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <WifiOff className="h-5 w-5 text-amber-400" />
          Offline IndexedDB Sync Pipeline
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          The Operator PWA maintains an in-browser <strong>IndexedDB local cache</strong>. Before an event, operators tap &ldquo;Pre-cache Ticket Registry&rdquo; to download encrypted validation hashes. If connectivity drops during ingress, check-ins are verified locally against the cache and stored in an offline queue. As soon as connectivity returns, the PWA automatically reconciles and syncs the timestamps to the server.
        </p>
      </section>
    </div>
  );
}
