"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CameraOff, Flashlight, LogOut, QrCode, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { QrScanner, ScannerTier } from "@/lib/qr-scanner";

type Campaign = { id: string; name: string; type: string; scanMode: string; expiresAt?: string; displayFields: string[] };
type Screen = "login" | "select_campaign" | "scanning" | "validating" | "result";
type ScanValidationResult = { result: "valid" | "used" | "expired" | "invalid"; fields?: Record<string, string>; campaignName?: string; scanCount?: number; firstScannedAt?: string; message?: string };

export default function ScanPage() {
  const [screen, setScreen] = useState<Screen>("login");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [result, setResult] = useState<ScanValidationResult | null>(null);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ valid: 0, invalid: 0 });
  const [torch, setTorch] = useState(false);
  const [tier, setTier] = useState<ScannerTier | null>(null);
  const [manual, setManual] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  useEffect(() => {
    if (screen !== "scanning" || !videoRef.current || !isOnline) return;
    let cancelled = false;
    import("@/lib/qr-scanner").then(async ({ QrScanner }) => {
      if (cancelled || !videoRef.current) return;
      const scanner = new QrScanner();
      scannerRef.current = scanner;
      try {
        await scanner.start(videoRef.current, {
          onTierSelected: setTier,
          onDetect: ({ rawValue }) => validate(rawValue),
          onError: () => {}
        });
      } catch {
        setError("Camera access required. Please allow camera access in your browser settings.");
      }
    });
    return () => {
      cancelled = true;
      scannerRef.current?.stop();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, isOnline]);

  useEffect(() => () => {
    scannerRef.current?.stop();
    if (timerRef.current) window.clearTimeout(timerRef.current);
    audioRef.current?.close().catch(() => {});
  }, []);

  async function unlockAudio() {
    if (!audioRef.current) audioRef.current = new AudioContext();
    if (audioRef.current.state === "suspended") await audioRef.current.resume();
  }

  async function login() {
    setError("");
    await unlockAudio();
    const res = await fetch("/api/qr/operator/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, pin }) });
    const data = await res.json();
    if (!res.ok || data.success === false) return setError(data.error || "Invalid email or PIN");
    setOperatorId(data.operatorId);
    setOperatorName(data.operatorName);
    setCampaigns(data.campaigns);
    setScreen("select_campaign");
  }

  async function validate(rawValue: string) {
    if (screen === "validating" || screen === "result") return;
    vibrate(50);
    const normalized = rawValue.startsWith("QR_V1|") ? rawValue : looksLikeId(rawValue) ? `QR_V1|ID:${rawValue}` : rawValue;
    if (!normalized.startsWith("QR_V1|")) {
      showResult({ result: "invalid", message: "This code is not recognized" });
      return;
    }
    setScreen("validating");
    try {
      const res = await fetch("/api/qr/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operatorId, operatorPin: pin, encodedData: normalized }) });
      const data = await res.json();
      showResult(data);
    } catch {
      showResult({ result: "invalid", message: "Connection error" });
    }
  }

  function showResult(next: ScanValidationResult) {
    setResult(next);
    const ok = next.result === "valid";
    setStats((current) => ({ valid: current.valid + (ok ? 1 : 0), invalid: current.invalid + (ok ? 0 : 1) }));
    vibrate(ok ? 200 : [80, 40, 80]);
    playSound(ok ? "valid" : "invalid");
    setScreen("result");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setResult(null);
      setScreen("scanning");
    }, next.result === "used" ? 6000 : 4000);
  }

  function playSound(type: "valid" | "invalid") {
    const ctx = audioRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = type === "valid" ? 1200 : 300;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  function logout() {
    scannerRef.current?.stop();
    setOperatorId("");
    setOperatorName("");
    setCampaigns([]);
    setSelectedCampaign(null);
    setStats({ valid: 0, invalid: 0 });
    setScreen("login");
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col">
        {screen === "login" && <div className="grid flex-1 place-items-center p-5"><div className="w-full space-y-5 text-center"><QrCode className="mx-auto h-12 w-12" /><div><h1 className="text-3xl font-bold">QR Scanner</h1><p className="text-sm text-zinc-400">Powered by Custom Mail</p></div><Card className="border-zinc-800 bg-zinc-950 text-white"><CardHeader><CardTitle>Operator Login</CardTitle></CardHeader><CardContent className="space-y-3 text-left"><Label>Email<Input className="bg-zinc-900" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Label><Label>PIN<Input className="bg-zinc-900" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} /></Label>{error && <div className="rounded-md border border-red-900 bg-red-950/60 p-3 text-sm text-red-200">{error}</div>}<Button className="w-full" onClick={login}>Sign In</Button></CardContent></Card><p className="text-xs text-zinc-500">v1.0</p></div></div>}

        {screen === "select_campaign" && <div className="flex flex-1 flex-col p-4"><div className="mb-4 flex items-center justify-between"><Button variant="ghost" size="icon" onClick={logout}><LogOut className="h-4 w-4" /></Button><h1 className="font-semibold">Select Campaign</h1><span className="max-w-24 truncate text-xs text-zinc-400">{operatorName}</span></div>{campaigns.length === 0 ? <div className="grid flex-1 place-items-center text-center text-zinc-400"><div><ScanLine className="mx-auto mb-3 h-12 w-12" /><p>No campaigns assigned</p><p className="text-sm">Contact your administrator.</p></div></div> : <div className="space-y-3">{campaigns.map((campaign) => { const expired = Boolean(campaign.expiresAt && new Date(campaign.expiresAt) < new Date()); return <button key={campaign.id} disabled={expired} onClick={() => { setSelectedCampaign(campaign); setStats({ valid: 0, invalid: 0 }); setScreen("scanning"); }} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-left disabled:opacity-50"><div className="text-lg font-semibold">{campaign.name}</div><div className="mt-2 flex gap-2 text-xs"><span className="rounded bg-zinc-800 px-2 py-1">{campaign.type}</span><span className="rounded bg-zinc-800 px-2 py-1">{campaign.scanMode}</span><span className={expired ? "text-red-400" : "text-green-400"}>{expired ? "Expired" : "Active"}</span></div></button>; })}</div>}</div>}

        {(screen === "scanning" || screen === "validating" || screen === "result") && <div className="relative flex min-h-screen flex-col overflow-hidden"><div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-black/40 p-3 backdrop-blur"><Button variant="ghost" size="sm" onClick={() => { scannerRef.current?.stop(); setScreen("select_campaign"); }}><ArrowLeft className="h-4 w-4" />Back</Button><div className="max-w-44 truncate text-sm font-semibold">{selectedCampaign?.name}</div><div className="text-xs">OK {stats.valid} Bad {stats.invalid}</div></div>{!isOnline && <div className="absolute left-0 right-0 top-12 z-30 bg-red-600 p-2 text-center text-sm">No internet connection - scanning paused</div>}<video ref={videoRef} muted playsInline className="h-screen w-full object-cover" /><div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="relative h-[65vw] max-h-72 w-[65vw] max-w-72"><div className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-white" /><div className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-white" /><div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-white" /><div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-white" /><div className="absolute left-2 right-2 top-1/2 h-0.5 animate-pulse bg-white" /></div></div><div className="absolute bottom-0 left-0 right-0 z-20 space-y-3 bg-gradient-to-t from-black p-4"><div className="flex justify-between"><Button variant="secondary" onClick={() => { setTorch(!torch); scannerRef.current?.toggleTorch(!torch); }}><Flashlight className="h-4 w-4" />Torch</Button><form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); validate(manual); setManual(""); }}><Input className="w-44 bg-zinc-950" placeholder="Enter code" value={manual} onChange={(e) => setManual(e.target.value)} /><Button type="submit">Validate</Button></form></div>{process.env.NODE_ENV === "development" && tier && <span className="rounded bg-zinc-900 px-2 py-1 text-xs">{tier}</span>}</div>{error && <div className="absolute inset-0 z-40 grid place-items-center bg-black/80 p-6 text-center"><div><CameraOff className="mx-auto mb-3 h-12 w-12" /><p>{error}</p></div></div>}{screen === "validating" && <div className="absolute inset-0 z-30 grid place-items-center bg-black/40 text-lg font-semibold">Validating...</div>}{screen === "result" && result && <button onClick={() => { setResult(null); setScreen("scanning"); }} className="absolute bottom-0 left-0 right-0 z-40 rounded-t-3xl bg-zinc-950 p-6 text-left shadow-2xl"><div className={`mb-3 text-center text-3xl font-bold ${result.result === "valid" ? "text-green-400" : result.result === "used" ? "text-orange-400" : "text-red-400"}`}>{result.result === "valid" ? "VALID" : result.result === "used" ? "ALREADY USED" : result.result === "expired" ? "EXPIRED" : "INVALID QR"}</div><div className="max-h-52 overflow-auto">{Object.entries(result.fields || {}).map(([key, value]) => <div key={key} className="flex justify-between border-b border-zinc-800 py-2"><span className="text-xs text-zinc-400">{key}</span><span className="font-semibold">{value}</span></div>)}</div>{result.message && <p className="text-center text-sm text-zinc-400">{result.message}</p>}<p className="mt-4 text-center text-xs text-zinc-500">Tap to scan next</p></button>}</div>}
      </div>
    </main>
  );
}

function vibrate(pattern: VibratePattern) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

function looksLikeId(value: string) {
  return /^[a-z0-9]{12,}$/i.test(value.trim());
}
