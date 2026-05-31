"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Plus, Trash2, User } from "lucide-react";
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
  const [profile, setProfile] = useState<any>({ name: "", email: "", phone: "", extraFields: {} });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

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

  const [secondaryForm, setSecondaryForm] = useState<any>({ enabled: false, host: "", port: 587, username: "", password: "", fromName: "", fromEmail: "", encryption: "TLS", rejectUnauth: true, passwordSet: false });
  const [lastFallbackEvent, setLastFallbackEvent] = useState<any>(null);
  const [savingSecondary, setSavingSecondary] = useState(false);
  const [testingSecondary, setTestingSecondary] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // PWA & Push Notification States
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  const primaryHealth = useMemo(() => health.filter((h) => h.smtpType === "primary" || !h.smtpType), [health]);
  const secondaryHealth = useMemo(() => health.filter((h) => h.smtpType === "secondary"), [health]);

  useEffect(() => {
    loadSettings();
    loadSubscriptions();

    if (typeof window !== "undefined") {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);

      const handleStatus = (e: any) => {
        if (e.detail?.installed) setIsInstalled(true);
      };
      window.addEventListener("pwa-status", handleStatus);

      if ("Notification" in window) {
        setNotificationsEnabled(Notification.permission === "granted");
      }

      return () => {
        window.removeEventListener("pwa-status", handleStatus);
      };
    }
  }, []);

  async function loadSubscriptions() {
    setLoadingSubscriptions(true);
    try {
      const data = await apiFetch<any>("/api/push/subscriptions");
      if (data.success) {
        setSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    } finally {
      setLoadingSubscriptions(false);
    }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function enableNotifications() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast.error("Push notifications are not supported in this browser.");
        return;
      }

      if (Notification.permission === "denied") {
        toast.error("Notifications blocked. Please open browser settings to allow.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permission not granted");
        return;
      }

      setSubscribing(true);

      const keyData = await apiFetch<any>("/api/push/vapid-key");
      const publicKey = keyData.publicKey;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!)));
      const auth = btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!)));

      const ua = navigator.userAgent;
      let platform = "Desktop";
      if (/android/i.test(ua)) platform = "Android";
      else if (/iphone|ipad|ipod/i.test(ua)) platform = "iOS";

      let deviceName = "Unknown Device";
      if (platform === "iOS") {
        deviceName = /ipad/i.test(ua) ? "iPad" : "iPhone";
      } else if (platform === "Android") {
        const match = ua.match(/\(([^)]+)\)/);
        if (match && match[1]) {
          const parts = match[1].split(";");
          deviceName = parts[parts.length - 1].trim();
        } else {
          deviceName = "Android Device";
        }
      } else {
        if (/chrome/i.test(ua)) deviceName = "Chrome Desktop";
        else if (/safari/i.test(ua)) deviceName = "Safari Desktop";
        else if (/firefox/i.test(ua)) deviceName = "Firefox Desktop";
      }

      await apiFetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          deviceName,
          userAgent: ua,
          platform
        })
      });

      toast.success("✅ Notifications enabled!");
      setNotificationsEnabled(true);
      await loadSubscriptions();
    } catch (error: any) {
      toast.error(error.message || "Failed to subscribe to notifications");
    } finally {
      setSubscribing(false);
    }
  }

  async function removeDevice(endpoint: string) {
    try {
      await apiFetch("/api/push/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint })
      });
      toast.success("Device removed");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub && sub.endpoint === endpoint) {
        await sub.unsubscribe();
        setNotificationsEnabled(false);
      }

      await loadSubscriptions();
    } catch (error: any) {
      toast.error(error.message);
    }
  }

  async function sendTestNotification() {
    try {
      setTestingPush(true);
      const res = await apiFetch<any>("/api/push/test", { method: "POST" });
      if (res.success) {
        toast.success("Test notification triggered!");
      } else {
        toast.error(res.error || "Failed to send test push");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setTestingPush(false);
    }
  }


  async function loadSettings() {
    setLoading(true);
    setHealthLoading(true);
    setLoadingProfile(true);
    try {
      const profData = await apiFetch<any>("/api/user/profile");
      if (profData.success) {
        setProfile(profData.profile);
      }

      const data = await apiFetch<any>("/api/smtp/settings");
      setForm({ ...data.smtpConfig, password: "" });
      setHealth(data.smtpHealthLog || []);
      setGlobalSmtpActive(Boolean(data.globalSmtpActive));

      const secData = await apiFetch<any>("/api/smtp/settings/secondary");
      setSecondaryForm({ ...secData, password: "" });

      const logsData = await apiFetch<any>("/api/smtp/fallback-logs");
      if (logsData.logs && logsData.logs.length > 0) {
        setLastFallbackEvent(logsData.logs[0]);
      } else {
        setLastFallbackEvent(null);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
      setHealthLoading(false);
      setLoadingProfile(false);
    }
  }

  async function saveProfile() {
    try {
      setSavingProfile(true);
      await apiFetch("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify(profile)
      });
      toast.success("Profile saved successfully");
      // Reload window to update the sidebar profile info immediately
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  function addExtraField() {
    if (!newKey.trim()) {
      toast.error("Field name is required");
      return;
    }
    const sanitizedKey = newKey.trim();
    if (profile.extraFields?.[sanitizedKey]) {
      toast.error("Field already exists");
      return;
    }
    setProfile((current: any) => ({
      ...current,
      extraFields: {
        ...(current.extraFields || {}),
        [sanitizedKey]: newValue
      }
    }));
    setNewKey("");
    setNewValue("");
  }

  function removeExtraField(key: string) {
    setProfile((current: any) => {
      const updated = { ...(current.extraFields || {}) };
      delete updated[key];
      return { ...current, extraFields: updated };
    });
  }

  function setExtraFieldValue(key: string, val: string) {
    setProfile((current: any) => ({
      ...current,
      extraFields: {
        ...(current.extraFields || {}),
        [key]: val
      }
    }));
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

  function setSec(key: string, value: any) {
    setSecondaryForm((current: any) => ({ ...current, [key]: value }));
  }

  async function saveSecondary() {
    try {
      setSavingSecondary(true);
      await apiFetch("/api/smtp/settings/secondary", {
        method: "PUT",
        body: JSON.stringify(secondaryForm)
      });
      toast.success("Fallback SMTP settings saved");
      await loadSettings();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingSecondary(false);
    }
  }

  async function testSecondary() {
    try {
      setTestingSecondary(true);
      const data = await apiFetch<any>("/api/smtp/test/secondary", {
        method: "POST",
        body: JSON.stringify(secondaryForm)
      });
      if (data.success) {
        toast.success(`Connected in ${data.latencyMs}ms`);
      } else {
        toast.error(data.error || "Connection test failed");
      }
      await loadSettings();
    } catch (error: any) {
      toast.error(error.message);
      await loadSettings().catch(() => {});
    } finally {
      setTestingSecondary(false);
    }
  }

  function formatLastUsed(event: any) {
    if (!event) return "Never used (primary is healthy)";
    const date = new Date(event.createdAt);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.round(diffMs / 60000);
    const relative = minutes < 1 ? "just now" : minutes < 60 ? `${minutes} minutes ago` : minutes < 1440 ? `${Math.round(minutes / 60)} hours ago` : `${Math.round(minutes / 1440)} days ago`;
    return `Last used: ${relative} (primary error: ${event.primaryError})`;
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
      <div><h1 className="text-2xl font-semibold tracking-normal">Account Settings</h1><p className="text-sm text-muted-foreground">Manage your profile, credentials, and app preferences.</p></div>
      
      {loadingProfile ? (
        <Card>
          <CardHeader><CardTitle>User Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> User Profile</CardTitle>
            <CardDescription>Update your personal information and custom details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={profile.name || ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={profile.email || ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Phone</Label>
                <Input type="tel" value={profile.phone || ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-semibold">Extra Custom Fields</Label>
              
              {/* List of existing custom fields */}
              {Object.keys(profile.extraFields || {}).length > 0 && (
                <div className="space-y-3">
                  {Object.entries(profile.extraFields || {}).map(([key, val]) => (
                    <div key={key} className="flex gap-2 items-center">
                      <div className="w-1/3 truncate font-mono text-xs bg-muted p-2.5 rounded border">{key}</div>
                      <Input 
                        className="flex-1" 
                        value={String(val)} 
                        onChange={(e) => setExtraFieldValue(key, e.target.value)} 
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeExtraField(key)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add field inline form */}
              <div className="flex gap-2 items-center pt-1">
                <Input 
                  placeholder="New field name (e.g. Company)" 
                  value={newKey} 
                  onChange={(e) => setNewKey(e.target.value)} 
                  className="w-1/3"
                />
                <Input 
                  placeholder="Field value" 
                  value={newValue} 
                  onChange={(e) => setNewValue(e.target.value)} 
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={addExtraField} className="shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {!loading && !globalSmtpActive && (
        <Card className="transition-all duration-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  🔄 Fallback SMTP
                </CardTitle>
                <CardDescription>
                  Configure a backup SMTP server in case primary limits or failures occur.
                </CardDescription>
              </div>
              <Switch
                checked={secondaryForm.enabled}
                onCheckedChange={(checked) => {
                  setSecondaryForm((c: any) => ({ ...c, enabled: checked }));
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              If your primary SMTP fails due to rate limits or connection errors, emails will
              automatically retry using this backup SMTP server.
            </p>

            <div className="rounded-md bg-muted/40 p-3 text-xs flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", lastFallbackEvent ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
              <span className="font-medium text-muted-foreground">
                {formatLastUsed(lastFallbackEvent)}
              </span>
            </div>

            {!secondaryForm.enabled ? (
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-6 text-center text-muted-foreground bg-muted/20">
                <span className="text-2xl mb-1">🔒</span>
                <p className="text-sm font-medium">Secondary SMTP configuration locked</p>
                <p className="text-xs">Enable the toggle to configure a fallback SMTP server</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 pt-2 transition-all duration-300">
                <div className="space-y-2">
                  <Label>Host</Label>
                  <Input
                    value={secondaryForm.host || ""}
                    onChange={(e) => setSec("host", e.target.value)}
                    placeholder="smtp.backup.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={secondaryForm.port || ""}
                    onChange={(e) => setSec("port", Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={secondaryForm.username || ""}
                    onChange={(e) => setSec("username", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={visible.secondaryPassword ? "text" : "password"}
                      value={secondaryForm.password || ""}
                      placeholder={secondaryForm.passwordSet ? "Saved password" : ""}
                      onChange={(e) => setSec("password", e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-10 w-10"
                      onClick={() => setVisible((c) => ({ ...c, secondaryPassword: !c.secondaryPassword }))}
                    >
                      {visible.secondaryPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>From Name</Label>
                  <Input
                    value={secondaryForm.fromName || ""}
                    onChange={(e) => setSec("fromName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>From Email</Label>
                  <Input
                    type="email"
                    value={secondaryForm.fromEmail || ""}
                    onChange={(e) => setSec("fromEmail", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Encryption</Label>
                  <Select
                    value={secondaryForm.encryption || "TLS"}
                    onValueChange={(v) => setSec("encryption", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TLS">TLS</SelectItem>
                      <SelectItem value="SSL">SSL</SelectItem>
                      <SelectItem value="NONE">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>Reject Unauthorized</Label>
                  <Switch
                    checked={secondaryForm.rejectUnauth !== false}
                    onCheckedChange={(v) => setSec("rejectUnauth", v)}
                  />
                </div>
                <div className="flex gap-2 md:col-span-2">
                  <Button onClick={saveSecondary} disabled={savingSecondary}>
                    {savingSecondary ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : "Save Fallback SMTP"}
                  </Button>
                  <Button variant="outline" onClick={testSecondary} disabled={testingSecondary}>
                    {testingSecondary ? <><Loader2 className="h-4 w-4 animate-spin" />Testing...</> : "Test Fallback Connection"}
                  </Button>
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto hover:bg-transparent text-xs text-muted-foreground flex items-center gap-1"
                onClick={() => setShowInfo(!showInfo)}
              >
                <span>ℹ️ When does fallback trigger?</span>
                <span className="text-[10px]">{showInfo ? "▲" : "▼"}</span>
              </Button>
              {showInfo && (
                <div className="mt-2 rounded-md bg-muted/30 border p-3 text-xs space-y-2 text-muted-foreground">
                  <p className="font-semibold text-foreground">Fallback activates when primary SMTP returns:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Rate limit errors (e.g. 421, 452)</li>
                    <li>Connection timeout</li>
                    <li>Connection refused</li>
                    <li>Daily/hourly send limit reached</li>
                  </ul>
                  <p className="font-semibold text-foreground pt-1">Fallback does NOT activate for:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Wrong password (535)</li>
                    <li>Invalid recipient (550)</li>
                    <li>Authentication errors</li>
                  </ul>
                  <p className="text-[10px] italic pt-1">These indicate configuration or routing issues that a backup server cannot fix.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PWA Mobile App Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">📱 Mobile App</CardTitle>
          <CardDescription>Install Custom Mail as a progressive web app on your device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-850 p-4">
            <div>
              <div className="font-bold text-sm text-zinc-100">Status</div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {isInstalled ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">✅ Installed as PWA on this device</span>
                ) : (
                  <span className="text-zinc-500">Not installed</span>
                )}
              </div>
            </div>
            {!isInstalled && (
              <Button
                onClick={() => window.dispatchEvent(new Event("trigger-pwa-install"))}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                Install App
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PWA Push Notifications Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🔔 Push Notifications</CardTitle>
          <CardDescription>Get notified when emails are sent, scheduled sends complete, or emails fail.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-xl bg-zinc-900 border border-zinc-850 p-4">
            <div>
              <div className="font-bold text-sm text-zinc-100">Status</div>
              <div className="text-xs text-zinc-400 mt-0.5">
                {notificationsEnabled ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">🟢 Enabled</span>
                ) : (
                  <span className="text-zinc-500">Not enabled</span>
                )}
              </div>
            </div>
            {!notificationsEnabled && (
              <Button
                onClick={enableNotifications}
                disabled={subscribing}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold"
              >
                {subscribing ? "Enabling..." : "Enable Notifications"}
              </Button>
            )}
          </div>

          {notificationsEnabled && (
            <div className="space-y-4 pt-2 border-t border-zinc-850">
              <div className="space-y-2">
                <Label className="text-zinc-300 font-semibold text-xs uppercase tracking-wider">Notify me when:</Label>
                <div className="space-y-2 pl-1">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="text-emerald-400">✅</span> Email sent successfully
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="text-emerald-400">✅</span> Scheduled email fires
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="text-emerald-400">✅</span> Bulk send completes
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="text-emerald-400">✅</span> Email fails
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-zinc-850">
                <Label className="text-zinc-300 font-semibold text-xs uppercase tracking-wider">Active Devices ({subscriptions.length})</Label>
                {loadingSubscriptions ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                ) : subscriptions.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic pl-1">No active devices registered.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {subscriptions.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between rounded-lg bg-zinc-900/60 border border-zinc-850 p-3 text-xs">
                        <div className="min-w-0 flex-1 mr-3">
                          <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                            <span>📱 {sub.deviceName || sub.platform || "Device"}</span>
                            {sub.platform && <span className="px-1.5 py-0.5 rounded bg-zinc-850 text-[10px] text-zinc-400">{sub.platform}</span>}
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1 truncate">
                            Added: {new Date(sub.createdAt).toLocaleDateString()} · Last active: {new Date(sub.lastUsedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDevice(sub.endpoint)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 font-bold shrink-0"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-850 flex justify-end">
                <Button
                  onClick={sendTestNotification}
                  disabled={testingPush}
                  variant="outline"
                  className="border-zinc-800 text-zinc-300 hover:text-white"
                >
                  {testingPush ? "Sending..." : "Send Test Notification"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Primary SMTP Health History</CardTitle></CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="space-y-2 max-h-[280px]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : primaryHealth.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tests run yet. Click &quot;Test Connection&quot; above to check primary SMTP.</p>
            ) : (
              <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {[...primaryHealth].reverse().slice(0, 10).map((item, index) => (
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

        <Card>
          <CardHeader><CardTitle>Fallback SMTP Health History</CardTitle></CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="space-y-2 max-h-[280px]">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            ) : secondaryHealth.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tests run yet. Click &quot;Test Fallback Connection&quot; to check backup SMTP.</p>
            ) : (
              <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                {[...secondaryHealth].reverse().slice(0, 10).map((item, index) => (
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
