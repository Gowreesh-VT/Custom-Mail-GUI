"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Download, Share, PlusSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isSafari, setIsSafari] = useState(false);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed_at", Date.now().toString());
  }, []);

  const triggerAndroidInstall = useCallback(async (promptEvt: any) => {
    if (!promptEvt) return;
    promptEvt.prompt();
    const { outcome } = await promptEvt.userChoice;
    if (outcome === "accepted") {
      toast.success("Installing Custom Mail...");
      setDeferredPrompt(null);
    } else {
      handleDismiss();
    }
  }, [handleDismiss]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Register main service worker manually
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw-main.js")
        .then((reg) => console.log("PWA Main Service Worker Registered scope:", reg.scope))
        .catch((err) => console.error("PWA Main Service Worker registration failed:", err));
    }

    // 2. Install detector
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      // Trigger event or store badge state
      window.dispatchEvent(new CustomEvent("pwa-status", { detail: { installed: true } }));
      return;
    }

    // 3. Platform Detection
    const ua = navigator.userAgent;
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafariBrowser = /safari/i.test(ua) && !/chrome/i.test(ua) && !/android/i.test(ua);

    setIsSafari(isSafariBrowser);
    if (isAndroid) setPlatform("android");
    else if (isIOS) setPlatform("ios");

    // 4. Session Storage page view count
    let pageCount = Number(sessionStorage.getItem("pwa_page_count") || "0");
    pageCount += 1;
    sessionStorage.setItem("pwa_page_count", pageCount.toString());

    // 5. Dismissed check (last 7 days)
    const dismissedAt = localStorage.getItem("pwa_prompt_dismissed_at");
    const isRecentlyDismissed = dismissedAt && (Date.now() - Number(dismissedAt)) < 7 * 24 * 60 * 60 * 1000;

    // Listen for custom trigger from settings
    const triggerInstall = () => {
      if (isStandalone) {
        toast.info("Custom Mail is already installed!");
        return;
      }
      if (platform === "android" && deferredPrompt) {
        triggerAndroidInstall(deferredPrompt);
      } else if (platform === "ios") {
        setShowPrompt(true);
      } else {
        toast.info("PWA installation is supported via your mobile browser's options.");
      }
    };
    window.addEventListener("trigger-pwa-install", triggerInstall);

    // 6. beforeinstallprompt handler (Android / Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.dispatchEvent(new CustomEvent("pwa-status", { detail: { installable: true } }));

      // Evaluate display trigger rules
      if (!isRecentlyDismissed && pageCount >= 2) {
        // Show after 30 seconds
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 30000);
        return () => clearTimeout(timer);
      }
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 7. appinstalled handler
    const handleAppInstalled = () => {
      toast.success("✅ Custom Mail installed! Find it on your home screen.");
      setShowPrompt(false);
      window.dispatchEvent(new CustomEvent("pwa-status", { detail: { installed: true } }));
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // iOS prompt evaluation (no beforeinstallprompt event available)
    if (isIOS && !isRecentlyDismissed && pageCount >= 2) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 30000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("trigger-pwa-install", triggerInstall);
    };
  }, [platform, deferredPrompt, triggerAndroidInstall]);

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-800 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-md mx-auto relative">
        <button 
          onClick={handleDismiss} 
          className="absolute -top-1 -right-1 text-zinc-500 hover:text-white p-1 rounded-full hover:bg-zinc-900 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {platform === "android" && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-primary font-black shadow-inner">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-white text-sm">Add to Home Screen</h3>
                <p className="text-zinc-400 text-xs mt-0.5">Install for quick access, offline support, and push notifications.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => triggerAndroidInstall(deferredPrompt)}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                Install
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDismiss}
                className="flex-1 border-zinc-800 text-zinc-400 hover:text-white"
              >
                Not Now
              </Button>
            </div>
          </div>
        )}

        {platform === "ios" && (
          <div className="space-y-4 pt-2 text-left">
            <div className="flex items-center gap-2 text-primary">
              <Download className="h-5 w-5" />
              <h3 className="font-bold text-white text-sm">Install Custom Mail</h3>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Add Custom Mail to your home screen to enable a standalone mobile experience and get offline support:
            </p>
            <div className="space-y-3 pl-1">
              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <div className="h-6 w-6 rounded bg-zinc-900 flex items-center justify-center font-bold text-zinc-400 border border-zinc-800 shrink-0">1</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  Tap the Share button 
                  <span className="inline-flex items-center justify-center p-1 rounded bg-zinc-900 border border-zinc-800"><Share className="h-3 w-3 text-primary" /></span> 
                  {isSafari ? "at the bottom of Safari." : "in your mobile browser."}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <div className="h-6 w-6 rounded bg-zinc-900 flex items-center justify-center font-bold text-zinc-400 border border-zinc-800 shrink-0">2</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  Scroll down and tap 
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-white uppercase"><PlusSquare className="h-3 w-3 inline text-zinc-400" /> Add to Home Screen</span>.
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-zinc-300">
                <div className="h-6 w-6 rounded bg-zinc-900 flex items-center justify-center font-bold text-zinc-400 border border-zinc-800 shrink-0">3</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  Tap <span className="font-bold text-white">Add</span> in the top-right corner to confirm.
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleDismiss}
              className="w-full bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-800 font-bold"
            >
              Got it
            </Button>
          </div>
        )}

        {platform === null && (
          <div className="space-y-3 pt-2 text-left">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary shrink-0" />
              <h3 className="font-bold text-white text-sm">Install App</h3>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed">
              Open this website on Chrome (Android) or Safari (iOS) to install it directly onto your mobile device for offline support and system shortcuts.
            </p>
            <Button 
              onClick={handleDismiss}
              className="w-full bg-zinc-900 hover:bg-zinc-850 text-white border border-zinc-800 font-bold"
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
