"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Award, BarChart3, Clock, FileText, Layers, LogOut, Mail, Menu, Moon, PenLine, QrCode, Send, Settings, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const nav = [
  { href: "/compose", label: "Compose", icon: PenLine },
  { href: "/monitor", label: "Monitor", icon: BarChart3 },
  { href: "/drafts", label: "Drafts", icon: FileText },
  { href: "/sent", label: "Sent", icon: Send },
  { href: "/templates", label: "Templates", icon: Layers },
  { href: "/qr", label: "QR Codes", icon: QrCode },
  { href: "/certificates", label: "Certificates", icon: Award },
  { href: "/scheduled", label: "Scheduled", icon: Clock },
  { href: "/bulk", label: "Bulk", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings }
];

function SidebarBody() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [me, setMe] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d)).catch(() => {});
  }, []);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2 px-2 text-lg font-semibold"><Mail className="h-5 w-5" /> Custom Mail</div>
      <nav className="grid gap-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Button key={item.href} asChild variant={active ? "secondary" : "ghost"} className={cn("justify-start", active && "bg-accent text-accent-foreground")}>
              <Link href={item.href}><item.icon className="h-4 w-4" />{item.label}</Link>
            </Button>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3">
        <Separator />
        <div className="flex items-center justify-between rounded-md border p-3 text-sm">
          <span className="flex items-center gap-2"><span className={cn("h-2.5 w-2.5 rounded-full", me?.smtpConfigured ? "bg-sent" : "bg-failed")} /> SMTP</span>
          <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
            {mounted ? resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" /> : <span className="h-4 w-4" />}
          </Button>
        </div>
        <div className="rounded-md bg-muted p-3 text-sm">
          <div className="font-medium">{me?.user?.name || "Signed in"}</div>
          <div className="truncate text-muted-foreground">{me?.user?.email}</div>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={logout}><LogOut className="h-4 w-4" />Logout</Button>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar() {
  return (
    <>
      <aside className="hidden h-screen w-64 shrink-0 border-r bg-card p-4 lg:block"><SidebarBody /></aside>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 p-3 backdrop-blur lg:hidden">
        <Sheet>
          <SheetTrigger asChild><Button variant="outline" size="icon"><Menu className="h-4 w-4" /></Button></SheetTrigger>
          <SheetContent side="left"><SheetHeader><SheetTitle>Navigation</SheetTitle></SheetHeader><div className="mt-6 h-[calc(100%-4rem)]"><SidebarBody /></div></SheetContent>
        </Sheet>
        <span className="font-semibold">Custom Mail</span>
      </div>
    </>
  );
}
