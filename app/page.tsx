"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Code,
  Eye,
  FileSpreadsheet,
  Layers,
  QrCode,
  Shield,
  Zap,
  Server,
  Lock,
  Check,
  ChevronRight,
  Terminal,
  Activity,
  Sparkles,
  Smartphone,
  ChevronDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LandingPage() {
  // Playground state
  const [demoName, setDemoName] = React.useState("Alex Rivera");
  const [demoCompany, setDemoCompany] = React.useState("Acme Dynamics");
  const [demoEvent, setDemoEvent] = React.useState("Global DevCon 2026");
  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [activeFaq, setActiveFaq] = React.useState<number | null>(null);

  const demoSubject = "Your All-Access Pass to {{event}}";
  const demoBody = `Hi {{name}},\n\nWelcome to {{event}}! We're excited to have {{company}} joining us this year.\n\nYour encrypted check-in pass has been generated. Simply show the dynamic QR code attached to this email at the entry kiosk for instant admission.\n\nWarm regards,\nThe Postly Team`;

  const renderedSubject = demoSubject.replace(/\{\{event\}\}/g, demoEvent);
  const renderedBody = demoBody
    .replace(/\{\{name\}\}/g, demoName)
    .replace(/\{\{company\}\}/g, demoCompany)
    .replace(/\{\{event\}\}/g, demoEvent);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary relative overflow-x-hidden">
      {/* Background Gradients & Grid Pattern */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none -z-10" />
      <div className="fixed top-[-15%] left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Global SaaS Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 transition-transform group-hover:scale-105">
                <Image src="/main-logo.svg" alt="Postly" width={22} height={22} className="h-5.5 w-5.5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight">Postly</span>
                <span className="hidden sm:inline-block text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                  v2.5
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#architecture" className="hover:text-foreground transition-colors">Architecture</Link>
            <Link href="#playground" className="hover:text-foreground transition-colors">Interactive Demo</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm transition-all">
              <Link href="/dashboard">
                Launch Console <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-20 text-center relative z-10">
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Release Announcement Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-secondary/80 backdrop-blur-sm text-xs text-muted-foreground hover:border-primary/40 transition-colors">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold text-foreground">Postly 2.5 Released</span>
            <span className="text-border">|</span>
            <span>Real-time SMTP telemetry & dynamic pass issuance</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-foreground">
            The Email Engine Built for{" "}
            <span className="bg-gradient-to-r from-primary via-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Precision & Scale
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Dispatch high-deliverability transactional campaigns via your own SMTP servers. Validate recipient lists in real-time, generate tamper-proof QR tickets, and monitor delivery telemetry—with zero vendor lock-in.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-7 h-12 shadow-md hover:shadow-lg transition-all">
              <Link href="/dashboard">
                Start Sending Free <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border hover:bg-secondary text-foreground px-7 h-12">
              <Link href="/docs">
                <Terminal className="mr-2 h-4 w-4 text-muted-foreground" /> View API Docs
              </Link>
            </Button>
          </div>

          {/* Trust Metrics Strip */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-border/80 text-left">
            <div className="p-3">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">99.98%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Average Deliverability</div>
            </div>
            <div className="p-3">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">&lt; 180ms</div>
              <div className="text-xs text-muted-foreground mt-0.5">Queue Dispatch Latency</div>
            </div>
            <div className="p-3">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">100%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Data Sovereignty & Privacy</div>
            </div>
            <div className="p-3">
              <div className="text-2xl font-bold font-mono tracking-tight text-foreground">$0</div>
              <div className="text-xs text-muted-foreground mt-0.5">Per-Email Vendor Markups</div>
            </div>
          </div>
        </div>

        {/* High-Fidelity Dashboard Showcase Frame */}
        <div className="mt-14 relative rounded-xl border border-border bg-card/80 p-2 shadow-2xl backdrop-blur-sm max-w-5xl mx-auto overflow-hidden card-glow">
          <div className="rounded-lg border border-border/60 bg-background/95 overflow-hidden">
            {/* Window Topbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-secondary/40">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-amber-500/70" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
                <div className="hidden sm:flex items-center ml-4 px-3 py-1 rounded-md bg-background border border-border text-[11px] font-mono text-muted-foreground">
                  <Lock className="h-3 w-3 mr-1.5 text-primary" /> https://app.postly.internal/monitor
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono text-muted-foreground">SMTP Cluster: Active (4 Nodes)</span>
              </div>
            </div>

            {/* Dashboard Mock Body */}
            <div className="p-5 text-left space-y-5">
              {/* Stat Metric Cards */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <div className="border border-border/80 rounded-lg p-4 bg-card/60">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Dispatched Emails</span>
                  <div className="text-2xl font-bold font-mono text-foreground mt-1">124,800</div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-500">
                    <Activity className="h-3 w-3" /> 100% completed queue
                  </div>
                </div>
                <div className="border border-border/80 rounded-lg p-4 bg-card/60">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Deliverability Rate</span>
                  <div className="text-2xl font-bold font-mono text-emerald-500 mt-1">99.94%</div>
                  <div className="w-full bg-secondary rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[99.9%]" />
                  </div>
                </div>
                <div className="border border-border/80 rounded-lg p-4 bg-card/60">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Unique Open Rate</span>
                  <div className="text-2xl font-bold font-mono text-teal-400 mt-1">54.2%</div>
                  <div className="w-full bg-secondary rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div className="bg-teal-400 h-full w-[54.2%]" />
                  </div>
                </div>
                <div className="border border-border/80 rounded-lg p-4 bg-card/60">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Click Through (CTR)</span>
                  <div className="text-2xl font-bold font-mono text-purple-400 mt-1">38.9%</div>
                  <div className="w-full bg-secondary rounded-full h-1.5 mt-2.5 overflow-hidden">
                    <div className="bg-purple-400 h-full w-[38.9%]" />
                  </div>
                </div>
              </div>

              {/* Real-time Dispatch Pipeline Visualizer */}
              <div className="border border-border/80 rounded-lg p-4 bg-card/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-3 border-b border-border/60 gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Zap className="h-4 w-4 text-primary" /> Active Pipeline: Keynote Invitation Campaign
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">Batch #84920 • TLS 1.3 Verified</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/50 border border-border/60">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">Pre-Send DNS / MX Check</div>
                      <div className="text-[10px] text-muted-foreground">1,250 of 1,250 domains valid</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/50 border border-border/60">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground">Dynamic Pass Injection</div>
                      <div className="text-[10px] text-muted-foreground">Signed QR codes attached</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/50 border border-border/60">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <div>
                      <div className="font-semibold text-foreground">SMTP Failover Engine</div>
                      <div className="text-[10px] text-muted-foreground">Zero dropped sockets</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section id="features" className="scroll-mt-20 py-24 border-t border-border bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Core Platform Capabilities
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Everything You Need to Run High-Impact Mail Operations
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Engineered for organizations that refuse to compromise on data privacy, delivery speed, and custom integration requirements.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Bento Card 1: BYO-SMTP */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all card-glow flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4">
                  <Server className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Connect Any SMTP Relay</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mt-2">
                  Connect any custom SMTP relay—AWS SES, Mailgun, SendGrid, private Postfix servers, or Google Workspace. Maintain full data sovereignty with zero third-party per-email fees.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-border/80 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Automatic host rotation & socket health checks</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Encrypted TLS credential storage in database</li>
              </ul>
            </div>

            {/* Bento Card 2: Pre-Send Recipient Validation */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all card-glow flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Pre-Send DNS & List Sanitization</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mt-2">
                  Prevent bounces before they happen. Our pre-send verification engine performs async DNS MX lookups, scrubs duplicates, and normalizes recipient fields in real-time.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-border/80 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Multi-record MX validation & invalid syntax alerts</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> 1-click duplicate deduplication & null cleansing</li>
              </ul>
            </div>

            {/* Bento Card 3: Dynamic Passes & Ticketing */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all card-glow flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center mb-4">
                  <QrCode className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Dynamic Passes & QR Code Engine</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mt-2">
                  Issue cryptographically secure entry tickets, event badges, and automated PDF certificates. Embed dynamic QR tokens directly into email templates.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-border/80 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Tamper-evident signed payload check-in tokens</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Real-time certificate rendering with PDFKit</li>
              </ul>
            </div>

            {/* Bento Card 4: Gate Scanner PWA */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all card-glow flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Offline-Ready Gate Scanner PWA</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mt-2">
                  Empower on-site event staff with an installable mobile PWA. Instant camera-based QR decoding, live check-in validation, and double-scan prevention.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-border/80 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> PIN-protected operator access without full admin rights</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Sub-second verification with audio & haptic feedback</li>
              </ul>
            </div>

            {/* Bento Card 5: Real-time Telemetry */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all card-glow flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-500 flex items-center justify-center mb-4">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Granular Telemetry & Quarantine</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mt-2">
                  Track open rates, link click conversions, recipient device types, and geographic location. Automatically quarantine failed addresses to preserve sender reputation.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-border/80 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Zero-pixel transparent open tracking & link rewrite</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> 1-click batch retries on transient connection errors</li>
              </ul>
            </div>

            {/* Bento Card 6: Visual & HTML Composer */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/40 transition-all card-glow flex flex-col justify-between">
              <div>
                <div className="h-10 w-10 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-500 flex items-center justify-center mb-4">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Dual WYSIWYG & Code Editor</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mt-2">
                  Write personalized emails using our rich-text visual designer or switch to syntax-highlighted HTML code mode. Auto-complete merge fields with real-time preview.
                </p>
              </div>
              <ul className="mt-6 pt-4 border-t border-border/80 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> Built-in template manager with reusable snippets</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" /> DOMPurify sanitization & safe CSS inline engine</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Personalization & Merge Playground */}
      <section id="playground" className="scroll-mt-20 py-24 border-t border-border relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            {/* Playground Controls */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                <Code className="h-3.5 w-3.5" /> Interactive Sandbox
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Dynamic Personalization Engine
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Postly automatically detects merge variables (like <code className="text-primary font-mono text-xs font-semibold bg-secondary px-1.5 py-0.5 rounded">{"{{name}}"}</code>, <code className="text-primary font-mono text-xs font-semibold bg-secondary px-1.5 py-0.5 rounded">{"{{event}}"}</code>) and interpolates them at dispatch time. Test it live in this sandbox:
              </p>

              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="s-name" className="text-xs font-semibold text-foreground">Recipient Name (<code className="font-mono text-[11px]">{"{{name}}"}</code>)</Label>
                  <Input
                    id="s-name"
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    className="bg-card border-border text-foreground text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-company" className="text-xs font-semibold text-foreground">Organization (<code className="font-mono text-[11px]">{"{{company}}"}</code>)</Label>
                  <Input
                    id="s-company"
                    value={demoCompany}
                    onChange={(e) => setDemoCompany(e.target.value)}
                    className="bg-card border-border text-foreground text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-event" className="text-xs font-semibold text-foreground">Campaign / Event Title (<code className="font-mono text-[11px]">{"{{event}}"}</code>)</Label>
                  <Input
                    id="s-event"
                    value={demoEvent}
                    onChange={(e) => setDemoEvent(e.target.value)}
                    className="bg-card border-border text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs">
                  <Link href="/compose">Test with Real SMTP Relay</Link>
                </Button>
                <span className="text-xs text-muted-foreground">Zero setup needed to test drafts</span>
              </div>
            </div>

            {/* Live Rendered Email Preview Container */}
            <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden card-glow">
              {/* Preview Window Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">Live Message Output</span>
                </div>
                {/* Device Switcher */}
                <div className="flex items-center p-0.5 rounded-lg border border-border bg-background">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      previewDevice === "desktop" ? "bg-secondary text-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                      previewDevice === "mobile" ? "bg-secondary text-foreground font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Mobile
                  </button>
                </div>
              </div>

              {/* Rendered View */}
              <div className={`p-5 transition-all ${previewDevice === "mobile" ? "max-w-xs mx-auto my-4 border border-border rounded-xl bg-background/90 shadow-lg" : ""}`}>
                <div className="space-y-3">
                  <div className="rounded-lg bg-secondary/60 p-3 border border-border/80">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Subject</span>
                    <div className="font-semibold text-sm text-foreground mt-0.5">{renderedSubject}</div>
                  </div>

                  <div className="rounded-lg bg-secondary/40 p-4 border border-border/80 space-y-4">
                    <div className="text-xs text-muted-foreground border-b border-border/60 pb-2 flex justify-between">
                      <span>To: <strong>{demoName} &lt;{demoName.toLowerCase().replace(/\s+/g, ".")}@{demoCompany.toLowerCase().replace(/\s+/g, "")}.com&gt;</strong></span>
                      <span className="text-primary font-mono text-[10px]">Verified</span>
                    </div>

                    <pre className="font-sans whitespace-pre-wrap text-foreground text-xs leading-relaxed">{renderedBody}</pre>

                    {/* Dynamic Attached Pass Simulation */}
                    <div className="border border-border rounded-lg p-3 bg-background flex items-center gap-3 mt-4">
                      <div className="h-12 w-12 rounded border border-border bg-white flex items-center justify-center shrink-0">
                        <QrCode className="h-9 w-9 text-slate-900" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-foreground truncate">PASS-{demoName.split(" ")[0].toUpperCase()}-TICKET.PDF</div>
                        <div className="text-[10px] text-muted-foreground">Dynamic check-in token • Signed SHA-256</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Auto Attached</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent SaaS Pricing */}
      <section id="pricing" className="scroll-mt-20 py-24 border-t border-border bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
              <Shield className="h-3.5 w-3.5" /> Predictable SaaS Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Simple, Transparent Plans Without Email Markups
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Because you connect your own SMTP relay, you never pay per-email penalties as your subscriber base grows.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
            {/* Community Tier */}
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between hover:border-border/80 transition-all">
              <div>
                <h3 className="text-lg font-bold text-foreground">Community</h3>
                <p className="text-xs text-muted-foreground mt-1">For indie hackers and self-hosters.</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold font-mono text-foreground">$0</span>
                  <span className="text-xs text-muted-foreground">/ month forever</span>
                </div>
                <ul className="mt-6 space-y-3 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Single SMTP relay connection</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited emails via your credentials</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Visual & HTML campaign composer</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Pre-send DNS MX lookup</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Community GitHub support</li>
                </ul>
              </div>
              <Button asChild variant="outline" className="w-full mt-8 border-border hover:bg-secondary">
                <Link href="/dashboard">Get Started Free</Link>
              </Button>
            </div>

            {/* Pro Tier (Featured) */}
            <div className="rounded-xl border-2 border-primary bg-card p-6 flex flex-col justify-between shadow-lg relative card-glow">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                Most Popular
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Professional</h3>
                <p className="text-xs text-muted-foreground mt-1">For scaling teams, events, and organizations.</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold font-mono text-foreground">$29</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                </div>
                <ul className="mt-6 space-y-3 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Multi-node SMTP clustering & failover</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Dynamic QR pass issuance & verification</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Offline-ready Gate Scanner PWA (5 operator seats)</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Real-time telemetry: opens, clicks, device & geo</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Automated bounce quarantine & list cleansing</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Priority email support</li>
                </ul>
              </div>
              <Button asChild className="w-full mt-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                <Link href="/signup">Start 14-Day Free Trial</Link>
              </Button>
            </div>

            {/* Enterprise Tier */}
            <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between hover:border-border/80 transition-all">
              <div>
                <h3 className="text-lg font-bold text-foreground">Enterprise</h3>
                <p className="text-xs text-muted-foreground mt-1">For mission-critical infrastructure & high-volume events.</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold font-mono text-foreground">Custom</span>
                </div>
                <ul className="mt-6 space-y-3 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited operator seats & cluster nodes</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Dedicated IP warmup guidance</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Custom SAML / SSO authentication</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Real-time audit log streaming to SIEM</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 99.99% Uptime SLA & dedicated Slack channel</li>
                </ul>
              </div>
              <Button asChild variant="outline" className="w-full mt-8 border-border hover:bg-secondary">
                <a href="mailto:vt.gowreesh43@gmail.com?subject=Postly%20Enterprise%20Inquiry">Contact Sales</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials / Social Proof */}
      <section className="py-24 border-t border-border relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-3xl font-extrabold text-foreground">Trusted by Engineers & Event Leads</h2>
            <p className="text-muted-foreground text-sm">See how teams run their communications without third-party vendor lock-in.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                &ldquo;Switching to Postly cut our transactional email costs by 85%. Connecting our AWS SES cluster took 3 minutes, and the pre-send DNS checks immediately caught bad emails before they could harm our sender reputation.&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                <div className="h-9 w-9 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-xs">
                  DK
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">David K.</div>
                  <div className="text-[10px] text-muted-foreground">VP of Engineering, ScaleCloud</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                &ldquo;We issued 8,000 attendee tickets with dynamic QR codes for our annual summit. Our door staff used the mobile scanner PWA on standard phones—zero hardware rentals, sub-second check-ins, and zero double admissions.&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                <div className="h-9 w-9 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-xs">
                  SR
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Sarah R.</div>
                  <div className="text-[10px] text-muted-foreground">Head of Event Operations, SummitCorp</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                &ldquo;The real-time telemetry is outstanding. Being able to see exact device distributions and immediate bounce quarantine without storing sensitive data on third-party marketing servers gives our compliance team complete peace of mind.&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                <div className="h-9 w-9 rounded-full bg-purple-500/20 text-purple-500 font-bold flex items-center justify-center text-xs">
                  MC
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Marcus C.</div>
                  <div className="text-[10px] text-muted-foreground">Lead Architect, FinSecure Systems</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-24 border-t border-border bg-secondary/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 space-y-2">
            <h2 className="text-3xl font-extrabold text-foreground">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-sm">Everything you need to know about Postly architecture and delivery.</p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "What SMTP servers and mail relays does Postly support?",
                a: "Postly supports any standard SMTP server protocol with TLS/SSL encryption. This includes Amazon SES, SendGrid, Mailgun, Postmark, private Postfix/Exim installations, and Google Workspace SMTP relays."
              },
              {
                q: "How does the dynamic QR ticket and pass generation work?",
                a: "You can embed dynamic placeholder tags in your emails or certificates. At dispatch time, Postly generates a secure, signed token and renders high-density QR graphics directly as attachments or inline elements."
              },
              {
                q: "Can the Gate Scanner PWA operate without an internet connection?",
                a: "Yes. The scanner PWA includes service worker offline caching and can validate tickets or buffer check-in scans locally during transient connectivity drops, syncing logs once the connection is restored."
              },
              {
                q: "Does Postly store or sell my recipient lists?",
                a: "Never. Postly is built with strict privacy and data sovereignty in mind. Recipient lists and SMTP credentials remain entirely in your isolated workspace database."
              },
              {
                q: "Can I schedule bulk campaigns to send during optimal delivery windows?",
                a: "Yes. Postly includes an automated background cron scheduler that automatically queues, monitors, and dispatches batches at exact specified dates and times."
              }
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-lg border border-border bg-card overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between text-sm font-semibold text-foreground hover:bg-secondary/40 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      activeFaq === index ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {activeFaq === index && (
                  <div className="px-5 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 border-t border-border relative z-10 text-center bg-card/60">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Take Control of Your Email Delivery Today
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Join thousands of developers and operational teams sending reliable, verified emails with complete data sovereignty.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-12 shadow-md">
              <Link href="/dashboard">
                Launch Console Now <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border hover:bg-secondary text-foreground px-8 h-12">
              <Link href="/login">Verify Existing Account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Enterprise Multi-Column SaaS Footer */}
      <footer className="border-t border-border bg-card py-12 relative z-10 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
                  <Image src="/main-logo.svg" alt="Postly" width={18} height={18} />
                </div>
                <span className="font-bold text-sm text-foreground tracking-tight">Postly</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                Enterprise email dispatch engine and dynamic ticket issuance infrastructure. Zero vendor lock-in, automated list verification, and real-time deliverability observability.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-mono text-muted-foreground">All systems operational</span>
              </div>
            </div>

            <div>
              <div className="font-semibold text-foreground uppercase tracking-wider text-[11px] mb-3">Product</div>
              <ul className="space-y-2">
                <li><Link href="#features" className="hover:text-foreground transition-colors">WYSIWYG Composer</Link></li>
                <li><Link href="#features" className="hover:text-foreground transition-colors">Pre-Send Sanitizer</Link></li>
                <li><Link href="#features" className="hover:text-foreground transition-colors">Dynamic QR Passes</Link></li>
                <li><Link href="/scan" className="hover:text-foreground transition-colors">Gate Scanner PWA</Link></li>
                <li><Link href="#features" className="hover:text-foreground transition-colors">Telemetry & Quarantine</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-foreground uppercase tracking-wider text-[11px] mb-3">Resources</div>
              <ul className="space-y-2">
                <li><Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link href="/docs" className="hover:text-foreground transition-colors">API Reference</Link></li>
                <li><Link href="/docs" className="hover:text-foreground transition-colors">SMTP Setup Guide</Link></li>
                <li><Link href="/docs" className="hover:text-foreground transition-colors">QR Token Specs</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-semibold text-foreground uppercase tracking-wider text-[11px] mb-3">Legal & Security</div>
              <ul className="space-y-2">
                <li><Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="/docs" className="hover:text-foreground transition-colors">Security Overview</Link></li>
                <li><Link href="/docs" className="hover:text-foreground transition-colors">Data Processing</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <div>&copy; {new Date().getFullYear()} Postly Technologies Inc. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="/terms-of-service" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="/docs" className="hover:text-foreground transition-colors">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
