"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    try {
      const body = Object.fromEntries(formData.entries());
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error ||
            (res.status === 500
              ? "Internal server error. Please check server logs."
              : "Authentication failed")
        );
      }
      toast.success(mode === "login" ? "Welcome back" : "Account created successfully");
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const nextUrl = searchParams?.get("next");
      const targetUrl = data.user?.forcePasswordReset
        ? "/settings"
        : (nextUrl && nextUrl.startsWith("/") && !nextUrl.startsWith("//") ? nextUrl : "/dashboard");
      window.location.href = targetUrl;
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border bg-card/90 shadow-xl backdrop-blur-sm card-glow">
      <CardHeader className="space-y-2 pb-4 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2.5 pb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Image src="/main-logo.svg" alt="Postly" width={22} height={22} className="h-5.5 w-5.5" priority />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-foreground">Postly</span>
        </div>
        <CardTitle className="text-xl font-bold text-foreground">
          {mode === "login" ? "Sign in to your console" : "Create your workspace"}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {mode === "login"
            ? "Access your isolated SMTP cluster and campaigns."
            : "Deploy your dedicated email dispatch environment."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-foreground">Full Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Alex Rivera"
                required
                className="bg-background border-border text-sm h-9"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="alex@company.com"
              required
              className="bg-background border-border text-sm h-9"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground">Password</Label>
              {mode === "login" && <ForgotPasswordDialog />}
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={mode === "signup" ? 8 : 1}
                placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
                className="bg-background border-border text-sm h-9 pr-10"
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-9.5 text-xs shadow-sm mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...
              </span>
            ) : mode === "login" ? (
              "Sign In to Console"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-border/70 text-center text-xs text-muted-foreground">
          {mode === "signup" ? (
            <p>
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          ) : (
            <p>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-semibold hover:underline">
                Create one free
              </Link>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ForgotPasswordDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="text-xs text-primary hover:underline font-medium">
          Forgot password?
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> Reset Password
          </DialogTitle>
          <DialogDescription className="pt-2 text-xs text-muted-foreground leading-relaxed">
            For security reasons, password resets are handled with manual verification by the system administrator.
            <br /><br />
            Please email the administrator at{" "}
            <a href="mailto:vt.gowreesh43@gmail.com" className="text-primary hover:underline font-semibold">
              vt.gowreesh43@gmail.com
            </a>{" "}
            from your registered account email to request a reset link.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
