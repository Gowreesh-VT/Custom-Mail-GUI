"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Award, BarChart3, Clock, FileText, Layers, LogOut, 
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
    { href: "/compose", label: "Compose", icon: PenLine },
    { href: "/sent", label: "Sent", icon: Send },
    { href: "/drafts", label: "Drafts", icon: FileText },
    { href: "/templates", label: "Templates", icon: Layers }
  ];

  const moreTabs = [
    { href: "/monitor", label: "Monitor", icon: BarChart3 },
    { href: "/qr", label: "QR Codes", icon: QrCode },
    { href: "/certificates", label: "Certificates", icon: Award },
    { href: "/scheduled", label: "Scheduled", icon: Clock },
    { href: "/bulk", label: "Bulk", icon: Mail },
    { href: "/settings", label: "Settings", icon: Settings }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 border-t border-zinc-850 backdrop-blur-md bottom-nav">
      <div className="flex h-16 items-center justify-around px-2">
        {primaryTabs.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-semibold transition-colors",
                active ? "text-primary" : "text-zinc-500 hover:text-zinc-300"
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
                moreTabs.some((t) => pathname === t.href) ? "text-primary" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Menu className="h-5 w-5 mb-0.5" />
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] bg-zinc-950 border-t border-zinc-800 text-white rounded-t-2xl p-6">
            <SheetHeader className="text-left">
              <SheetTitle className="text-zinc-100 text-lg font-bold">More Navigation</SheetTitle>
            </SheetHeader>
            <div className="mt-6 flex flex-col h-[calc(100%-3rem)] justify-between">
              <div className="grid grid-cols-2 gap-3">
                {moreTabs.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant={active ? "secondary" : "outline"}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "justify-start h-12 border-zinc-800",
                        active ? "bg-zinc-800 text-white" : "bg-zinc-900/40 text-zinc-300 hover:text-white"
                      )}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>

              <div className="space-y-4 pb-6">
                <Separator className="bg-zinc-850" />
                {me?.user?.role === "admin" && (
                  <Button asChild variant="outline" onClick={() => setIsOpen(false)} className="w-full justify-start border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:text-white">
                    <Link href="/admin">
                      <Shield className="h-4 w-4 mr-2" />
                      Go to Admin Dashboard
                    </Link>
                  </Button>
                )}
                
                <div className="rounded-xl bg-zinc-900 p-4 border border-zinc-850 flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="font-bold text-sm text-zinc-100 truncate">{me?.user?.name || "Signed in"}</div>
                    <div className="truncate text-xs text-zinc-400 mt-0.5">{me?.user?.email}</div>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="font-bold shrink-0"
                  >
                    <LogOut className="h-4 w-4 mr-1.5" />
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
