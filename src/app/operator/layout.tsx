import type { Metadata } from "next";

export const metadata: Metadata = {
  manifest: "/manifest-scan.json"
};

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
