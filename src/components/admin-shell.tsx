"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BellRing,
  FileClock,
  Globe,
  Gauge,
  Menu,
  ScanLine,
  Server,
  Shield,
  Users,
  Wifi,
  ArrowLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const adminGroups = [
  {
    title: "OVERVIEW",
    items: [
      { href: "/admin", label: "Cluster Overview", icon: BarChart3 },
      { href: "/admin/users", label: "Users & Accounts", icon: Users },
      { href: "/admin/quotas", label: "Rate Limits & Quotas", icon: Gauge }
    ]
  },
  {
    title: "INFRASTRUCTURE",
    items: [
      { href: "/admin/smtp", label: "SMTP Clusters", icon: Server },
      { href: "/admin/smtp-monitor", label: "Socket Monitor", icon: Wifi },
      { href: "/admin/domain-analytics", label: "Domain Reputation", icon: Globe }
    ]
  },
  {
    title: "SECURITY & EVENTS",
    items: [
      { href: "/admin/operators", label: "Scanner Operators", icon: ScanLine },
      { href: "/admin/audit", label: "System Audit Logs", icon: FileClock },
      { href: "/admin/push", label: "Push Telemetry", icon: BellRing },
      { href: "/admin/announcements", label: "System Alerts", icon: Bell }
    ]
  }
];

function AdminSidebarBody() {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-3">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-2 py-1.5">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-foreground">Postly</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                Admin
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">Control Plane</div>
          </div>
        </Link>
      </div>

      <Separator className="bg-border/60 my-1" />

      {/* Grouped Admin Nav */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1">
        {adminGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-2 text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase">
              {group.title}
            </div>
            <div className="grid gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "w-full justify-start text-xs font-medium h-8.5 px-2.5 transition-all",
                      active
                        ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary rounded-l-none"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon className={cn("h-4 w-4 mr-2.5", active ? "text-primary" : "text-muted-foreground")} />
                      {item.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-2 border-t border-border/80">
        <Button asChild variant="outline" size="sm" className="w-full justify-start text-xs h-8.5 border-border bg-card hover:bg-secondary">
          <Link href="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <span>Return to App</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  let currentTitle = "System Overview";
  for (const group of adminGroups) {
    for (const item of group.items) {
      if (item.href === pathname) currentTitle = item.label;
    }
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden h-screen w-60 shrink-0 border-r border-border bg-sidebar p-3 lg:flex lg:flex-col sticky top-0 z-20">
        <AdminSidebarBody />
      </aside>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-68 p-4 bg-sidebar">
              <SheetHeader className="text-left pb-2">
                <SheetTitle className="text-sm font-bold text-foreground">Admin Console</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-2.5rem)]">
                <AdminSidebarBody />
              </div>
            </SheetContent>
          </Sheet>
          <span className="font-bold text-sm flex items-center gap-2 text-foreground">
            <Shield className="h-4 w-4 text-primary" /> Postly Admin
          </span>
        </div>
        <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2">
          <Link href="/dashboard">Back to App</Link>
        </Button>
      </div>
      <main className="min-w-0 flex-1 flex flex-col">
        <header className="hidden h-14 border-b border-border/70 bg-card/40 px-6 backdrop-blur-sm lg:flex lg:items-center lg:justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Postly</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            <span className="text-muted-foreground">Administration</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            <span className="font-semibold text-foreground">{currentTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/10 text-[11px] font-mono text-primary font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>Root Privilege Session</span>
            </div>
          </div>
        </header>
        <div className="p-4 lg:p-6 flex-1">{children}</div>
      </main>
    </div>
  );
}
