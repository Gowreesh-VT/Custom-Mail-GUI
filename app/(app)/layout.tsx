import { AppSidebar } from "@/components/app-sidebar";
import { AnnouncementBanner } from "@/components/announcement-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar />
      <main className="min-w-0 flex-1 p-4 lg:p-6"><AnnouncementBanner />{children}</main>
    </div>
  );
}
