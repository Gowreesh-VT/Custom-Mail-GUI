"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Award, BarChart3, Clock, FileText, Layers, LayoutDashboard, LogOut, 
  Mail, Menu, PenLine, QrCode, Send, Settings, Shield 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger 
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d))
      .catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const primaryTabs = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/compose", label: "Compose", icon: PenLine },
    { href: "/sent", label: "Sent", icon: Send },
    { href: "/templates", label: "Templates", icon: Layers }
  ];

  const moreTabs = [
    { href: "/drafts", label: "Drafts", icon: FileText },
    { href: "/monitor", label: "Monitor", icon: BarChart3 },
    { href: "/qr", label: "QR & Certs", icon: QrCode },
    { href: "/scheduled", label: "Scheduled", icon: Clock },
    { href: "/bulk", label: "Bulk", icon: Mail },
    { href: "/settings", label: "Settings", icon: Settings }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 border-t border-border backdrop-blur-md bottom-nav">
      <div className="flex h-16 items-center justify-around px-2">
        {primaryTabs.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold transition-colors",
                active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 mb-0.5", active ? "stroke-[2.5]" : "stroke-2")} />
              {item.label}
            </Link>
          );
        })}

        {/* More slide-up Sheet */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold transition-colors",
                moreTabs.some((t) => pathname === t.href || (t.href === "/qr" && pathname.startsWith("/certificates"))) ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Menu className="h-5 w-5 mb-0.5" />
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] bg-card border-t border-border text-foreground rounded-t-xl p-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-foreground text-base font-bold">More Navigation</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col h-[calc(100%-3rem)] justify-between">
              <div className="grid grid-cols-2 gap-2.5">
                {moreTabs.map((item) => {
                  const active = pathname === item.href || (item.href === "/qr" && (pathname === "/certificates" || pathname.startsWith("/certificates/")));
                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant={active ? "secondary" : "outline"}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "justify-start h-11 border-border text-xs",
                        active ? "bg-secondary text-foreground font-semibold" : "bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4 mr-2 text-primary" />
                        {item.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>

              <div className="space-y-4 pb-6">
                <Separator className="bg-border" />
                {me?.user?.role === "admin" && (
                  <Button asChild variant="outline" onClick={() => setIsOpen(false)} className="w-full justify-start border-border bg-card text-foreground">
                    <Link href="/admin">
                      <Shield className="h-4 w-4 mr-2 text-primary" />
                      Go to Admin Dashboard
                    </Link>
                  </Button>
                )}
                
                <div className="rounded-lg bg-secondary/50 p-3.5 border border-border flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="font-bold text-xs text-foreground truncate">{me?.user?.name || "Signed in"}</div>
                    <div className="truncate text-[10px] text-muted-foreground mt-0.5">{me?.user?.email}</div>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="font-semibold text-xs shrink-0 h-8"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
