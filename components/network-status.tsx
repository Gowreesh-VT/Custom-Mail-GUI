"use client";

import { useEffect, useState } from "react";
import { CheckCircle, WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";

export function NetworkStatus() {
  const isOnline = useNetworkStatus();
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowOnlineBanner(false);
    } else if (isOnline && wasOffline) {
      setShowOnlineBanner(true);
      const timer = setTimeout(() => {
        setShowOnlineBanner(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return (
      <div className="w-full bg-amber-500 text-zinc-950 px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold shadow-md animate-in slide-in-from-top duration-350">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>⚡ You&apos;re offline — some features may be unavailable</span>
      </div>
    );
  }

  if (showOnlineBanner) {
    return (
      <div className="w-full bg-emerald-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold shadow-md animate-in slide-in-from-top duration-350">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span>✅ Back online — connection restored</span>
      </div>
    );
  }

  return null;
}
