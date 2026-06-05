"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Plus, Trash2, User } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PasswordErrors = Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>({ name: "", email: "", phone: "", extraFields: {} });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const [health, setHealth] = useState<any[]>([]);
  const [globalSmtpActive, setGlobalSmtpActive] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showResetAlert, setShowResetAlert] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  const goToPassword = () => {
    setActiveTab("profile");
    setTimeout(() => {
      const el = document.getElementById("change-password-card");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        const input = el.querySelector("input");
        if (input) input.focus();
      }
    }, 100);
  };

  // SMTP Pool States
  const [userPool, setUserPool] = useState<any[]>([]);
  const [poolDialogOpen, setPoolDialogOpen] = useState(false);
  const [editingPoolEntry, setEditingPoolEntry] = useState<any>(null);
  const [testingPoolId, setTestingPoolId] = useState<string | null>(null);
  const [poolFormState, setPoolFormState] = useState<any>({
    label: "",
    host: "",
    port: 587,
    username: "",
    password: "",
    fromName: "",
    fromEmail: "",
    encryption: "TLS",
    rejectUnauth: true,
    isPrimary: false,
    isFallback: false
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (editingPoolEntry) {
      setPoolFormState({
        label: editingPoolEntry.label || "",
        host: editingPoolEntry.host || "",
        port: editingPoolEntry.port || 587,
        username: editingPoolEntry.username || "",
        password: "",
        fromName: editingPoolEntry.fromName || "",
        fromEmail: editingPoolEntry.fromEmail || "",
        encryption: editingPoolEntry.encryption || "TLS",
        rejectUnauth: editingPoolEntry.rejectUnauth !== false,
        isPrimary: Boolean(editingPoolEntry.isPrimary),
        isFallback: Boolean(editingPoolEntry.isFallback)
      });
    } else {
      setPoolFormState({
        label: "",
        host: "",
        port: 587,
        username: "",
        password: "",
        fromName: "",
        fromEmail: "",
        encryption: "TLS",
        rejectUnauth: true,
        isPrimary: false,
        isFallback: false
      });
    }
  }, [editingPoolEntry, poolDialogOpen]);



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
        if (profData.profile.forcePasswordReset) {
          setShowResetAlert(true);
        }
      }

      const poolData = await apiFetch<any>("/api/smtp/pool");
      if (poolData.success) {
        setUserPool(poolData.entries || []);
      }

      const data = await apiFetch<any>("/api/smtp/settings");
      setHealth(data.smtpHealthLog || []);
      setGlobalSmtpActive(Boolean(data.globalSmtpActive));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
      setHealthLoading(false);
      setLoadingProfile(false);
    }
  }

  async function refreshUserPool() {
    try {
      const poolData = await apiFetch<any>("/api/smtp/pool");
      if (poolData.success) {
        setUserPool(poolData.entries || []);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load SMTP pool");
    }
  }

  async function handleTestPool(id: string) {
    setTestingPoolId(id);
    try {
      const res = await apiFetch<any>(`/api/smtp/pool/${id}/test`, { method: "POST" });
      if (res.success) {
        toast.success(`Connected successfully in ${res.latencyMs}ms`);
      } else {
        toast.error(res.error || "Connection test failed");
      }
      await refreshUserPool();
    } catch (e: any) {
      toast.error(e.message || "Connection test failed");
      await refreshUserPool();
    } finally {
      setTestingPoolId(null);
    }
  }

  async function handleDeletePool(id: string) {
    if (!confirm("Are you sure you want to remove this SMTP server?")) return;
    try {
      const res = await apiFetch<any>(`/api/smtp/pool/${id}`, { method: "DELETE" });
      if (res.success) {
        toast.success("SMTP server removed");
        if (res.warning) toast.warning(res.warning);
        await refreshUserPool();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to delete SMTP server");
    }
  }

  async function handleSetPoolPrimary(entry: any) {
    try {
      await apiFetch(`/api/smtp/pool/${entry.id}/set-primary`, { method: "POST" });
      toast.success("Set as primary SMTP");
      await refreshUserPool();
    } catch (e: any) {
      toast.error(e.message || "Failed to set primary");
    }
  }

  async function handleSetPoolFallback(entry: any) {
    try {
      await apiFetch(`/api/smtp/pool/${entry.id}/set-fallback`, { method: "POST" });
      toast.success("Set as fallback SMTP");
      await refreshUserPool();
    } catch (e: any) {
      toast.error(e.message || "Failed to set fallback");
    }
  }

  async function handleSavePoolEntry(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = { ...poolFormState };
      if (editingPoolEntry && !payload.password) {
        delete payload.password;
      }
      const endpoint = editingPoolEntry ? `/api/smtp/pool/${editingPoolEntry.id}` : "/api/smtp/pool";
      const method = editingPoolEntry ? "PUT" : "POST";
      const res = await apiFetch<any>(endpoint, { method, body: JSON.stringify(payload) });
      if (res.success) {
        toast.success(editingPoolEntry ? "SMTP server updated" : "SMTP server added to pool");
        setPoolDialogOpen(false);
        setEditingPoolEntry(null);
        await refreshUserPool();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save SMTP settings");
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
      setProfile((current: any) => ({ ...current, forcePasswordReset: false }));
      setShowResetAlert(false);
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
    <div className="mx-auto max-w-6xl space-y-5">
      <div><h1 className="text-2xl font-semibold tracking-normal">Account Settings</h1><p className="text-sm text-muted-foreground">Manage your profile, credentials, and app preferences.</p></div>
      
      {profile.forcePasswordReset && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-500 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-400">
          <div className="flex gap-3">
            <span className="text-xl shrink-0">⚠️</span>
            <div className="space-y-1">
              <h4 className="font-bold text-sm">Action Required: Password Reset Enforced</h4>
              <p className="text-xs opacity-90 leading-relaxed">
                Your administrator has required a password change for your account. You will not be able to navigate to other pages or access core features until your password is updated.
              </p>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-red-500 text-white hover:bg-red-600 border-none h-7 px-3 text-xs font-bold"
                  onClick={goToPassword}
                >
                  Change Password Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile & Security</TabsTrigger>
          <TabsTrigger value="smtp">SMTP Connection</TabsTrigger>
          <TabsTrigger value="app">App & Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-5">
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

          <Card id="change-password-card">
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
        </TabsContent>

        <TabsContent value="smtp" className="space-y-5">
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
              </CardContent>
            </Card>
          ) : (globalSmtpActive || profile.adminSmtpLocked) ? (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-amber-500" /> Connection SMTP
                </CardTitle>
                <CardDescription>
                  {globalSmtpActive 
                    ? "Global SMTP override is active. All system emails are routed through the administrator's SMTP." 
                    : "SMTP settings are locked by your administrator. All outgoing emails are routed using admin-assigned credentials."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Contact your system administrator if you need to update SMTP settings or request credentials.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>SMTP Server Pool</CardTitle>
                  <CardDescription>
                    Configure one or more SMTP servers. The system will send via primary and automatically retry with fallback if errors occur.
                  </CardDescription>
                </div>
                <Button onClick={() => { setEditingPoolEntry(null); setPoolDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add SMTP Server
                </Button>
              </CardHeader>
              <CardContent>
                {userPool.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-muted/20 text-muted-foreground">
                    <span className="text-2xl mb-2">📬</span>
                    <p className="font-medium text-sm">No SMTP servers configured yet</p>
                    <p className="text-xs font-medium">Add a server above to start sending emails.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto no-scrollbar">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Server Info</TableHead>
                          <TableHead>Configuration</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userPool.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <div className="font-semibold text-sm">{entry.label}</div>
                              <div className="text-xs text-muted-foreground font-mono mt-0.5">{entry.host}:{entry.port}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <span className="font-semibold text-muted-foreground">User:</span> {entry.username}
                              </div>
                              <div className="text-xs mt-0.5">
                                <span className="font-semibold text-muted-foreground">From:</span> {entry.fromName} &lt;{entry.fromEmail}&gt;
                              </div>
                            </TableCell>
                            <TableCell className="space-x-1 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant={entry.isPrimary ? "default" : "outline"}
                                className="h-7 px-2 text-[10px] uppercase font-bold"
                                onClick={() => handleSetPoolPrimary(entry)}
                                disabled={entry.isPrimary}
                              >
                                {entry.isPrimary ? "★ Primary" : "Set Primary"}
                              </Button>
                              <Button
                                size="sm"
                                variant={entry.isFallback ? "secondary" : "outline"}
                                className="h-7 px-2 text-[10px] uppercase font-bold"
                                onClick={() => handleSetPoolFallback(entry)}
                                disabled={entry.isFallback}
                              >
                                {entry.isFallback ? "🔄 Fallback" : "Set Fallback"}
                              </Button>
                            </TableCell>
                            <TableCell>
                              {testingPoolId === entry.id ? (
                                <span className="text-xs flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> Testing...</span>
                              ) : entry.lastTestedAt ? (
                                <div className="flex items-center gap-1.5">
                                  <span className={`h-2 w-2 rounded-full ${entry.lastTestSuccess ? "bg-emerald-500" : "bg-red-500"}`} />
                                  <span className="text-xs">
                                    {entry.lastTestSuccess ? `Ok (${entry.lastTestLatency}ms)` : "Failed"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Untested</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-1 whitespace-nowrap">
                              <Button size="sm" variant="outline" className="h-7 px-2.5" onClick={() => handleTestPool(entry.id)} disabled={testingPoolId !== null}>
                                Test
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2.5" onClick={() => { setEditingPoolEntry(entry); setPoolDialogOpen(true); }}>
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 px-2.5" onClick={() => handleDeletePool(entry.id)}>
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
                  <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
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
                  <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
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
        </TabsContent>

        <TabsContent value="app" className="space-y-5">
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
        </TabsContent>
      </Tabs>

      <Dialog open={showResetAlert} onOpenChange={setShowResetAlert}>
        <DialogContent className="sm:max-w-md border-red-500/20 bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <span>⚠️</span> Password Reset Required
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed text-muted-foreground">
              Your administrator has flagged your account for a security password reset.
              <br /><br />
              Until you update your password, <strong>access to the rest of the application is restricted.</strong> Please set a new password in the settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex sm:justify-end gap-2">
            <Button
              className="bg-red-600 hover:bg-red-500 text-white font-bold"
              onClick={() => {
                setShowResetAlert(false);
                goToPassword();
              }}
            >
              Go to Password Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={poolDialogOpen} onOpenChange={setPoolDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-card">
          <DialogHeader>
            <DialogTitle>{editingPoolEntry ? "Edit SMTP Server" : "Add SMTP Server"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePoolEntry} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="poolLabel">Label</Label>
              <Input 
                id="poolLabel"
                value={poolFormState.label} 
                onChange={(e) => setPoolFormState({ ...poolFormState, label: e.target.value })}
                placeholder="e.g. Personal Gmail" 
                required 
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="poolHost">Host</Label>
                <Input 
                  id="poolHost"
                  value={poolFormState.host} 
                  onChange={(e) => setPoolFormState({ ...poolFormState, host: e.target.value })}
                  placeholder="smtp.gmail.com" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="poolPort">Port</Label>
                <Input 
                  id="poolPort"
                  type="number" 
                  value={poolFormState.port} 
                  onChange={(e) => setPoolFormState({ ...poolFormState, port: Number(e.target.value) })}
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="poolUsername">Username</Label>
                <Input 
                  id="poolUsername"
                  value={poolFormState.username} 
                  onChange={(e) => setPoolFormState({ ...poolFormState, username: e.target.value })}
                  placeholder="API Key or email" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="poolPassword">Password</Label>
                <div className="relative">
                  <Input 
                    id="poolPassword"
                    type={showPassword ? "text" : "password"} 
                    value={poolFormState.password} 
                    onChange={(e) => setPoolFormState({ ...poolFormState, password: e.target.value })}
                    placeholder={editingPoolEntry ? "Leave empty to keep saved" : "Password"} 
                    required={!editingPoolEntry} 
                    className="pr-9"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="poolFromName">From Name</Label>
                <Input 
                  id="poolFromName"
                  value={poolFormState.fromName} 
                  onChange={(e) => setPoolFormState({ ...poolFormState, fromName: e.target.value })}
                  placeholder="Sender Name" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="poolFromEmail">From Email</Label>
                <Input 
                  id="poolFromEmail"
                  type="email"
                  value={poolFormState.fromEmail} 
                  onChange={(e) => setPoolFormState({ ...poolFormState, fromEmail: e.target.value })}
                  placeholder="sender@domain.com" 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="poolEncryption">Encryption</Label>
                <Select 
                  value={poolFormState.encryption} 
                  onValueChange={(val) => setPoolFormState({ ...poolFormState, encryption: val })}
                >
                  <SelectTrigger id="poolEncryption">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TLS">TLS</SelectItem>
                    <SelectItem value="SSL">SSL</SelectItem>
                    <SelectItem value="NONE">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/20">
                <Label htmlFor="poolRejectUnauth" className="text-xs cursor-pointer">Reject Unauthorized</Label>
                <Switch 
                  id="poolRejectUnauth"
                  checked={poolFormState.rejectUnauth} 
                  onCheckedChange={(checked) => setPoolFormState({ ...poolFormState, rejectUnauth: checked })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/20">
                <Label htmlFor="poolIsPrimary" className="text-xs cursor-pointer">Set as Primary</Label>
                <Switch 
                  id="poolIsPrimary"
                  checked={poolFormState.isPrimary} 
                  onCheckedChange={(checked) => setPoolFormState({ ...poolFormState, isPrimary: checked, isFallback: checked ? false : poolFormState.isFallback })}
                />
              </div>
              <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/20">
                <Label htmlFor="poolIsFallback" className="text-xs cursor-pointer">Set as Fallback</Label>
                <Switch 
                  id="poolIsFallback"
                  checked={poolFormState.isFallback} 
                  onCheckedChange={(checked) => setPoolFormState({ ...poolFormState, isFallback: checked, isPrimary: checked ? false : poolFormState.isPrimary })}
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2 font-bold">
              {editingPoolEntry ? "Save Changes" : "Add SMTP Server"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
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
