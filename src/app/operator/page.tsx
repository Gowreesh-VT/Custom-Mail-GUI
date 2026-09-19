"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { AlertCircle, Camera, CheckCircle2, Loader2, Lock, LogOut, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Operator = {
  id: string;
  name: string;
  email: string;
  campaigns: Array<{ id: string; name: string; type: string }>;
};

type CheckInResult = {
  success: boolean;
  statusText: string;
  error?: string;
  firstCheckInTime?: string;
  attendee?: {
    name: string;
    email: string;
    fields: Record<string, string>;
  };
};

export default function OperatorPage() {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);
  const [authForm, setAuthForm] = useState({ email: "", pin: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [online, setOnline] = useState(true);

  // Scanner States
  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<CheckInResult | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [scannedLogs, setScannedLogs] = useState<Array<{ time: string; name: string; status: string }>>([]);

  // Ref fields for Camera scanner
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanTickRef = useRef<() => void>(() => {});

  // Stable camera control functions
  const stopCamera = useCallback(() => {
    setScanning(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.play();
        animationFrameId.current = requestAnimationFrame(() => scanTickRef.current());
      }
    } catch (err) {
      console.error("Camera access failed", err);
      toast.error("Failed to access camera. Please check permissions.");
      setScanning(false);
    }
  }, [stopCamera]);

  // Handle Online / Offline detection
  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => {
      setOnline(true);
      toast.success("Connection restored! Scanning is live.");
    };
    const goOffline = () => {
      setOnline(false);
      toast.error("Offline. Check-ins will be limited until reconnected.");
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // SW Registration for PWA
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker Registered!", reg.scope))
        .catch((err) => console.error("Service worker registration failed:", err));
    }

    // Load current operator session
    fetch("/api/operator/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOperator(d.operator);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      stopCamera();
    };
  }, [stopCamera]);

  // Watch tab switches to start/stop camera
  useEffect(() => {
    if (operator && activeTab === "scan" && !scanResult) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [operator, activeTab, scanResult, startCamera, stopCamera]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await fetch("/api/operator/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setOperator(data.operator);
      toast.success(`Welcome back, ${data.operator.name}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/operator/logout", { method: "POST" });
    setOperator(null);
    stopCamera();
    toast.info("Logged out successfully");
  }

  

  const handleCodeScanned = useCallback(async (token: string) => {
    stopCamera();
    setCheckingIn(true);

    if (!online) {
      // Offline scenario
      setScanResult({
        success: false,
        statusText: "❌ Offline Mode",
        error: "Cannot check in offline. Scans will be queued."
      });
      setCheckingIn(false);
      return;
    }

    try {
      const res = await fetch("/api/operator/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      setScanResult(data);

      // Add to session log
      const name = data.attendee?.name || "Attendee";
      const status = data.statusText || (res.ok ? "✅ Valid" : "❌ Invalid");
      setScannedLogs((prev) => [{ time: new Date().toLocaleTimeString(), name, status }, ...prev]);
    } catch (err: any) {
      setScanResult({
        success: false,
        statusText: "❌ Scan Error",
        error: err.message || "Failed to contact database"
      });
    } finally {
      setCheckingIn(false);
    }
  }, [stopCamera, online]);

  // Real-time Canvas Processing for QR Codes
  const scanTick = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });

        if (code && code.data) {
          // Detected checkin token
          handleCodeScanned(code.data);
          return; // Stop scanning once we detect a code
        }
      }
    }
    animationFrameId.current = requestAnimationFrame(() => scanTickRef.current());
  }, [handleCodeScanned]);

  // Keep a ref to the latest scanTick so callbacks can invoke it safely
  useEffect(() => {
    scanTickRef.current = scanTick;
  }, [scanTick]);

  function resetScanner() {
    setScanResult(null);
    startCamera();
  }

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="mt-4 text-zinc-400">Loading operator portal...</span>
      </div>
    );
  }

  // Auth Display
  if (!operator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-white">
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 text-white shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Operator Portal</CardTitle>
            <CardDescription className="text-zinc-400">
              Sign in with your scanner credentials and PIN.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-300">Operator Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@campaign.com"
                  className="border-zinc-800 bg-zinc-950 text-white focus-visible:ring-primary"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pin" className="text-zinc-300">Secure PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="••••••"
                  className="border-zinc-800 bg-zinc-950 text-white focus-visible:ring-primary text-center text-xl tracking-widest"
                  value={authForm.pin}
                  onChange={(e) => setAuthForm({ ...authForm, pin: e.target.value.replace(/\D/g, "") })}
                />
              </div>
              <Button type="submit" disabled={authLoading} className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold">
                {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify Identity"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Scanner Display
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 font-sans pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-zinc-850 bg-zinc-900/90 px-4 py-3 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h1 className="font-bold text-sm leading-none">{operator.name}</h1>
            <span className="text-[10px] text-zinc-400">Scan Operator</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {online ? (
            <Wifi className="h-4 w-4 text-emerald-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-rose-400" />
          )}
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {/* Offline Banner */}
        {!online && (
          <div className="mb-4 rounded-md border border-rose-900/30 bg-rose-950/20 p-3 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>Running Offline. Live ticket check-in is temporarily disabled.</span>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
          <Button variant={activeTab === "scan" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("scan")}>
            Camera Scanner
          </Button>
          <Button variant={activeTab === "history" ? "secondary" : "ghost"} size="sm" onClick={() => setActiveTab("history")}>
            Session Logs
          </Button>
        </div>

        {activeTab === "scan" && (
          <div className="space-y-4">
            {/* Camera Viewport */}
            {!scanResult && (
              <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 aspect-square shadow-2xl flex items-center justify-center">
                <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay Scanning Guide */}
                {scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/10">
                    <div className="relative w-64 h-64 border-2 border-primary/40 rounded-lg flex items-center justify-center">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br"></div>
                      {/* Laser Line Animation */}
                      <div className="w-full h-0.5 bg-primary/80 absolute top-1/2 left-0 animate-[bounce_2s_infinite]"></div>
                    </div>
                    <p className="mt-4 text-xs font-semibold text-zinc-300 bg-black/60 px-3 py-1 rounded-full">
                      Align QR inside frame
                    </p>
                  </div>
                )}

                {checkingIn && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm font-medium mt-2 text-zinc-300">Checking Ticket Validity...</span>
                  </div>
                )}

                {!scanning && !checkingIn && (
                  <Button onClick={startCamera} className="z-10 bg-primary text-primary-foreground font-bold shadow-lg">
                    <Camera className="mr-2 h-4 w-4" />
                    Activate Camera
                  </Button>
                )}
              </div>
            )}

            {/* Results Details Display Card */}
            {scanResult && (
              <Card className={`border-zinc-800 text-white shadow-xl ${scanResult.success ? "bg-emerald-950/20 border-emerald-900/30" : "bg-red-950/20 border-red-900/30"}`}>
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/80 mb-2">
                    {scanResult.success ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-red-400" />
                    )}
                  </div>
                  <CardTitle className="text-2xl font-black">{scanResult.statusText}</CardTitle>
                  {scanResult.error && (
                    <CardDescription className="text-red-400 font-semibold mt-1">
                      {scanResult.error}
                    </CardDescription>
                  )}
                  {scanResult.firstCheckInTime && (
                    <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                      First scanned at: {scanResult.firstCheckInTime}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {scanResult.attendee && (
                    <div className="rounded-lg bg-zinc-950/40 p-4 border border-zinc-850 space-y-3">
                      <div>
                        <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Attendee</div>
                        <div className="text-lg font-bold mt-0.5">{scanResult.attendee.name}</div>
                        <div className="text-xs text-zinc-400">{scanResult.attendee.email}</div>
                      </div>

                      {/* Display Dynamic Merge Fields */}
                      {Object.keys(scanResult.attendee.fields).length > 0 && (
                        <div className="border-t border-zinc-900 pt-3 space-y-2">
                          {Object.entries(scanResult.attendee.fields).map(([key, val]) => (
                            <div key={key} className="flex justify-between items-center text-xs">
                              <span className="text-zinc-500 font-medium uppercase">{key}:</span>
                              <span className="text-zinc-200 font-bold">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <Button onClick={resetScanner} className="w-full bg-primary text-primary-foreground font-bold py-6 text-base">
                    Scan Next Ticket
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Local session history */}
        {activeTab === "history" && (
          <Card className="border-zinc-800 bg-zinc-900 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Scanned in this Session</CardTitle>
              <CardDescription className="text-zinc-400">Logs reset on page refresh.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-zinc-850 max-h-96 overflow-y-auto pr-1">
                {scannedLogs.length === 0 ? (
                  <div className="text-center text-zinc-500 py-10 text-xs">
                    No tickets scanned yet this session.
                  </div>
                ) : (
                  scannedLogs.map((log, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-center text-xs gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold truncate text-zinc-200">{log.name}</div>
                        <div className="text-[10px] text-zinc-500">{log.time}</div>
                      </div>
                      <Badge className={log.status.includes("✅") ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10" : "bg-red-500/10 text-red-400 hover:bg-red-500/10"}>
                        {log.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
