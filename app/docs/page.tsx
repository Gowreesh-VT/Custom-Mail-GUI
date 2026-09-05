"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  Command,
  Home,
  Menu,
  Moon,
  Search,
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/components/theme-provider";
import { DOC_GROUPS, DOC_SECTIONS_DATA } from "@/lib/docs-content";
import { DocsSearchModal } from "@/components/docs/docs-search-modal";
import { DocsToc } from "@/components/docs/docs-toc";

// Section Components
import {
  OverviewSection,
  QuickstartSection,
  ArchitectureSection
} from "@/components/docs/sections/getting-started-sections";
import {
  SmtpPoolSection,
  ProvidersSection,
  HealthLatencySection
} from "@/components/docs/sections/smtp-sections";
import {
  ComposeSection,
  BulkSection,
  PreflightSection,
  ScheduledSection
} from "@/components/docs/sections/dispatch-sections";
import {
  TemplatesSection,
  VariablesSection,
  ClickTrackingSection,
  CertificatesSection
} from "@/components/docs/sections/studio-sections";
import {
  QrEngineSection,
  OperatorPwaSection,
  GateCheckinSection
} from "@/components/docs/sections/qr-sections";
import {
  TelemetrySection,
  SseStreamSection,
  DlqRetrySection,
  AnalyticsSection
} from "@/components/docs/sections/observability-sections";
import {
  RbacRolesSection,
  QuotasSection,
  AuditAnomaliesSection,
  DomainAnalyticsSection,
  AnnouncementsPushSection
} from "@/components/docs/sections/security-sections";
import {
  ApiAuthSection,
  ApiSendSection,
  ApiScheduleSection,
  ApiQrOperatorSection,
  ApiStatsSection
} from "@/components/docs/sections/api-sections";
import {
  DeliverabilitySection,
  SmtpErrorsSection,
  IpWarmupSection
} from "@/components/docs/sections/guides-sections";

// Flattened ordered list for Next/Prev pagination
const ALL_SECTION_IDS = DOC_GROUPS.flatMap((g) => g.items.map((i) => i.id));

