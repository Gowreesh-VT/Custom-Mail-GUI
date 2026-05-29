"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft, BarChart3, CheckCircle2, ClipboardList, Code,
  FileSpreadsheet, Info, LayoutDashboard, Lock, Mail, 
  Pencil, QrCode, Scan, Server, Settings as SettingsIcon, 
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SectionId =
  | "overview"
  | "auth"
  | "smtp"
  | "compose"
  | "templates"
  | "bulk"
  | "qr"
  | "scan"
  | "sent"
  | "analytics"
  | "audit"
  | "settings";

export default function DocsPage() {
  const [activeSection, setActiveSection] = React.useState<SectionId>("overview");

  // Keep a ref to main content to scroll back to top on tab change
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeSection]);

  const navItems: Array<{
    label: string;
    items: Array<{ id: SectionId; label: string; icon: React.ReactNode }>;
  }> = [
    {
      label: "Getting Started",
      items: [
        { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: "auth", label: "Authentication", icon: <Lock className="h-4 w-4" /> },
        { id: "smtp", label: "SMTP Setup", icon: <Server className="h-4 w-4" /> }
      ]
    },
    {
      label: "Sending Email",
      items: [
        { id: "compose", label: "Compose & Send", icon: <Pencil className="h-4 w-4" /> },
        { id: "templates", label: "Templates", icon: <Code className="h-4 w-4" /> },
        { id: "bulk", label: "Bulk Sending", icon: <FileSpreadsheet className="h-4 w-4" /> }
      ]
    },
    {
      label: "QR Codes",
      items: [
        { id: "qr", label: "QR Generation", icon: <QrCode className="h-4 w-4" /> },
        { id: "scan", label: "Scanning & Check-in", icon: <Scan className="h-4 w-4" /> }
      ]
    },
    {
      label: "Analytics",
      items: [
        { id: "sent", label: "Sent Emails", icon: <Mail className="h-4 w-4" /> },
        { id: "analytics", label: "Email Analytics", icon: <BarChart3 className="h-4 w-4" /> }
      ]
    },
    {
      label: "Administration",
      items: [
        { id: "audit", label: "Audit Logs", icon: <ClipboardList className="h-4 w-4" /> },
        { id: "settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4" /> }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-200 font-sans flex flex-col relative">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[450px] h-[450px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-black/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-black text-sm shadow-[0_0_15px_rgba(81,240,168,0.25)] hover:rotate-3 transition-transform">
            M
          </Link>
          <span className="font-extrabold text-sm tracking-tight text-white">Custom-Mail Docs</span>
        </div>
        <Link href="/" passHref legacyBehavior>
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Landing Page
          </Button>
        </Link>
      </header>

      {/* Workspace */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-8 items-start min-h-0">
        {/* Navigation Sidebar */}
        <aside className="w-60 flex-shrink-0 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto hidden md:block border-r border-zinc-900 pr-4 space-y-5">
          {navItems.map((group) => (
            <div key={group.label} className="space-y-1.5">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-2.5 block">{group.label}</span>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`flex items-center gap-2.5 w-full text-left rounded-md px-2.5 py-1.5 text-xs transition-colors ${activeSection === item.id ? "bg-primary/10 text-primary font-medium" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Content Panel */}
        <div ref={contentRef} className="flex-1 min-w-0 max-w-3xl overflow-y-auto pb-20 space-y-8">
          
          {/* OVERVIEW */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Postly — Custom Mail Platform</h1>
                <p className="text-sm text-zinc-400 mt-2">Production email client for custom SMTP sending, bulk campaigns, QR-based check-in, and full analytics.</p>
              </div>
              <Separator />
              <p className="text-sm text-zinc-300 leading-relaxed">
                Postly is a self-hosted email platform built for teams that need full control over their email infrastructure. Connect your own SMTP credentials, build reusable templates, send one-off or bulk personalised emails, and track opens, clicks, and engagement — all from a single interface.
              </p>

              <div className="grid gap-3 grid-cols-2">
                {[
                  { title: "Custom SMTP", desc: "Use any SMTP provider — Gmail, SES, or your own server.", icon: <Server className="h-4 w-4 text-primary" /> },
                  { title: "HTML Templates", desc: "Build reusable layouts with variable substitutions.", icon: <Code className="h-4 w-4 text-blue-400" /> },
                  { title: "Bulk Sending", desc: "Upload a CSV and send to hundreds of recipients at once.", icon: <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> },
                  { title: "QR Check-in", desc: "Embed unique QR codes in emails for gate admittance.", icon: <QrCode className="h-4 w-4 text-purple-400" /> },
                  { title: "Analytics", desc: "Track opens, clicks, and per-button engagement.", icon: <BarChart3 className="h-4 w-4 text-amber-400" /> },
                  { title: "Audit Logs", desc: "Full activity log with security anomaly detection.", icon: <ClipboardList className="h-4 w-4 text-cyan-400" /> }
                ].map((f, i) => (
                  <div key={i} className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                      {f.icon}
                      <span className="text-sm font-semibold text-white">{f.title}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>

              <div>
                <h2 className="text-lg font-bold text-white mb-4">Quick Start Roadmap</h2>
                <div className="space-y-3">
                  {[
                    { step: "1", title: "Create Your Account", desc: "Log in using your admin credentials." },
                    { step: "2", title: "Configure SMTP", desc: "Go to Settings → SMTP and enter host, port, and credentials." },
                    { step: "3", title: "Create a Template", desc: "Navigate to Templates and build your HTML email layouts with variables." },
                    { step: "4", title: "Send Your First Email", desc: "Use Compose to send a test email, or upload a CSV for a bulk campaign send." },
                    { step: "5", title: "Review Analytics", desc: "Visit Sent → select a campaign to see opens, clicks, and device metrics." }
                  ].map((s) => (
                    <div key={s.step} className="flex gap-4 items-start">
                      <span className="h-6 w-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-semibold text-primary shrink-0 mt-0.5">{s.step}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                        <p className="text-xs text-zinc-400">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AUTH */}
          {activeSection === "auth" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Authentication</h1>
                <p className="text-sm text-zinc-400 mt-2">How to log in to Postly and manage sessions.</p>
              </div>
              <Separator />

              <div>
                <h2 className="text-lg font-bold text-white">Logging In</h2>
                <p className="text-sm text-zinc-300 leading-relaxed mt-2">
                  Enter your email address and password on the login screen. Postly uses session-based authentication. Your session remains active until you explicitly log out or the session expires after inactivity.
                </p>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-primary leading-relaxed">
                  Sessions are refreshed transparently using secure HTTP-only cookies. Do not share your admin password.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white mb-2">Access Roles</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Permissions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold text-white">Admin</TableCell>
                      <TableCell className="text-xs">Full access — SMTP config, user management, audit logs, all send features, settings.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold text-white">Operator</TableCell>
                      <TableCell className="text-xs">Can scan QR codes and perform check-ins via the Operator portal. No access to email or settings.</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white">Operator PWA Portal</h2>
                <p className="text-sm text-zinc-300 leading-relaxed mt-2">
                  Operators access a separate mobile-optimised portal at `/operator`. They authenticate using an email and PIN. The portal is a Progressive Web App (PWA) that operators can install on their mobile device home screen for offline gate admittance.
                </p>
              </div>
            </div>
          )}

          {/* SMTP */}
          {activeSection === "smtp" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">SMTP Setup</h1>
                <p className="text-sm text-zinc-400 mt-2">Connect your email provider to start sending.</p>
              </div>
              <Separator />

              <p className="text-sm text-zinc-300 leading-relaxed">
                Postly sends all email through your own SMTP credentials. This gives you full control over deliverability, sender reputation, and sending limits.
              </p>

              <div>
                <h2 className="text-lg font-bold text-white mb-3">Configuring SMTP</h2>
                <div className="space-y-2.5">
                  {[
                    "Open Settings in the sidebar.",
                    "Select the SMTP section in the settings panel.",
                    "Fill in your provider credentials (host, port, username, password, encryption).",
                    "Click 'Send Test Email' to verify connection security before saving."
                  ].map((s, i) => (
                    <div key={i} className="flex gap-3 text-sm text-zinc-300">
                      <span className="font-bold text-primary">{i + 1}.</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white mb-2">Required Fields</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { field: "SMTP Host", desc: "Outgoing mail server hostname (e.g., smtp.gmail.com)" },
                      { field: "Port", desc: "Usually 587 (TLS/STARTTLS) or 465 (SSL)." },
                      { field: "Username", desc: "Your full email address or SMTP auth username." },
                      { field: "Password", desc: "SMTP password or app-specific password. Stored encrypted." },
                      { field: "Encryption", desc: "TLS, SSL, or None. TLS or SSL is highly recommended." },
                      { field: "From Name", desc: "The display name recipients see in their inbox." },
                      { field: "From Email", desc: "Sender address. Must be authorised by your SMTP provider." }
                    ].map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-white whitespace-nowrap">{row.field}</TableCell>
                        <TableCell className="text-xs">{row.desc}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 flex gap-3">
                <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-200 leading-relaxed">
                  Gmail free accounts have a daily sending limit of 500 emails. For bulk campaigns, use a transactional provider like SendGrid, Zoho, or Amazon SES.
                </p>
              </div>
            </div>
          )}

          {/* COMPOSE */}
          {activeSection === "compose" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Compose & Send</h1>
                <p className="text-sm text-zinc-400 mt-2">Send individual emails directly from Postly.</p>
              </div>
              <Separator />

              <p className="text-sm text-zinc-300 leading-relaxed">
                The Compose view lets you send a one-off email to a single recipient. This is useful for testing layouts or sending manual transactional messages.
              </p>

              <div>
                <h2 className="text-lg font-bold text-white mb-3">Composing Steps</h2>
                <div className="space-y-2">
                  {[
                    "Click 'Compose' in the sidebar navigation.",
                    "Enter recipient details (To, Subject, and optional CC/BCC).",
                    "Choose an existing HTML template, or write custom HTML body text.",
                    "Provide variable values (if your template uses variables).",
                    "Click 'Send Email' to dispatch immediately."
                  ].map((s, i) => (
                    <div key={i} className="flex gap-3 text-sm text-zinc-300">
                      <span className="font-bold text-primary">{i + 1}.</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white mb-2">Template Variables</h2>
                <p className="text-xs text-zinc-400 mb-2">If your template uses variables (e.g. `{"{{name}}"}`), Postly displays inline form inputs to fill in values before sending:</p>
                <pre className="rounded-md bg-zinc-950 p-4 font-mono text-xs text-primary leading-relaxed">
{`Subject: Welcome, {{name}}!
Body:    Hello {{name}}, your seat is {{seat_number}}.`}
                </pre>
              </div>
            </div>
          )}

          {/* TEMPLATES */}
          {activeSection === "templates" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Templates</h1>
                <p className="text-sm text-zinc-400 mt-2">Create and manage reusable HTML email templates.</p>
              </div>
              <Separator />

              <p className="text-sm text-zinc-300 leading-relaxed">
                Templates are reusable HTML layouts. Any dynamic values — like a recipient&apos;s name or ticket ID — are written as `{"{{variable_name}}"}` placeholders that get substituted at send time.
              </p>

              <div>
                <h2 className="text-lg font-bold text-white mb-2">Variable Syntax</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Syntax</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { tag: "{{name}}", desc: "Replaced by the value of the name column in your CSV or compose form." },
                      { tag: "{{email}}", desc: "Replaced by the recipient's email address." },
                      { tag: "{{QR_CODE}}", desc: "Replaced by an inline check-in QR code image unique to this recipient." },
                      { tag: "{{TRACKED_URL:label:https://...}}", desc: "Inserts a click-tracked link. The label identifies this link in analytics." }
                    ].map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs text-primary whitespace-nowrap">{row.tag}</TableCell>
                        <TableCell className="text-xs">{row.desc}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-200 leading-relaxed">
                  You can use the editor&apos;s toolbar to insert a **Tracked Button**. This generates a styled HTML link containing the `TRACKED_URL` tag automatically.
                </p>
              </div>
            </div>
          )}

          {/* BULK */}
          {activeSection === "bulk" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Bulk Sending</h1>
                <p className="text-sm text-zinc-400 mt-2">Send personalised emails using CSV uploads.</p>
              </div>
              <Separator />

              <div>
                <h2 className="text-lg font-bold text-white mb-2">CSV Format</h2>
                <p className="text-xs text-zinc-400 mb-2">The first row must be a header row. An `email` column is required. All other columns become available as variables.</p>
                <pre className="rounded-md bg-zinc-950 p-4 font-mono text-xs text-primary leading-relaxed">
{`email,name,seat_number,ticket_type
alice@example.com,Alice,A12,VIP
bob@example.com,Bob,B04,General`}
                </pre>
              </div>

              <div>
                <h2 className="text-lg font-bold text-white mb-2">Pre-Send Validation</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check</TableHead>
                      <TableHead>Behavior on Failure</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { check: "Email format", behavior: "Row marked invalid. Excluded from send." },
                      { check: "Duplicate emails", behavior: "Duplicates highlighted. One-click deduplication available." },
                      { check: "Missing required columns", behavior: "Hard block — cannot proceed without the email column." },
                      { check: "Empty field values", behavior: "Warning shown. Row is not excluded by default." },
                      { check: "Email domain MX check", behavior: "Domain flagged if no valid MX record found. Row still included unless you exclude it." }
                    ].map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-white whitespace-nowrap">{row.check}</TableCell>
                        <TableCell className="text-xs">{row.behavior}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* QR */}
          {activeSection === "qr" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">QR Code Generation</h1>
                <p className="text-sm text-zinc-400 mt-2">Embed unique QR codes in emails for event check-in.</p>
              </div>
              <Separator />

              <p className="text-sm text-zinc-300 leading-relaxed">
                When a template contains the `{"{{QR_CODE}}"}` variable, Postly generates a unique QR code for each recipient at send time. Each QR code encodes a secure check-in token tied to that specific recipient.
              </p>

              <div>
                <h2 className="text-lg font-bold text-white mb-3">Workflow</h2>
                <div className="space-y-2">
                  {[
                    "Add {{QR_CODE}} placeholder inside your HTML template.",
                    "Send the campaign (via compose or bulk CSV).",
                    "Postly generates a unique ticket token per recipient and compiles it as an inline image.",
                    "The recipient receives the email and presents the QR code at the event entrance.",
                    "Gate staff scan the code using the Operator scan app to authorize entry."
                  ].map((s, i) => (
                    <div key={i} className="flex gap-3 text-sm text-zinc-300">
                      <span className="font-bold text-primary">{i + 1}.</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 flex gap-3">
                <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-200 leading-relaxed">
                  Each QR code is single-use by default. Scanning a code a second time returns an &ldquo;Already checked in&rdquo; error with the original check-in timestamp.
                </p>
              </div>
            </div>
          )}

          {/* SCAN */}
          {activeSection === "scan" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Scanning & Check-in</h1>
                <p className="text-sm text-zinc-400 mt-2">The Operator PWA for event-day QR scanning.</p>
              </div>
              <Separator />

              <p className="text-sm text-zinc-300 leading-relaxed">
                The Operator portal is a mobile-first PWA at `/operator`. It is designed for scanning staff who need to check attendees in quickly without access to the admin dashboard.
              </p>

              <div>
                <h2 className="text-lg font-bold text-white mb-2">Scan Results</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Result</TableHead>
                      <TableHead>Meaning</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { res: "✅ Valid", desc: "Token is valid and has not been used before. Tap Confirm Check-In to mark the attendee as arrived." },
                      { res: "⚠️ Already checked in", desc: "This QR code was scanned previously. The original check-in timestamp is displayed." },
                      { res: "❌ Invalid", desc: "The token is not recognised or has been tampered with." }
                    ].map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-white whitespace-nowrap">{row.res}</TableCell>
                        <TableCell className="text-xs">{row.desc}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* SENT */}
          {activeSection === "sent" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Sent Emails</h1>
                <p className="text-sm text-zinc-400 mt-2">Review and manage all previously sent emails.</p>
              </div>
              <Separator />

              <p className="text-sm text-zinc-300 leading-relaxed">
                The Sent view at `/sent` shows a searchable, filterable list of every email dispatched through Postly — individual sends and bulk campaigns alike.
              </p>

              <div>
                <h2 className="text-lg font-bold text-white mb-2">Email Statuses</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Meaning</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { status: "Sent", desc: "Email was accepted by your SMTP server." },
                      { status: "Delivered", desc: "Confirmed delivery (requires provider-level webhooks)." },
                      { status: "Opened", desc: "Recipient opened the email (tracked via a 1×1 pixel)." },
                      { status: "Clicked", desc: "Recipient clicked at least one tracked link." },
                      { status: "Failed", desc: "SMTP rejected the message. Error shown on detail page." }
                    ].map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-white whitespace-nowrap">{row.status}</TableCell>
                        <TableCell className="text-xs">{row.desc}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* ANALYTICS */}
          {activeSection === "analytics" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Email Analytics</h1>
                <p className="text-sm text-zinc-400 mt-2">Track opens, clicks, and engagement for sent campaigns.</p>
              </div>
              <Separator />

              <div>
                <h2 className="text-lg font-bold text-white">How Click Tracking Works</h2>
                <p className="text-sm text-zinc-300 leading-relaxed mt-2">
                  When an email is sent, any `{"{{TRACKED_URL:label:url}}"}` placeholders in the template are rewritten to a tracking redirect URL:
                </p>
                <pre className="rounded-md bg-zinc-950 p-4 font-mono text-xs text-primary leading-relaxed overflow-x-auto whitespace-pre">
{`https://postly.gowreesh.me/api/track/click/{emailId}?label=whatsapp_button&url=https%3A%2F%2Fchat.whatsapp.com%2F...`}
                </pre>
                <p className="text-xs text-zinc-400 mt-2">
                  When the recipient clicks, Postly logs the event, writes the IP and User-agent details, and immediately redirects the user to the destination.
                </p>
              </div>
            </div>
          )}

          {/* AUDIT */}
          {activeSection === "audit" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Audit Logs</h1>
                <p className="text-sm text-zinc-400 mt-2">Full activity history for every action taken in Postly.</p>
              </div>
              <Separator />

              <div>
                <h2 className="text-lg font-bold text-white mb-2">Automated Anomaly Detection</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pattern Detected</TableHead>
                      <TableHead>Flag Alert message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { pattern: "200+ emails sent in 2 minutes by one user", alert: "⚠️ Unusually high send volume" },
                      { pattern: "5+ failed logins from the same IP within 10 minutes", alert: "⚠️ Possible brute-force attack" },
                      { pattern: "Admin role assigned between 11pm–5am", alert: "⚠️ Off-hours privilege escalation" }
                    ].map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-white whitespace-nowrap">{row.pattern}</TableCell>
                        <TableCell className="text-xs text-orange-400 font-bold">{row.alert}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {activeSection === "settings" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Settings</h1>
                <p className="text-sm text-zinc-400 mt-2">Platform-wide configuration for admins.</p>
              </div>
              <Separator />

              <div>
                <h2 className="text-lg font-bold text-white mb-2">Configurations</h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Section</TableHead>
                      <TableHead>Configurable Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { sec: "SMTP", desc: "Outgoing mail server credentials, from name, from email." },
                      { sec: "Users & roles", desc: "Invite new admin users, issue operator PINs and magic links." },
                      { sec: "Tracking", desc: "Enable or disable open tracking pixel and click tracking globally." },
                      { sec: "Audit & retention", desc: "Set log retention window (30/60/90/365 days) and run manual purges." },
                      { sec: "QR codes", desc: "Configure default QR code size, error correction, and logo overlay branding." }
                    ].map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-white whitespace-nowrap">{row.sec}</TableCell>
                        <TableCell className="text-xs">{row.desc}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function Separator() {
  return <div className="h-px bg-zinc-900 my-4" />;
}
