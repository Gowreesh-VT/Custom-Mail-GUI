"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(formData: FormData) {
    setLoading(true);
    try {
      const body = Object.fromEntries(formData.entries());
      const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(mode === "login" ? "Welcome back" : "Account created");
      router.push(data.user?.forcePasswordReset ? "/settings" : "/compose");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex justify-center">
          <Image src="/main-logo.svg" alt="Custom Mail" width={72} height={72} className="h-18 w-18" />
        </div>
        <CardTitle>{mode === "login" ? "Log in" : "Create account"}</CardTitle>
        <CardDescription>{mode === "login" ? "Access your SMTP email client." : "Start with your own isolated workspace."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submit} className="space-y-4">
          {mode === "signup" && <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>}
          <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "login" && <ForgotPasswordDialog />}
            </div>
            <div className="relative">
              <Input id="password" name="password" type={showPassword ? "text" : "password"} required minLength={mode === "signup" ? 8 : 1} className="pr-10" />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button disabled={loading} className="w-full">{loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}</Button>
        </form>
        {mode === "signup" ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ForgotPasswordDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
        >
          Forgot password?
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Forgot Password?</DialogTitle>
          <DialogDescription className="pt-2 text-zinc-400">
            For security reasons, password resets are handled manually by the system administrator.
            <br /><br />
            Please email the administrator at <a href="mailto:vt.gowreesh43@gmail.com" className="text-primary hover:underline font-semibold">vt.gowreesh43@gmail.com</a> to request a new password.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
