"use client";

import * as React from "react";
import {
  BarChart3,
  Activity,
  Radio,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import { CodeTabs } from "../code-tabs";

export function TelemetrySection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
            Observability & Logs
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Live Cockpit</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Real-time Telemetry Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          The Telemetry Cockpit at <code>/monitor</code> provides real-time visibility into active bulk campaigns, throughput meters, delivery latency graphs, and SMTP socket health.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Cockpit Overview */}
      <section id="dashboard-overview" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Observability Cockpit Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1">
            <span className="text-zinc-500 font-medium">Throughput Speed</span>
            <div className="text-2xl font-bold text-white font-mono">24.5 <span className="text-xs text-zinc-400">msg/s</span></div>
            <p className="text-[11px] text-emerald-400">● 98.8% success rate</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1">
            <span className="text-zinc-500 font-medium">Avg Handshake Latency</span>
            <div className="text-2xl font-bold text-white font-mono">186 <span className="text-xs text-zinc-400">ms</span></div>
            <p className="text-[11px] text-zinc-400">P95: 320ms • P99: 490ms</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1">
            <span className="text-zinc-500 font-medium">Active Socket Pool</span>
            <div className="text-2xl font-bold text-white font-mono">8 / 10</div>
            <p className="text-[11px] text-primary">TLS 1.3 tunnels open</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-1">
            <span className="text-zinc-500 font-medium">Dead-Letter Queue</span>
            <div className="text-2xl font-bold text-rose-400 font-mono">3 <span className="text-xs text-zinc-400">errors</span></div>
            <p className="text-[11px] text-rose-400/80">Awaiting retry triage</p>
          </div>
        </div>
      </section>

      {/* Visualizations */}
      <section id="live-charting-breakdown" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-400" />
          Recharts Visualizations
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          The monitor interface leverages high-frequency <strong>Recharts</strong> components to plot:
        </p>
        <ul className="space-y-2 text-xs text-zinc-400 pl-4 list-disc">
          <li><strong>Dispatches Over Time (Area Chart):</strong> Visualizes success spikes versus transmission drops in 5-second intervals.</li>
          <li><strong>Round-Trip Latency Distribution (Line Chart):</strong> Tracks connection drift, identifying when a cloud relay is suffering degraded performance.</li>
          <li><strong>Error Taxonomy Donut (Pie Chart):</strong> Classifies failures into Auth (535), Rate Limits (421), DNS failures, and Connection timeouts.</li>
        </ul>
      </section>
    </div>
  );
}

export function SseStreamSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
            Observability & Logs
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Streaming Telemetry</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">SSE Live Log Stream</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Zero-polling, real-time dispatch telemetry powered by HTTP Server-Sent Events (SSE) at <code>/api/monitor/stream</code>.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Protocol */}
      <section id="sse-architecture" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          How SSE Streaming Works in Postly
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Traditional web dashboards poll the database every few seconds, causing high CPU load during intense bulk sends. Postly instead opens a lightweight, long-lived HTTP SSE connection:
        </p>
        <CodeTabs
          tabs={[
            {
              language: "TypeScript",
              filename: "sse-client-example.ts",
              code: `const eventSource = new EventSource('/api/monitor/stream');

eventSource.onmessage = (event) => {
  const telemetry = JSON.parse(event.data);
  console.log('Live Event:', telemetry);
  // { type: 'dispatch_ok', emailId: '...', latencyMs: 142, recipient: '...' }
};

eventSource.onerror = () => {
  console.warn('Stream disconnected, attempting backoff reconnect...');
};`
            }
          ]}
        />
      </section>
    </div>
  );
}

export function DlqRetrySection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
            Observability & Logs
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Fault Recovery</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Dead-Letter Queue & Retries</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Triage and recover failed messages with detailed raw socket error inspection and 1-click batch retries.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* DLQ Mechanics */}
      <section id="dlq-mechanics" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-rose-400" />
          Dead-Letter Queue Mechanics
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          When an email fails to transmit after attempting both Primary and Fallback SMTP relays, it is flagged with <code>status = &apos;failed&apos;</code> and preserved in the Dead-Letter Queue table. Postly saves the full error message, stack trace, and attempt count.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
            <span className="font-bold text-white">Targeted Single Retry</span>
            <p className="text-zinc-400">Inspect the failed email, fix any recipient typos or update server credentials, and click <strong>&ldquo;Retry Now&rdquo;</strong>.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
            <span className="font-bold text-white">Batch &lsquo;Retry All&rsquo; with Throttling</span>
            <p className="text-zinc-400">Re-dispatches all queued failures at an automatically conservative rate (2 messages/second) to recover from temporary network outages.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function AnalyticsSection() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
            Observability & Logs
          </span>
          <span className="text-xs text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Engagement</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Open/Click Analytics & Bot Filter</h1>
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
          Understand true recipient engagement with transparent tracking pixels and intelligent privacy bot filtering.
        </p>
      </div>

      <div className="h-px bg-zinc-800/80" />

      {/* Bot Detection */}
      <section id="bot-detection-mpp" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Filtering Apple MPP & Google Proxy Bots
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Modern email clients (such as Apple Mail with Mail Privacy Protection, and Google Image Proxies) automatically pre-fetch tracking pixels upon message arrival, inflating open rates to artificial levels.
        </p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-xs">
          <span className="font-bold text-white">Postly Bot Heuristics:</span>
          <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
            <li>Identifies Apple Cache Proxy IP ranges and user-agents (<code>Mozilla/5.0 ... AppleImageProxy</code>).</li>
            <li>Flags immediate opens (&lt; 2 seconds after SMTP acceptance) as automated machine previews.</li>
            <li>Distinguishes <strong>Human Opens</strong> from <strong>Proxy Prefetches</strong> in your analytics dashboard.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
