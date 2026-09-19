"use client";

import * as React from "react";
import {
  Code,
  Terminal,
  Lock
} from "lucide-react";
import { CodeTabs } from "../code-tabs";

export function ApiAuthSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Developer API Reference
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">REST Conventions</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Authentication & Conventions</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Integrate Postly directly into your SaaS backends, CI/CD pipelines, or event ticketing systems using standard JSON REST APIs.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Base URL */}
      <section id="api-base-url" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          Base URL & Headers
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          All endpoints accept and return <code>application/json</code> payloads:
        </p>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-primary space-y-1">
          <div>Base URL: https://your-postly-domain.com/api</div>
          <div>Content-Type: application/json</div>
          <div>Accept: application/json</div>
        </div>
      </section>

      {/* Auth */}
      <section id="api-authentication" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Lock className="h-5 w-5 text-emerald-400" />
          Authentication Mechanism
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Postly uses encrypted HTTP-Only session cookies for browser clients, and supports standard Bearer authentication tokens for external microservices:
        </p>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
          Authorization: Bearer {'<YOUR_API_OR_SESSION_TOKEN>'}
        </div>
      </section>

      {/* Error Envelope */}
      <section id="api-error-envelope" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Code className="h-5 w-5 text-rose-400" />
          Standard Error Envelope
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Failed API requests return a standard JSON object containing the error message and an optional diagnostic error code:
        </p>
        <CodeTabs
          tabs={[
            {
              language: "JSON",
              filename: "error-response.json",
              code: `{
  "error": "Primary relay authentication rejected",
  "code": "SMTP_535_AUTH_FAILED",
  "details": "Invalid credentials provided for smtp.gmail.com"
}`
            }
          ]}
        />
      </section>
    </div>
  );
}

export function ApiSendSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Developer API Reference
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Endpoints</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Send & Bulk Send Endpoints</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Full API specifications and multi-language client snippets for programmatically dispatching transactional and campaign messages.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Single Send */}
      <section id="post-api-send" className="space-y-4 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">POST</span>
          <h2 className="text-lg font-mono font-bold text-white">/api/send</h2>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Dispatches a single transactional email through your active SMTP server pool with automatic fallback.
        </p>

        <CodeTabs
          tabs={[
            {
              language: "cURL",
              filename: "send-email.sh",
              code: `curl -X POST https://your-postly-domain.com/api/send \\
  -H "Content-Type: application/json" \\
  -H "Cookie: token=YOUR_SESSION_TOKEN" \\
  -d '{
    "to": "sophia@example.org",
    "subject": "Your Order #4920 Confirmed",
    "bodyHtml": "<h1>Thank you for your order!</h1><p>Items will arrive by Friday.</p>",
    "trackingEnabled": true
  }'`
            },
            {
              language: "TypeScript",
              filename: "send-email.ts",
              code: `import axios from 'axios';

async function sendTransactionalEmail() {
  const response = await axios.post('https://your-postly-domain.com/api/send', {
    to: 'sophia@example.org',
    subject: 'Your Order #4920 Confirmed',
    bodyHtml: '<h1>Thank you for your order!</h1><p>Items will arrive by Friday.</p>',
    trackingEnabled: true
  }, {
    withCredentials: true
  });

  console.log('Dispatched successfully:', response.data.emailId);
}`
            },
            {
              language: "Python",
              filename: "send_email.py",
              code: `import requests

url = "https://your-postly-domain.com/api/send"
payload = {
    "to": "sophia@example.org",
    "subject": "Your Order #4920 Confirmed",
    "bodyHtml": "<h1>Thank you for your order!</h1><p>Items will arrive by Friday.</p>",
    "trackingEnabled": True
}
headers = {"Content-Type": "application/json"}
cookies = {"token": "YOUR_SESSION_TOKEN"}

response = requests.post(url, json=payload, headers=headers, cookies=cookies)
print(response.json())`
            }
          ]}
        />
      </section>

      {/* Bulk Send */}
      <section id="post-api-send-bulk" className="space-y-4 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-xs font-bold">POST</span>
          <h2 className="text-lg font-mono font-bold text-white">/api/send-bulk</h2>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Triggers a bulk personalized campaign across an array of recipient rows using a pre-saved HTML template.
        </p>
        <CodeTabs
          tabs={[
            {
              language: "JSON Payload",
              filename: "bulk-payload.json",
              code: `{
  "templateId": "tmpl_cl98a4bc1",
  "recipients": [
    { "email": "alex@example.com", "name": "Alex", "seat": "A-12" },
    { "email": "sarah@example.com", "name": "Sarah", "seat": "B-04" }
  ],
  "batchDelayMs": 50,
  "generateQr": true
}`
            }
          ]}
        />
      </section>
    </div>
  );
}

export function ApiScheduleSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Developer API Reference
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Scheduling</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Schedule & Queue Endpoints</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Endpoints to schedule delayed emails, query scheduled queue status, and cancel pending dispatches.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Schedule Endpoints */}
      <section id="post-api-schedule" className="space-y-4 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">POST</span>
          <h2 className="text-lg font-mono font-bold text-white">/api/schedule</h2>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Accepts an ISO 8601 UTC timestamp to delay dispatch until the specified time:
        </p>
        <CodeTabs
          tabs={[
            {
              language: "cURL",
              filename: "schedule.sh",
              code: `curl -X POST https://your-postly-domain.com/api/schedule \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "investors@fund.vc",
    "subject": "Q3 2026 Shareholder Briefing",
    "bodyHtml": "<p>Please find the quarterly report attached.</p>",
    "scheduledAt": "2026-09-10T09:00:00.000Z"
  }'`
            }
          ]}
        />
      </section>
    </div>
  );
}

export function ApiQrOperatorSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Developer API Reference
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Passes & Scans</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">QR & Operator Check-in API</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Endpoints to generate vector QR passes, validate ticket HMAC tokens, and record operator check-in scans.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Operator Checkin */}
      <section id="post-api-operator-checkin" className="space-y-4 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">POST</span>
          <h2 className="text-lg font-mono font-bold text-white">/api/operator/checkin</h2>
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Called by gate scanners to verify and authenticate ticket passes:
        </p>
        <CodeTabs
          tabs={[
            {
              language: "JSON",
              filename: "checkin-response.json",
              code: `{
  "success": true,
  "status": "valid",
  "recipientName": "Alex Rivera",
  "ticketTier": "VIP All-Access",
  "seatNumber": "A-12",
  "scannedAt": "2026-09-05T14:30:00Z"
}`
            }
          ]}
        />
      </section>
    </div>
  );
}

export function ApiStatsSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
            Developer API Reference
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Telemetry</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Telemetry & Stats API</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Query aggregated metrics, delivery percentages, and SMTP latency distributions for custom dashboards and Prometheus scrapers.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Stats */}
      <section id="get-api-monitor-stats" className="space-y-4 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">GET</span>
          <h2 className="text-lg font-mono font-bold text-white">/api/monitor/stats</h2>
        </div>
        <CodeTabs
          tabs={[
            {
              language: "JSON",
              filename: "stats-response.json",
              code: `{
  "totalSent": 18450,
  "totalDelivered": 18210,
  "totalFailed": 240,
  "deliveryRate": 98.7,
  "avgLatencyMs": 192,
  "activeSockets": 6,
  "deadLetterQueueCount": 2
}`
            }
          ]}
        />
      </section>
    </div>
  );
}
