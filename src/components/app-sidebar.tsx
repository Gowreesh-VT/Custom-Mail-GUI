"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  Clock,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PenLine,
  QrCode,
  Send,
  Settings,
  Shield
} from "lucide-react";
import { useSidebar } from "@/components/sidebar-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const navGroups = [
  {
    title: "OVERVIEW",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }
    ]
  },
  {
    title: "DISPATCH",
    items: [
      { href: "/compose", label: "Compose", icon: PenLine },
      { href: "/bulk", label: "Bulk Campaigns", icon: Mail },
      { href: "/scheduled", label: "Scheduled", icon: Clock },
      { href: "/sent", label: "Sent History", icon: Send },
      { href: "/drafts", label: "Drafts", icon: FileText }
    ]
  },
  {
    title: "STUDIO",
    items: [
      { href: "/templates", label: "Templates", icon: Layers },
      { href: "/qr", label: "QR & Certificates", icon: QrCode }
    ]
  },
  {
    title: "OBSERVABILITY",
    items: [
      { href: "/monitor", label: "Telemetry & Logs", icon: BarChart3 },
      { href: "/sent/campaign", label: "Campaign Analytics", icon: Layers }
    ]
  },
  {
    title: "PREFERENCES",
    items: [
      { href: "/settings", label: "Settings", icon: Settings }
    ]
  }
];

function SidebarBody({ isCollapsed = false, toggleSidebar }: { isCollapsed?: boolean; toggleSidebar?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<any>(null);

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

  const userInitials = me?.user?.name
    ? me.user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full flex-col gap-2.5">
        {/* Brand Header */}
        <div className={cn("flex items-center py-1", isCollapsed ? "justify-center" : "justify-between px-1")}>
          {!isCollapsed ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 transition-transform group-hover:scale-105 shrink-0">
                  <Image src="/main-logo.svg" alt="Postly" width={20} height={20} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base tracking-tight text-foreground truncate">Postly</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border shrink-0">
                      v2.5
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium truncate">Custom Mail Engine</div>
                </div>
              </Link>
              {toggleSidebar && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                  title="Collapse sidebar (⌘B)"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              )}
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleSidebar}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 hover:scale-105 transition-transform"
                >
                  <Image src="/main-logo.svg" alt="Postly" width={22} height={22} className="h-5.5 w-5.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-semibold">
                Expand sidebar (⌘B)
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <Separator className="bg-border/60 my-0.5" />

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 -mr-0.5 no-scrollbar">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              {!isCollapsed ? (
                <div className="px-2 text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase mb-1">
                  {group.title}
                </div>
              ) : (
                <div className="h-1" />
              )}
              <div className="grid gap-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/") ||
                    (item.href === "/qr" && (pathname === "/certificates" || pathname.startsWith("/certificates/")));

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-9 w-9 mx-auto flex items-center justify-center rounded-lg transition-colors",
                              active
                                ? "bg-primary/15 text-primary font-bold border border-primary/30"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                            )}
                          >
                            <Link href={item.href}>
                              <item.icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs font-semibold">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

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
                      <Link href={item.href} className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-2.5">
                          <item.icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                          <span>{item.label}</span>
                        </span>
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Area */}
        <div className="mt-auto space-y-2 pt-2 border-t border-border/80">
          {/* Admin Link */}
          {me?.user?.role === "admin" && (
            isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 mx-auto flex items-center justify-center border-border bg-card hover:bg-secondary"
                  >
                    <Link href="/admin">
                      <Shield className="h-4 w-4 text-primary" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-semibold">
                  Admin Console
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button asChild variant="outline" size="sm" className="w-full justify-start text-xs h-8 border-border bg-card hover:bg-secondary">
                <Link href="/admin">
                  <Shield className="h-3.5 w-3.5 mr-2 text-primary" />
                  <span>Admin Console</span>
                </Link>
              </Button>
            )
          )}



          {/* User Profile Card */}
          {!isCollapsed ? (
            <div className="rounded-lg border border-border/80 bg-secondary/40 p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-xs text-foreground truncate">
                    {me?.user?.name || "Member Workspace"}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {me?.user?.email}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                onClick={logout}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="h-8 w-8 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs">
                    {userInitials}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-semibold">
                  {me?.user?.name || "Member"} ({me?.user?.email})
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={logout}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-semibold">
                  Sign out
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export function AppSidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <>
      <aside
        className={cn(
          "hidden h-screen shrink-0 border-r border-border bg-sidebar md:block sticky top-0 z-20 transition-all duration-300",
          isCollapsed ? "w-16 p-2" : "w-60 p-3"
        )}
      >
        <SidebarBody isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
      </aside>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:hidden">
        <div className="flex items-center gap-2.5">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-68 p-4 bg-sidebar">
              <SheetHeader className="text-left pb-2">
                <SheetTitle className="text-sm font-bold text-foreground">Navigation</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100%-2.5rem)]">
                <SidebarBody isCollapsed={false} />
              </div>
            </SheetContent>
          </Sheet>
          <span className="flex items-center gap-2 font-bold text-sm text-foreground">
            <Image src="/main-logo.svg" alt="Postly" width={22} height={22} className="h-5.5 w-5.5" />
            Postly
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-7 text-xs px-2">
            <Link href="/compose">New Email</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
