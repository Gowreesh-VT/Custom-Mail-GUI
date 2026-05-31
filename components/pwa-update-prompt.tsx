"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Check for updates on load
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      
      setRegistration(reg);

      // If there is already a waiting worker, show prompt
      if (reg.waiting) {
        setShowPrompt(true);
      }

      // Listen for new updates
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setShowPrompt(true);
          }
        });
      });
    });

    // Handle controller change (reloading when skipWaiting is active)
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 inset-x-4 md:left-auto md:right-4 z-50 p-4 max-w-sm rounded-xl bg-zinc-900 border border-zinc-800 text-left shadow-2xl animate-in slide-in-from-bottom duration-300">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
          <RefreshCw className="h-5 w-5 animate-spin-slow" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="font-bold text-white text-sm">Update Available</h4>
          <p className="text-zinc-400 text-xs">A new version of Custom Mail is ready to install.</p>
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm"
              onClick={handleUpdate}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-8"
            >
              Update Now
            </Button>
            <Button 
              size="sm"
              variant="ghost" 
              onClick={handleDismiss}
              className="text-zinc-400 hover:text-white text-xs h-8 hover:bg-zinc-850"
            >
              Later
            </Button>
          </div>
        </div>
        <button 
          onClick={handleDismiss} 
          className="text-zinc-500 hover:text-white shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
