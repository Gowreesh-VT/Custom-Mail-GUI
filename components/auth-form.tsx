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

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
          <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required minLength={mode === "signup" ? 8 : 1} /></div>
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
