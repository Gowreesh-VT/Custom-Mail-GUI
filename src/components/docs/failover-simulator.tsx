"use client";

import * as React from "react";
import { Server, CheckCircle2, RefreshCw, AlertTriangle, Zap, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FailoverSimulator() {
  const [simulationState, setSimulationState] = React.useState<"idle" | "testing_primary" | "primary_failed" | "routing_fallback" | "success">("idle");
  const [activeLog, setActiveLog] = React.useState<string[]>([]);
  const [simulatedError, setSimulatedError] = React.useState<"timeout" | "auth_535" | "rate_limit_421">("timeout");

  const runSimulation = () => {
    setActiveLog([]);
    setSimulationState("testing_primary");
    setActiveLog((prev) => [...prev, "[14:22:01.104] Dispatcher: Outbound message queued for 'alex@partner.org'..."]);

    setTimeout(() => {
      setActiveLog((prev) => [...prev, "[14:22:01.320] Primary Pool [ZeptoMail - smtp.zeptomail.in:587] attempting connection..."]);
    }, 600);

    setTimeout(() => {
      setSimulationState("primary_failed");
      const errText =
        simulatedError === "timeout"
          ? "ETIMEDOUT: Connection socket hung up after 5000ms"
          : simulatedError === "auth_535"
          ? "SMTP 535 5.7.8: Authentication credentials invalid or revoked"
          : "SMTP 421 4.7.0: Provider rate limit exceeded (too many concurrent connections)";
      setActiveLog((prev) => [
        ...prev,
        `[14:22:02.850] ⚠️ PRIMARY FAILED: ${errText}`,
        "[14:22:02.855] CircuitBreaker: Auto-Failover rule tripped. SmtpFallbackLog record created."
      ]);
    }, 1600);

    setTimeout(() => {
      setSimulationState("routing_fallback");
      setActiveLog((prev) => [
        ...prev,
        "[14:22:03.110] 🔄 Fallback Relay [Personal - smtp.gmail.com:587] activated.",
        "[14:22:03.250] Handshake OK (200ms latency) -> STARTTLS verified -> Auth accepted."
      ]);
    }, 2800);

    setTimeout(() => {
      setSimulationState("success");
      setActiveLog((prev) => [
        ...prev,
        "[14:22:03.540] ✅ Message 250 2.0.0 OK: Delivered via Fallback Relay. UsedFallbackSmtp: true."
      ]);
    }, 4000);
  };

  const reset = () => {
    setSimulationState("idle");
    setActiveLog([]);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">Interactive SMTP Server Pool & Failover Simulator</h4>
            <p className="text-xs text-zinc-400">Simulate primary relay failures and witness zero-drop auto-failover in real time.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={simulatedError}
            onChange={(e) => setSimulatedError(e.target.value as any)}
            className="h-7 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-300 focus:outline-hidden"
            disabled={simulationState !== "idle" && simulationState !== "success"}
          >
            <option value="timeout">Socket Timeout (5s)</option>
            <option value="auth_535">Auth Revoked (535)</option>
            <option value="rate_limit_421">Rate Limited (421)</option>
          </select>

          {simulationState === "idle" || simulationState === "success" ? (
            <Button
              size="sm"
              onClick={runSimulation}
              className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5"
            >
              <Play className="h-3 w-3 fill-current" /> Run Test
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="h-7 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-400"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Visual Server Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary Node */}
        <div
          className={`rounded-lg border p-4 transition-all duration-300 ${
            simulationState === "testing_primary"
              ? "border-amber-500/60 bg-amber-500/5 shadow-lg shadow-amber-500/5"
              : simulationState === "primary_failed" || simulationState === "routing_fallback" || simulationState === "success"
              ? "border-rose-500/60 bg-rose-500/5"
              : "border-zinc-800 bg-zinc-900/40"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-zinc-400" />
              <span className="text-xs font-bold text-white">Primary SMTP Relay</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              PRIMARY
            </span>
          </div>
          <div className="text-xs font-mono text-zinc-300">smtp.zeptomail.in:587</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">User: emailapikey • TLS</div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Node Status:</span>
            {simulationState === "idle" && <span className="text-emerald-400 font-medium">● Healthy (Ready)</span>}
            {simulationState === "testing_primary" && <span className="text-amber-400 font-medium animate-pulse">● Connecting...</span>}
            {(simulationState === "primary_failed" || simulationState === "routing_fallback" || simulationState === "success") && (
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Failed ({simulatedError})
              </span>
            )}
          </div>
        </div>

        {/* Fallback Node */}
        <div
          className={`rounded-lg border p-4 transition-all duration-300 ${
            simulationState === "routing_fallback"
              ? "border-amber-500/60 bg-amber-500/5 shadow-lg shadow-amber-500/5"
              : simulationState === "success"
              ? "border-emerald-500/60 bg-emerald-500/5 shadow-lg shadow-emerald-500/5"
              : "border-zinc-800 bg-zinc-900/40"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-zinc-400" />
              <span className="text-xs font-bold text-white">Secondary Fallback Relay</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
              FALLBACK
            </span>
          </div>
          <div className="text-xs font-mono text-zinc-300">smtp.gmail.com:587</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">User: ops@company.com • TLS (App Pass)</div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Node Status:</span>
            {simulationState === "idle" && <span className="text-zinc-400 font-medium">Standby Pool</span>}
            {simulationState === "testing_primary" && <span className="text-zinc-500 font-medium">Standby</span>}
            {simulationState === "primary_failed" && <span className="text-amber-400 font-medium">Preparing Failover...</span>}
            {simulationState === "routing_fallback" && <span className="text-amber-400 font-medium animate-pulse">● Rerouting Dispatch...</span>}
            {simulationState === "success" && (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Dispatched Successfully (201ms)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Live Event Stream Log */}
      <div className="rounded-lg border border-zinc-800/90 bg-black/80 p-3 font-mono text-xs text-zinc-400 space-y-1 min-h-[100px]">
        <div className="text-[11px] font-semibold text-zinc-500 border-b border-zinc-900 pb-1 flex items-center justify-between">
          <span>EVENT STREAM TELEMETRY</span>
          <span className="text-[10px] text-zinc-600">Zero-Drop Guarantee</span>
        </div>
        {activeLog.length === 0 ? (
          <div className="text-zinc-600 italic pt-2">Click &apos;Run Test&apos; to trigger a simulated relay failure and observe automated fallback handling.</div>
        ) : (
          activeLog.map((log, i) => (
            <div key={i} className={`leading-relaxed ${log.includes("✅") ? "text-emerald-400 font-semibold" : log.includes("⚠️") ? "text-rose-400 font-semibold" : log.includes("🔄") ? "text-amber-400" : "text-zinc-400"}`}>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
