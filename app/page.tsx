"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight, BarChart3, CheckCircle2, Code, Eye,
  FileSpreadsheet, Layers, Mail, QrCode, Shield,
  MousePointerClick, RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LandingPage() {
  const [demoName, setDemoName] = React.useState("Gowreesh");
  const [demoEvent, setDemoEvent] = React.useState("AI Innovation Summit");
  const [demoSubject ] = React.useState("Your Exclusive invitation to {{event}}!");

  const demoBody = `Hi {{name}},\n\nWe are thrilled to invite you to the upcoming {{event}}! Your personalized check-in QR code is attached to this email. Please scan it at the entry gates.\n\nSee you there!\n\n— The Postly Team`;

  const renderedSubject = demoSubject.replace(/\{\{event\}\}/g, demoEvent).replace(/\{\{name\}\}/g, demoName);
  const renderedBody = demoBody.replace(/\{\{event\}\}/g, demoEvent).replace(/\{\{name\}\}/g, demoName);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-primary selection:text-black overflow-hidden relative">
      {/* Inject Keyframe Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes scan {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.8; }
          100% { top: 0%; opacity: 0.8; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; filter: blur(80px); }
          50% { opacity: 0.6; filter: blur(110px); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-scan-line {
          animation: scan 3s linear infinite;
        }
        .animate-pulse-glow {
          animation: pulse-glow 8s ease-in-out infinite;
        }
        .reveal-on-scroll {
          transition: all 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 animate-pulse-glow pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[450px] h-[450px] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none" />

      {/* Global Header Navigation */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center font-bold text-black text-lg shadow-[0_0_20px_rgba(81,240,168,0.3)] hover:rotate-6 transition-transform">
              M
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
              Postly
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <Link href="#campaign-editor" className="hover:text-primary transition-colors">Campaign Editor</Link>
            <Link href="#analytics-dashboard" className="hover:text-primary transition-colors">Analytics Dashboards</Link>
            <Link href="#operator-portal" className="hover:text-primary transition-colors">Operator App</Link>
            <Link href="#system-audit" className="hover:text-primary transition-colors">System Audit</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-zinc-300 hover:text-white">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-black font-semibold shadow-[0_0_15px_rgba(81,240,168,0.2)]">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 text-center relative z-10">
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Deliver Campaigns with{" "}
            <span className="bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Absolute Precision
            </span>
          </h1>
          <p className="text-base sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Send bulk emails via your own SMTP servers. Validate recipient lists in real-time, generate dynamic QR codes, track click conversions, and audit system activities.
          </p>

          <div className="pt-6 flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/95 text-black text-base font-bold px-8 h-12 shadow-[0_0_25px_rgba(81,240,168,0.3)] transition-transform hover:scale-105">
              <Link href="/compose">
                Launch Campaign Builder <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900/50 px-8 h-12">
              <Link href="/login">Verify Credentials</Link>
            </Button>
          </div>
        </div>

        {/* Dashboard Showcase Frame */}
        <div className="mt-16 relative rounded-2xl border border-zinc-850 bg-zinc-950/40 p-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-sm max-w-5xl mx-auto overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-zinc-900/60">
            <div className="h-3 w-3 rounded-full bg-rose-500/80" />
            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs text-zinc-500 ml-4 font-mono">https://postly.gowreesh.me/sent/campaign/overview</span>
          </div>
          {/* Mock Dashboard Layout */}
          <div className="grid gap-4 md:grid-cols-4 text-left p-2 rounded bg-zinc-950/60">
            <div className="border border-zinc-900 rounded-lg p-4 bg-zinc-900/30">
              <span className="text-[10px] text-zinc-500 font-bold uppercase">Dispatched</span>
              <div className="text-2xl font-black text-white mt-1">12,480</div>
              <div className="w-full bg-zinc-900 rounded-full h-1 mt-3 overflow-hidden">
                <div className="bg-primary h-full w-[95%]" />
              </div>
            </div>
            <div className="border border-zinc-900 rounded-lg p-4 bg-zinc-900/30">
              <span className="text-[10px] text-zinc-500 font-bold uppercase">Delivery Success</span>
              <div className="text-2xl font-black text-green-400 mt-1">99.8%</div>
              <div className="w-full bg-zinc-900 rounded-full h-1 mt-3 overflow-hidden">
                <div className="bg-green-500 h-full w-[99.8%]" />
              </div>
            </div>
            <div className="border border-zinc-900 rounded-lg p-4 bg-zinc-900/30">
              <span className="text-[10px] text-zinc-500 font-bold uppercase">Unique Opens</span>
              <div className="text-2xl font-black text-blue-400 mt-1">74.2%</div>
              <div className="w-full bg-zinc-900 rounded-full h-1 mt-3 overflow-hidden">
                <div className="bg-blue-500 h-full w-[74.2%]" />
              </div>
            </div>
            <div className="border border-zinc-900 rounded-lg p-4 bg-zinc-900/30">
              <span className="text-[10px] text-zinc-500 font-bold uppercase">Click Conversions</span>
              <div className="text-2xl font-black text-purple-400 mt-1">42.6%</div>
              <div className="w-full bg-zinc-900 rounded-full h-1 mt-3 overflow-hidden">
                <div className="bg-purple-500 h-full w-[42.6%]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DETAILED FEATURES SECTIONS WITH ALTERNATING LAYOUTS */}

      {/* Feature Section 1: WYSIWYG Composer (Text Left / Mockup Right) */}
      <section id="campaign-editor" className="scroll-mt-24 py-20 border-t border-zinc-900 relative z-10 bg-zinc-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left text column */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-medium">
                <Layers className="h-3.5 w-3.5" /> WYSIWYG & HTML Editor
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Rich Visual Composer with Dynamic Personalization
              </h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Build campaigns your way. Write customized layouts in standard HTML code or use our intuitive visual designer. Drag, style, and inject custom merge fields like recipient names or tickets effortlessly.
              </p>
              <ul className="space-y-3">
                {[
                  "Dual editing modes: Rich-text visual and syntax-highlighted code viewer",
                  "Auto-detection of merge fields to avoid spelling mistakes",
                  "Direct insertion of styled tracked links and button components"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
              </div>
            </div>

            {/* Right Mockup column (HTML / WYSIWYG Editor Mockup) */}
            <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 shadow-xl hover:border-zinc-700/50 transition-all duration-500">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px]">editor.tsx</Badge>
              </div>
              {/* Mock WYSIWYG Toolbar */}
              <div className="flex flex-wrap gap-1 rounded border border-zinc-800 bg-zinc-950 p-1.5 mb-3">
                <div className="h-5 w-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold">B</div>
                <div className="h-5 w-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-italic">I</div>
                <div className="h-5 w-5 rounded bg-zinc-800 flex items-center justify-center text-[10px] underline">U</div>
                <div className="h-px w-3 bg-zinc-800 self-center rotate-90" />
                <div className="h-5 w-5 rounded bg-zinc-800 flex items-center justify-center"><Mail className="h-3 w-3" /></div>
                <div className="h-5 w-5 rounded bg-primary/20 text-primary flex items-center justify-center"><MousePointerClick className="h-3 w-3" /></div>
              </div>
              {/* Mock Editor Body */}
              <div className="rounded border border-zinc-850 bg-black/40 p-3 min-h-[160px] text-xs font-mono text-zinc-300 space-y-3">
                <div><span className="text-zinc-500">&lt;p&gt;</span>{`Hi {{Name}},`}<span className="text-zinc-500">&lt;/p&gt;</span></div>
                <div><span className="text-zinc-500">&lt;p&gt;</span>{`Thank you for registering. Below is your secure check-in pass.`}<span className="text-zinc-500">&lt;/p&gt;</span></div>
                <div className="pl-4">
                  <span className="inline-block bg-primary text-black px-3 py-1.5 rounded font-bold font-sans text-[10px] cursor-pointer hover:opacity-90 shadow-[0_0_10px_rgba(81,240,168,0.2)]">
                    Download Event Ticket
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 2: CSV Validation (Mockup Left / Text Right) */}
      <section id="csv-validator" className="scroll-mt-24 py-20 border-t border-zinc-900 relative z-10 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left Mockup column (CSV Validation Panel) */}
            <div className="relative rounded-2xl border border-zinc-850 bg-zinc-900/30 p-5 shadow-2xl order-last lg:order-first hover:border-zinc-700/50 transition-all duration-500">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5"><FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Pre-Send Checker</span>
                <span className="text-[10px] text-zinc-500">campaign_contacts.csv</span>
              </div>
              {/* CSV Verification Table Mock */}
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-2.5 rounded text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <span>Recipient</span>
                  <span>MX Verification</span>
                  <span className="text-right">Action</span>
                </div>
                {[
                  { email: "john@deepmind.com", status: "VALID", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                  { email: "test@domain.invalid", status: "NO_MX_RECORD", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
                  { email: "duplicate@gmail.com", status: "DUPLICATE", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" }
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 p-2 rounded border border-zinc-850 text-xs items-center bg-black/20">
                    <span className="truncate font-medium">{row.email}</span>
                    <div>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${row.color}`}>{row.status}</span>
                    </div>
                    <span className="text-right text-[10px] text-zinc-500 hover:text-white cursor-pointer underline">Ignore</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">2 duplicates found</span>
                <Button size="sm" className="bg-emerald-500 text-black text-[10px] font-bold px-3 h-7">
                  <RefreshCw className="h-3 w-3 mr-1" /> Remove Duplicates
                </Button>
              </div>
            </div>

            {/* Right text column */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-medium">
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV Validator & Deduplication
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Intelligent Pre-Send Recipient List Verification
              </h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Ensure maximum deliverability and clean metrics. Our CSV verification pipeline executes real-time server-side DNS checks to verify recipient domains, detects internal duplicates, and highlights formatting errors before sending.
              </p>
              <ul className="space-y-3">
                {[
                  "Batch asynchronous MX domain lookups to verify hosting setups",
                  "Deduplication buttons with Keep First and Keep Last options",
                  "Highlights null entries and bad formatting directly in preview charts"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 3: Operator PWA (Text Left / Mockup Right) */}
      <section id="operator-portal" className="scroll-mt-24 py-20 border-t border-zinc-900 relative z-10 bg-zinc-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left text column */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-medium">
                <QrCode className="h-3.5 w-3.5" /> Gate Operator Scan PWA
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Mobile-Optimized PWA check-in scanner for events
              </h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Turn any smartphone into an event access scanner. Operators log in via PIN to access a secure check-in screen. Automatically scans attendee passes from email bodies and updates validation databases.
              </p>
              <ul className="space-y-3">
                {[
                  "Installable on iOS and Android with full offline caching schemas",
                  "Hardware-accelerated live camera streams for rapid canvas decoding",
                  "Double-scan prevention logic to avoid duplicate admissions"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <Button asChild variant="outline" className="border-zinc-800 text-zinc-300 hover:text-white">
                  <Link href="/scan">Launch Operator Portal</Link>
                </Button>
              </div>
            </div>

            {/* Right Mockup column (Mobile scanner mockup) */}
            <div className="flex justify-center">
              <div className="relative w-[280px] h-[520px] rounded-[36px] border-4 border-zinc-800 bg-zinc-950 p-3 shadow-2xl hover:scale-102 transition-transform duration-500 overflow-hidden">
                {/* Speaker/Camera notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 rounded-full bg-zinc-800 z-30" />

                {/* Mobile screen */}
                <div className="h-full w-full rounded-[26px] bg-zinc-900 border border-zinc-850 p-3 relative flex flex-col justify-between overflow-hidden">
                  {/* PWA Bar */}
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-2 text-[10px] text-zinc-400">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Scanner</span>
                    </div>
                    <span className="font-bold">Operator Portal</span>
                  </div>

                  {/* Scanning Camera View Box */}
                  <div className="relative aspect-square border border-zinc-850 bg-black rounded-lg flex items-center justify-center overflow-hidden my-3">
                    {/* Laser Scanner animation */}
                    <div className="absolute top-0 inset-x-0 h-0.5 bg-primary/80 animate-scan-line z-20" />
                    <QrCode className="h-24 w-24 text-zinc-700/60" />
                    <span className="absolute bottom-2 text-[8px] bg-black/60 px-2 py-0.5 rounded-full text-zinc-400">Environment Feed</span>
                  </div>

                  {/* Mock Validation Response */}
                  <div className="rounded-lg border border-emerald-900/30 bg-emerald-950/20 p-2.5 text-center text-white space-y-1">
                    <span className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto text-xs font-bold">✓</span>
                    <div className="text-xs font-extrabold tracking-tight">ATTENDEE ADMITTED</div>
                    <div className="text-[9px] text-emerald-300">{demoName} ({demoEvent})</div>
                  </div>

                  <Button size="sm" className="w-full bg-primary hover:bg-primary/95 text-black text-[10px] font-bold h-8">
                    Ready for Next scan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 4: Analytics (Mockup Left / Text Right) */}
      <section id="analytics-dashboard" className="scroll-mt-24 py-20 border-t border-zinc-900 relative z-10 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Left Mockup column (Analytics charts mockup) */}
            <div className="relative rounded-2xl border border-zinc-850 bg-zinc-900/30 p-5 shadow-2xl order-last lg:order-first hover:border-zinc-700/50 transition-all duration-500">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-purple-400" /> Tracking Analytics</span>
                <Badge variant="outline" className="text-[9px] text-purple-300 border-purple-500/20">Active Campaign</Badge>
              </div>
              {/* Analytics Device & OS Mock */}
              <div className="space-y-4">
                {/* Horizontal Bar Chart Mock */}
                <div className="space-y-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Browser Distribution</span>
                  <div className="space-y-1.5">
                    {[
                      { name: "Chrome", val: "72%", width: "w-[72%]", color: "bg-blue-500" },
                      { name: "Safari", val: "18%", width: "w-[18%]", color: "bg-purple-500" },
                      { name: "Firefox", val: "10%", width: "w-[10%]", color: "bg-emerald-500" }
                    ].map((b, i) => (
                      <div key={i} className="flex items-center text-xs justify-between">
                        <span className="w-16 text-zinc-400">{b.name}</span>
                        <div className="flex-1 bg-zinc-950 rounded-full h-2 mx-3 overflow-hidden">
                          <div className={`h-full rounded-full ${b.color} ${b.width}`} />
                        </div>
                        <span className="w-8 text-right font-bold font-mono">{b.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-zinc-850 pt-3 grid grid-cols-2 gap-3 text-center">
                  <div className="p-2.5 rounded bg-black/40 border border-zinc-850">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">Email Opens</span>
                    <div className="text-lg font-black text-white mt-0.5">840</div>
                  </div>
                  <div className="p-2.5 rounded bg-black/40 border border-zinc-850">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">Link Clicks</span>
                    <div className="text-lg font-black text-white mt-0.5">386</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right text column */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-medium">
                <BarChart3 className="h-3.5 w-3.5" /> Email open & Click tracking
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Granular Conversion Tracking and Click Reports
              </h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Understand user engagement. Automatically inject invisible open pixels and rewrite URLs. Get logs of recipient activity with geographical IP estimates and client browser user-agents.
              </p>
              <ul className="space-y-3">
                {[
                  "Detailed opens and clicks timeline aggregation for bulk campaigns",
                  "Unique clicks vs total clicks comparisons per recipient",
                  "Device type breakdowns (Desktop, Mobile, Tablet) parsed from user-agents"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Sandbox Showcase */}
      <section id="interactive-sandbox" className="scroll-mt-24 bg-zinc-950/60 border-y border-zinc-900 py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Context Left */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-medium">
                <Code className="h-3.5 w-3.5" /> Interactive Sandbox
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Write Dynamic Templates. Preview Real-Time Merges.
              </h2>
              <p className="text-zinc-400 leading-relaxed text-sm">
                Our template engine automatically intercepts merge variables (like `{"{{name}}"}`) and maps them against CSV datasets. Try editing the input boxes below to see how they inject dynamically!
              </p>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="s-name" className="text-zinc-300">Recipient Name (`{"{{name}}"}`)</Label>
                  <Input id="s-name" value={demoName} onChange={(e) => setDemoName(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-event" className="text-zinc-300">Event / Campaign (`{"{{event}}"}`)</Label>
                  <Input id="s-event" value={demoEvent} onChange={(e) => setDemoEvent(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white" />
                </div>
              </div>
            </div>

            {/* Sandbox Right */}
            <Card className="border-zinc-800 bg-black/40 text-white shadow-2xl backdrop-blur">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Live Send Preview</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/20">SMTP Sandbox</Badge>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="rounded bg-zinc-900/50 p-3 border border-zinc-900">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Subject Line</span>
                    <div className="font-semibold text-white mt-0.5">{renderedSubject}</div>
                  </div>

                  <div className="rounded bg-zinc-900/50 p-3 border border-zinc-900 min-h-48 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Email Body Content</span>
                      <pre className="font-sans whitespace-pre-wrap text-zinc-300 text-xs leading-relaxed">{renderedBody}</pre>
                    </div>
                    {/* Mock Attachment QR */}
                    <div className="border-t border-zinc-900/60 pt-3 mt-4 flex items-center gap-3">
                      <div className="h-10 w-10 border border-zinc-850 rounded bg-white flex items-center justify-center shrink-0">
                        <QrCode className="h-6 w-6 text-black" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-zinc-300">Checkin_Token.png</div>
                        <div className="text-[9px] text-zinc-500">Auto-generated secure QR Code attached</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section id="system-audit" className="scroll-mt-24 relative z-10 border-t border-zinc-900 bg-zinc-950/40 py-20 text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs text-primary font-medium">
            <Shield className="h-3.5 w-3.5" /> System Audit
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white">Visibility, accountability, and control</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-sm leading-relaxed">
            Track sending activity, approvals, and access patterns from one place. Postly keeps operational visibility front and center so your team can review activity and respond quickly.
          </p>
          <div className="grid gap-4 text-left sm:grid-cols-3 pt-2">
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Audit trail</div>
              <div className="mt-2 text-lg font-semibold text-white">Immutable event history</div>
            </div>
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Access review</div>
              <div className="mt-2 text-lg font-semibold text-white">Role-aware visibility</div>
            </div>
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-4">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Security posture</div>
              <div className="mt-2 text-lg font-semibold text-white">Monitor changes in real time</div>
            </div>
          </div>
          <div className="flex justify-center gap-4 pt-2">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/95 text-black font-bold px-8 shadow-[0_0_20px_rgba(81,240,168,0.255)] transition-transform hover:scale-105">
              <Link href="/signup">Create Free Account</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900/60 px-8">
              <Link href="/compose">Go to App</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900/50 bg-black py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-primary text-black font-bold flex items-center justify-center text-[10px]">M</div>
            <span>Postly &copy; 2026. All rights reserved.</span>
          </div>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="/docs" className="hover:text-primary transition-colors">Documentation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
