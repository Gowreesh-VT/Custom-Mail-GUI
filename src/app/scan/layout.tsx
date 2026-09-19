import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest-scan.json"
};

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
