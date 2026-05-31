"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, BellRing, FileClock, Globe, Gauge, Mail, Menu, ScanLine, Server, Shield, Users, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/smtp", label: "SMTP", icon: Server },
  { href: "/admin/smtp-monitor", label: "SMTP Monitor", icon: Wifi },
  { href: "/admin/quotas", label: "Quotas", icon: Gauge },
  { href: "/admin/domain-analytics", label: "Domain Analytics", icon: Globe },
  { href: "/admin/push", label: "Notifications", icon: BellRing },
  { href: "/admin/operators", label: "Operators", icon: ScanLine },
  { href: "/admin/audit", label: "Audit Log", icon: FileClock },
  { href: "/admin/announcements", label: "Announcements", icon: Bell }
];

function AdminSidebarBody() {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Shield className="h-5 w-5 text-scheduled" /> Admin
      </div>
      <nav className="grid gap-1">
        {nav.map((item) => (
          <Button
            key={item.href}
            asChild
            variant="ghost"
            className={cn(
              "justify-start",
              pathname === item.href && "bg-scheduled/10 text-scheduled"
            )}
          >
            <Link href={item.href}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      <Button asChild variant="outline" className="mt-auto justify-start">
        <Link href="/compose">
          <Mail className="h-4 w-4" />
          Back to App
        </Link>
      </Button>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30 lg:flex">
      <aside className="hidden h-screen w-64 shrink-0 border-r bg-card p-4 lg:flex lg:flex-col sticky top-0">
        <AdminSidebarBody />
      </aside>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 p-3 backdrop-blur lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Admin Console</SheetTitle>
            </SheetHeader>
            <div className="mt-6 h-[calc(100%-4rem)]">
              <AdminSidebarBody />
            </div>
          </SheetContent>
        </Sheet>
        <span className="font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-scheduled" /> Admin Console
        </span>
      </div>
      <main className="min-w-0 flex-1">
        <header className="hidden border-b bg-background px-6 py-4 lg:block">
          <h1 className="text-lg font-semibold">Admin Console</h1>
        </header>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
