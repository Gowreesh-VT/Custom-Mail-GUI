import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { SidebarProvider } from "@/components/sidebar-context";
import { SmtpOnboardingBanner } from "@/components/smtp-banner";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { NetworkStatus } from "@/components/network-status";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { PwaUpdatePrompt } from "@/components/pwa-update-prompt";
import { PwaSyncHandler } from "@/components/pwa-sync-handler";
import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen md:flex bg-background">
        <AppSidebar />
        <div className="min-w-0 flex-1 flex flex-col">
          <AppHeader />
          <main className="min-w-0 flex-1 p-4 md:p-6 main-content">
            <NetworkStatus />
            <AnnouncementBanner />
            <SmtpOnboardingBanner />
            {children}
          </main>
        </div>
        
        {/* PWA utilities */}
        <PwaInstallPrompt />
        <PwaUpdatePrompt />
        <PwaSyncHandler />
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