function DocsContent() {
  const searchParams = useSearchParams();
  const initialSection = searchParams.get("section") || "overview";

  const [activeSectionId, setActiveSectionId] = React.useState<string>(initialSection);
  const [activeSubSection, setActiveSubSection] = React.useState<string>("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);

  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const contentContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Update document title
  const activeSection = DOC_SECTIONS_DATA[activeSectionId] || DOC_SECTIONS_DATA["overview"];
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${activeSection.title} — Postly Docs v2.5`;
    }
  }, [activeSection.title]);

  // Handle Cmd+K shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset scroll and set first subsection on section change
  React.useEffect(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTop = 0;
    }
    if (activeSection.subSections[0]) {
      setActiveSubSection(activeSection.subSections[0].id);
    }
  }, [activeSectionId, activeSection.subSections]);

  const handleSelectSection = (sectionId: string, subSectionId?: string) => {
    setActiveSectionId(sectionId);
    setMobileDrawerOpen(false);
    if (subSectionId) {
      setTimeout(() => {
        const el = document.getElementById(subSectionId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          setActiveSubSection(subSectionId);
        }
      }, 100);
    }
  };

  const handleSubSectionClick = (subId: string) => {
    setActiveSubSection(subId);
    const el = document.getElementById(subId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Pagination Next/Prev
  const currentIndex = ALL_SECTION_IDS.indexOf(activeSectionId);
  const prevSectionId = currentIndex > 0 ? ALL_SECTION_IDS[currentIndex - 1] : null;
  const nextSectionId = currentIndex < ALL_SECTION_IDS.length - 1 ? ALL_SECTION_IDS[currentIndex + 1] : null;

  const prevSection = prevSectionId ? DOC_SECTIONS_DATA[prevSectionId] : null;
  const nextSection = nextSectionId ? DOC_SECTIONS_DATA[nextSectionId] : null;

  // Render Section Content
  const renderSectionContent = () => {
    switch (activeSectionId) {
      // Getting Started
      case "overview":
        return <OverviewSection />;
      case "quickstart":
        return <QuickstartSection />;
      case "architecture":
        return <ArchitectureSection />;

      // SMTP
      case "smtp-pool":
        return <SmtpPoolSection />;
      case "providers":
        return <ProvidersSection />;
      case "health-latency":
        return <HealthLatencySection />;

      // Dispatch
      case "compose":
        return <ComposeSection />;
      case "bulk":
        return <BulkSection />;
      case "preflight":
        return <PreflightSection />;
      case "scheduled":
        return <ScheduledSection />;

      // Studio
      case "templates":
        return <TemplatesSection />;
      case "variables":
        return <VariablesSection />;
      case "click-tracking":
        return <ClickTrackingSection />;
      case "certificates":
        return <CertificatesSection />;

      // Dynamic QR & Scanner
      case "qr-engine":
        return <QrEngineSection />;
      case "operator-pwa":
        return <OperatorPwaSection />;
      case "gate-checkin":
        return <GateCheckinSection />;

      // Observability
      case "telemetry":
        return <TelemetrySection />;
      case "sse-stream":
        return <SseStreamSection />;
      case "dlq-retry":
        return <DlqRetrySection />;
      case "analytics":
        return <AnalyticsSection />;

      // Security
      case "rbac-roles":
        return <RbacRolesSection />;
      case "quotas":
        return <QuotasSection />;
      case "audit-anomalies":
        return <AuditAnomaliesSection />;
      case "domain-analytics":
        return <DomainAnalyticsSection />;
      case "announcements-push":
        return <AnnouncementsPushSection />;

      // API
      case "api-auth":
        return <ApiAuthSection />;
      case "api-send":
        return <ApiSendSection />;
      case "api-schedule":
        return <ApiScheduleSection />;
      case "api-qr-operator":
        return <ApiQrOperatorSection />;
      case "api-stats":
        return <ApiStatsSection />;

      // Guides
      case "deliverability":
        return <DeliverabilitySection />;
      case "smtp-errors":
        return <SmtpErrorsSection />;
      case "ip-warmup":
        return <IpWarmupSection />;

      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col relative selection:bg-primary/20 selection:text-primary">
      {/* Background Gradients & Grid Pattern */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none -z-10" />
      <div className="fixed top-[-15%] left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Global Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Brand */}
        <div className="flex items-center gap-3">
          {/* Mobile Drawer Trigger */}
          <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 md:hidden border-border">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 bg-background overflow-y-auto">
              <SheetHeader className="text-left pb-3 border-b border-border">
                <SheetTitle className="text-sm font-bold flex items-center gap-2">
                  <Image src="/main-logo.svg" alt="Postly" width={20} height={20} className="h-5 w-5" />
                  Postly Docs v2.5
                </SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-5">
                {DOC_GROUPS.map((group) => (
                  <div key={group.name} className="space-y-1.5">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                      {group.name}
                    </span>
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectSection(item.id)}
                          className={`flex items-center justify-between w-full text-left rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                            activeSectionId === item.id
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          }`}
                        >
                          <span className="truncate">{item.title}</span>
                          {item.badge && (
                            <span className="text-[9px] font-mono px-1 rounded bg-secondary text-muted-foreground border border-border">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 transition-transform group-hover:scale-105">
              <Image src="/main-logo.svg" alt="Postly" width={20} height={20} className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-foreground">Postly Docs</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border font-bold">
                v2.5
              </span>
            </div>
          </Link>
        </div>

        {/* Center Search Trigger */}
        <div className="flex-1 max-w-md hidden sm:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full h-9 rounded-lg border border-border bg-card/60 hover:bg-card px-3 flex items-center justify-between text-xs text-muted-foreground transition-all shadow-xs"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-primary" />
              <span>Search docs, guides, APIs, error codes...</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border">
              <Command className="h-3 w-3" /> K
            </div>
          </button>
        </div>

        {/* Right Navigation Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="h-8 w-8 sm:hidden text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Button asChild variant="outline" size="sm" className="h-8 text-xs border-border bg-card hover:bg-secondary hidden md:inline-flex">
            <Link href="/dashboard">
              Launch Console
            </Link>
          </Button>

          <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/">
              <Home className="mr-1.5 h-3.5 w-3.5" /> Home
            </Link>
          </Button>

          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-8 items-start min-h-0">
        {/* Desktop Left Navigation Sidebar */}
        <aside className="w-64 shrink-0 sticky top-22 max-h-[calc(100vh-7rem)] overflow-y-auto hidden md:block border-r border-border pr-4 space-y-6 text-xs">
          {DOC_GROUPS.map((group) => (
            <div key={group.name} className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-2 block">
                {group.name}
              </span>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeSectionId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectSection(item.id)}
                      className={`flex items-center justify-between w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                        isActive
                          ? "bg-primary/15 text-primary font-bold border-l-2 border-primary rounded-l-none"
                          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                      }`}
                    >
                      <span className="truncate">{item.title}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono px-1 rounded border font-semibold ${
                            isActive
                              ? "bg-primary/20 text-primary border-primary/30"
                              : "bg-secondary text-muted-foreground border-border"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Center Content Workspace */}
        <div
          id="docs-content-container"
          ref={contentContainerRef}
          className="flex-1 min-w-0 max-w-3xl overflow-y-auto pb-24 space-y-8"
        >
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            <span>{activeSection.group}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            <span className="font-semibold text-foreground">{activeSection.title}</span>
          </div>

          {/* Section Body */}
          <div className="space-y-6">
            {renderSectionContent()}
          </div>

          {/* Pagination Footer */}
          <div className="h-px bg-border/80 my-8" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            {prevSection ? (
              <button
                onClick={() => handleSelectSection(prevSection.id)}
                className="w-full sm:w-auto text-left rounded-xl border border-border bg-card/60 p-4 hover:bg-secondary hover:border-border transition-all space-y-1 group flex-1 max-w-xs"
              >
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-foreground">
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous Article
                </div>
                <div className="text-sm font-bold text-foreground truncate">{prevSection.title}</div>
              </button>
            ) : <div className="flex-1" />}

            {nextSection && (
              <button
                onClick={() => handleSelectSection(nextSection.id)}
                className="w-full sm:w-auto text-right rounded-xl border border-border bg-card/60 p-4 hover:bg-secondary hover:border-border transition-all space-y-1 group flex-1 max-w-xs"
              >
                <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground group-hover:text-foreground">
                  Next Article <ChevronRight className="h-3.5 w-3.5" />
                </div>
                <div className="text-sm font-bold text-foreground truncate">{nextSection.title}</div>
              </button>
            )}
          </div>
        </div>

        {/* Right Rail: Table of Contents & Feedback */}
        <DocsToc
          subSections={activeSection.subSections}
          activeSubSection={activeSubSection}
          onSubSectionClick={handleSubSectionClick}
        />
      </div>

      {/* Global Instant Search Modal */}
      <DocsSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectSection={handleSelectSection}
      />
    </div>
  );
}

export default function DocsPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#07080b]" />}>
      <DocsContent />
    </React.Suspense>
  );
}
