"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SmtpOnboardingBanner() {
  const pathname = usePathname();
  const [smtpConfigured, setSmtpConfigured] = React.useState<boolean | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    const isDismissed = sessionStorage.getItem("postly_smtp_banner_dismissed") === "true";
    if (isDismissed) {
      setDismissed(true);
    }
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setSmtpConfigured(!!d?.smtpConfigured))
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("postly_smtp_banner_dismissed", "true");
  };

  // Don't show if configured, dismissed, still loading, or already on settings page
  if (smtpConfigured !== false || dismissed || pathname === "/settings") {
    return null;
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4 text-amber-500 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs font-bold text-foreground flex items-center gap-2">
              Action Required: Connect your SMTP Relay
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 border border-amber-500/30">
                Setup
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your isolated workspace requires an active SMTP server (AWS SES, Mailgun, SendGrid, Gmail, or custom relay) before you can dispatch emails.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button asChild size="sm" className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-xs">
            <Link href="/settings">
              Configure SMTP <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Dismiss notice for this session"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
