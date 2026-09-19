import Link from "next/link";
import Image from "next/image";
import { AuthForm } from "@/components/auth-form";
import { Check, Zap } from "lucide-react";

export default function SignupPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background relative overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 bg-grid opacity-25 pointer-events-none -z-10" />
      <div className="fixed top-[-10%] left-[-5%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Left Column: SaaS Value Pitch & Proof (Desktop Only) */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-border/80 bg-secondary/20 relative z-10">
        <div>
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Image src="/main-logo.svg" alt="Postly" width={22} height={22} className="h-5.5 w-5.5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-foreground">Postly</span>
          </Link>
        </div>

        <div className="space-y-8 max-w-md">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5" /> Instant Workspace Deployment
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground leading-snug">
              Start dispatching campaigns in under 2 minutes.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Create an account to configure your SMTP credentials, import recipient CSVs with automated DNS sanitization, and issue dynamic QR tickets.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span>Isolated database schema per workspace</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span>No credit card required for Community tier</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span>Full access to REST API and documentation</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border/80 pt-6 text-xs text-muted-foreground flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} Postly</span>
          <div className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-foreground">Terms</Link>
            <Link href="/docs" className="hover:text-foreground">Docs</Link>
          </div>
        </div>
      </div>

      {/* Right Column: Centered Form */}
      <div className="flex items-center justify-center p-6 sm:p-10 relative z-10">
        <AuthForm mode="signup" />
      </div>
    </main>
  );
}
