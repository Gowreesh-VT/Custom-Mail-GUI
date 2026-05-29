import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Postly",
  description: "Postly is a production email client for custom SMTP sending",
  icons: {
    icon: "/main-logo.svg",
    shortcut: "/main-logo.svg"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors closeButton />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
