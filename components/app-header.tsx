"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, HelpCircle, PanelLeftClose, PanelLeftOpen, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useSidebar } from "@/components/sidebar-context";

const pageTitles: Record<string, { group: string; title: string }> = {
  "/dashboard": { group: "Overview", title: "Dashboard" },
  "/compose": { group: "Dispatch", title: "Campaign Composer" },
  "/bulk": { group: "Dispatch", title: "Bulk Campaigns" },
  "/scheduled": { group: "Dispatch", title: "Scheduled Queue" },
  "/sent": { group: "Dispatch", title: "Sent History" },
  "/drafts": { group: "Dispatch", title: "Drafts" },
  "/templates": { group: "Studio", title: "Email Templates" },
  "/qr": { group: "Studio", title: "QR & Certificates Studio" },
  "/certificates": { group: "Studio", title: "QR & Certificates Studio" },
  "/sent/campaign": { group: "Observability", title: "Campaign Analytics" },
  "/monitor": { group: "Observability", title: "Telemetry & Logs" },
  "/settings": { group: "Preferences", title: "Settings" }
};

export function AppHeader() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [smtpOk, setSmtpOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setSmtpOk(!!d?.smtpConfigured))
      .catch(() => {});
  }, []);

  const meta = pageTitles[pathname] || { group: "Workspace", title: "Dashboard" };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${meta.title} — Postly`;
    }
  }, [meta.title]);

  return (
    <header className="hidden md:flex h-14 w-full items-center justify-between border-b border-border/70 bg-card/40 px-5 backdrop-blur-sm sticky top-0 z-10">
      {/* Breadcrumb path with Sidebar Toggle */}
      <div className="flex items-center gap-2 text-xs">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 text-muted-foreground hover:text-foreground mr-1"
          title={isCollapsed ? "Expand sidebar (⌘B)" : "Collapse sidebar (⌘B)"}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
        <span className="font-semibold text-muted-foreground">Postly</span>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-muted-foreground">{meta.group}</span>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">{meta.title}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Status Pill */}
        {smtpOk !== null && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/80 bg-background/80 text-[11px] font-mono text-muted-foreground">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                smtpOk ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span>{smtpOk ? "SMTP Ready" : "No SMTP Relay"}</span>
          </div>
        )}

        <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
          <Link href="/docs" target="_blank" rel="noopener noreferrer">
            <HelpCircle className="h-3.5 w-3.5 mr-1" /> Docs
          </Link>
        </Button>

        {pathname !== "/compose" && (
          <Button asChild size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs">
            <Link href="/compose">
              <PenLine className="h-3.5 w-3.5 mr-1.5" /> Compose
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
