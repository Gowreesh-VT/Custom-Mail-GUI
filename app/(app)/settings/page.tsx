"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type PasswordErrors = Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;

export default function SettingsPage() {
  const [form, setForm] = useState<any>({ host: "", port: 587, username: "", password: "", fromName: "", fromEmail: "", encryption: "TLS", rejectUnauth: true });
  const [health, setHealth] = useState<any[]>([]);
  const [globalSmtpActive, setGlobalSmtpActive] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setHealthLoading(true);
    try {
      const data = await apiFetch<any>("/api/smtp/settings");
      setForm({ ...data.smtpConfig, password: "" });
      setHealth(data.smtpHealthLog || []);
      setGlobalSmtpActive(Boolean(data.globalSmtpActive));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
      setHealthLoading(false);
    }
  }

  function set(key: string, value: any) {
    setForm((current: any) => ({ ...current, [key]: value }));
  }

  async function save() {
    try {
      setSaving(true);
      await apiFetch("/api/smtp/settings", { method: "POST", body: JSON.stringify(form) });
      toast.success("SMTP settings saved");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    try {
      setTesting(true);
      const data = await apiFetch<any>("/api/smtp/test", { method: "POST", body: "{}" });
      toast.success(`Connected in ${data.latencyMs}ms`);
      await loadSettings();
    } catch (error: any) {
      toast.error(error.message);
      await loadSettings().catch(() => {});
    } finally {
      setTesting(false);
    }
  }

  const strength = useMemo(() => passwordStrength(passwords.newPassword), [passwords.newPassword]);

  function validatePasswordFields() {
    const errors: PasswordErrors = {};
    if (!passwords.currentPassword) errors.currentPassword = "Current password is required";
    if (!passwords.newPassword) errors.newPassword = "New password is required";
    else if (passwords.newPassword.length < 8) errors.newPassword = "New password must be at least 8 characters";
    else if (passwords.newPassword === passwords.currentPassword) errors.newPassword = "New password must be different";
    if (!passwords.confirmPassword) errors.confirmPassword = "Confirm new password is required";
    else if (passwords.newPassword !== passwords.confirmPassword) errors.confirmPassword = "Passwords do not match";
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function updatePassword() {
    if (!validatePasswordFields()) return;
    try {
      setChangingPassword(true);
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword })
      });
      toast.success("Password updated successfully");
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordErrors({});
    } catch (error: any) {
      if (error.message === "Current password is incorrect") {
        setPasswordErrors((current) => ({ ...current, currentPassword: "Incorrect password" }));
      } else {
        toast.error("Something went wrong, try again");
      }
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div><h1 className="text-2xl font-semibold tracking-normal">SMTP Settings</h1><p className="text-sm text-muted-foreground">Credentials are encrypted and scoped to your account.</p></div>
      {loading ? (
        <Card>
          <CardHeader><CardTitle>Connection</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32 rounded-md" />
              <Skeleton className="h-10 w-36 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ) : globalSmtpActive ? (
        <Card><CardHeader><CardTitle>Connection</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">SMTP is managed by your administrator.</p></CardContent></Card>
      ) : <Card>
        <CardHeader><CardTitle>Connection</CardTitle><CardDescription>Password is never returned after saving.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Host</Label><Input value={form.host} onChange={(e) => set("host", e.target.value)} /></div>
          <div className="space-y-2"><Label>Port</Label><Input type="number" value={form.port} onChange={(e) => set("port", Number(e.target.value))} /></div>
          <div className="space-y-2"><Label>Username</Label><Input value={form.username} onChange={(e) => set("username", e.target.value)} /></div>
          <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} placeholder={form.hasPassword ? "Saved password" : ""} onChange={(e) => set("password", e.target.value)} /></div>
          <div className="space-y-2"><Label>From Name</Label><Input value={form.fromName} onChange={(e) => set("fromName", e.target.value)} /></div>
          <div className="space-y-2"><Label>From Email</Label><Input type="email" value={form.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} /></div>
          <div className="space-y-2"><Label>Encryption</Label><Select value={form.encryption} onValueChange={(v) => set("encryption", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TLS">TLS</SelectItem><SelectItem value="SSL">SSL</SelectItem><SelectItem value="NONE">None</SelectItem></SelectContent></Select></div>
          <div className="flex items-center justify-between rounded-md border p-3"><Label>Reject Unauthorized</Label><Switch checked={form.rejectUnauth} onCheckedChange={(v) => set("rejectUnauth", v)} /></div>
          <div className="flex gap-2 md:col-span-2">
            <Button onClick={save} disabled={saving}>{saving ? (<><Loader2 className="h-4 w-4 animate-spin" />Saving...</>) : "Save Settings"}</Button>
            <Button variant="outline" onClick={test} disabled={testing}>{testing ? (<><Loader2 className="h-4 w-4 animate-spin" />Testing...</>) : "Test Connection"}</Button>
          </div>
        </CardContent>
      </Card>}

      <Card>
        <CardHeader><CardTitle>Change Password</CardTitle><CardDescription>Update your account password without changing active sessions.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <PasswordField label="Current Password" value={passwords.currentPassword} visible={visible.currentPassword} error={passwordErrors.currentPassword} onToggle={() => setVisible((current) => ({ ...current, currentPassword: !current.currentPassword }))} onChange={(value) => setPasswords((current) => ({ ...current, currentPassword: value }))} />
          <div className="space-y-2">
            <PasswordField label="New Password" value={passwords.newPassword} visible={visible.newPassword} error={passwordErrors.newPassword} onToggle={() => setVisible((current) => ({ ...current, newPassword: !current.newPassword }))} onChange={(value) => setPasswords((current) => ({ ...current, newPassword: value }))} />
            <div className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full transition-all" style={{ width: strength.width, backgroundColor: strength.barColor }} />
              </div>
              <p className="text-xs" style={{ color: strength.textColor }}>{strength.label}</p>
            </div>
          </div>
          <PasswordField label="Confirm New Password" value={passwords.confirmPassword} visible={visible.confirmPassword} error={passwordErrors.confirmPassword} onToggle={() => setVisible((current) => ({ ...current, confirmPassword: !current.confirmPassword }))} onChange={(value) => setPasswords((current) => ({ ...current, confirmPassword: value }))} />
          <div className="flex justify-end">
            <Button onClick={updatePassword} disabled={changingPassword}>
              {changingPassword ? (<><Loader2 className="h-4 w-4 animate-spin" />Updating...</>) : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>SMTP Health History</CardTitle></CardHeader>
        <CardContent>
          {healthLoading ? (
            <div className="space-y-2 max-h-[280px]">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          ) : health.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tests run yet. Click &quot;Test Now&quot; to check your connection.</p>
          ) : (
            <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {[...health].reverse().slice(0, 10).map((item, index) => (
                <div key={index} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className={cn("h-2.5 w-2.5 rounded-full", item.success ? "bg-sent" : "bg-failed")} />
                    <span className="font-medium">{item.success ? "Connected" : "Failed"}</span>
                    <span className="text-muted-foreground">{item.success ? `${item.latencyMs}ms` : "-"}</span>
                    <span className="ml-auto text-muted-foreground">{formatHealthTime(item.testedAt)}</span>
                  </div>
                  {!item.success && item.error && <p className="mt-2 pl-5 text-sm text-muted-foreground">{item.error}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordField({ label, value, visible, error, onToggle, onChange }: { label: string; value: string; visible?: boolean; error?: string; onToggle: () => void; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} className="pr-10" />
        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-10 w-10" onClick={onToggle}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p className="text-sm text-failed">{error}</p>}
    </div>
  );
}

function passwordStrength(password: string) {
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((regex) => regex.test(password)).length;
  if (password.length >= 12 && variety >= 4) {
    return { label: "Strong", width: "100%", barColor: "hsl(var(--sent))", textColor: "hsl(var(--sent))" };
  }
  if (password.length >= 8 && variety >= 2) {
    return { label: "Fair", width: "66%", barColor: "hsl(var(--warning))", textColor: "hsl(var(--warning))" };
  }
  return { label: "Weak", width: password.length ? "33%" : "0%", barColor: "hsl(var(--failed))", textColor: "hsl(var(--failed))" };
}

function formatHealthTime(value: string | Date) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  const relative = minutes < 1 ? "just now" : minutes < 60 ? `${minutes} minutes ago` : minutes < 1440 ? `${Math.round(minutes / 60)} hours ago` : `${Math.round(minutes / 1440)} days ago`;
  return `${relative} · ${date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}
