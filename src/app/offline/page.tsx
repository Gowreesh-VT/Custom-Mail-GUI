"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, FileText, Layout, LayoutDashboard, Mail, RefreshCw, Send, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Auto reload when back online
      window.location.reload();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const cachedLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/compose", label: "Compose", icon: Mail },
    { href: "/sent", label: "Sent History", icon: Send },
    { href: "/drafts", label: "Drafts", icon: FileText },
    { href: "/templates", label: "Templates", icon: Layout },
    { href: "/scheduled", label: "Scheduled", icon: Calendar }
  ];

  return (
    <main className="relative min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.04),transparent_60%)]" />

      <div className="relative w-full max-w-md text-center space-y-8 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
        {/* App Logo */}
        <div className="mx-auto flex justify-center">
          <div className="relative h-32 w-32 rounded-3xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl flex items-center justify-center">
            <Image
              src="/icons/icon-192.png"
              alt="Custom Mail Logo"
              width={112}
              height={112}
              className="rounded-2xl"
              priority
            />
            {/* Offline indicator badge */}
            <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center">
              <WifiOff className="h-4 w-4 text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white">You&apos;re offline</h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
            Connect to the internet to continue using Custom Mail.
          </p>
        </div>

        {/* Live Status indicator */}
        <div className="flex justify-center">
          {isOnline ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Back online — reloading...
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              🔴 Offline
            </div>
          )}
        </div>

        {/* Try Again Button */}
        <Button
          onClick={() => window.location.reload()}
          className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-6 text-base rounded-xl transition-transform hover:scale-[1.01]"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>

        {/* Cached Pages Section */}
        <div className="border-t border-zinc-800/80 pt-6 space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider text-left">
            Previously visited pages
          </h2>
          <div className="grid grid-cols-2 gap-2 text-left">
            {cachedLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/20 hover:bg-zinc-950/60 transition-colors text-zinc-300 hover:text-white"
              >
                <Icon className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
