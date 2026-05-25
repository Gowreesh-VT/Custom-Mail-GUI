"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, FileClock, Mail, ScanLine, Server, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/smtp", label: "SMTP", icon: Server },
  { href: "/admin/operators", label: "Operators", icon: ScanLine },
  { href: "/admin/audit", label: "Audit Log", icon: FileClock },
  { href: "/admin/announcements", label: "Announcements", icon: Bell }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-muted/30 lg:flex">
      <aside className="hidden h-screen w-64 border-r bg-card p-4 lg:flex lg:flex-col">
        <div className="mb-6 flex items-center gap-2 text-lg font-semibold"><Shield className="h-5 w-5 text-scheduled" /> Admin</div>
        <nav className="grid gap-1">
          {nav.map((item) => <Button key={item.href} asChild variant="ghost" className={cn("justify-start", pathname === item.href && "bg-scheduled/10 text-scheduled")}><Link href={item.href}><item.icon className="h-4 w-4" />{item.label}</Link></Button>)}
        </nav>
        <Button asChild variant="outline" className="mt-auto justify-start"><Link href="/compose"><Mail className="h-4 w-4" />Back to App</Link></Button>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="border-b bg-background px-6 py-4"><h1 className="text-lg font-semibold">Admin Console</h1></header>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
