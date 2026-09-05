"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Cpu,
  Eye,
  EyeOff,
  FileSignature,
  Flame,
  FlaskConical,
  Globe,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  User,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PasswordErrors = Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>;

const PROVIDER_PRESETS = [
  { id: "gmail", name: "Gmail / Workspace", host: "smtp.gmail.com", port: 587, encryption: "TLS" },
  { id: "zeptomail", name: "ZeptoMail", host: "smtp.zeptomail.in", port: 587, encryption: "TLS" },
  { id: "sendgrid", name: "SendGrid", host: "smtp.sendgrid.net", port: 587, encryption: "TLS" },
  { id: "ses", name: "AWS SES", host: "email-smtp.us-east-1.amazonaws.com", port: 587, encryption: "TLS" },
  { id: "resend", name: "Resend", host: "smtp.resend.com", port: 587, encryption: "TLS" },
  { id: "custom", name: "Custom / Private", host: "", port: 587, encryption: "TLS" }
];

function getLatencyBadge(ms: number | undefined | null, success: boolean) {
  if (!success) {
    return {
      label: "Connection Failed",
      dot: "bg-rose-500",
      pill: "bg-rose-500/10 text-rose-500 border-rose-500/20"
    };
  }
  if (ms == null) {
    return {
      label: "Untested",
      dot: "bg-muted-foreground",
      pill: "bg-secondary text-muted-foreground border-border"
    };
  }
  if (ms < 500) {
    return {
      label: `${ms}ms · Optimal`,
      dot: "bg-emerald-500 animate-pulse",
      pill: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    };
  }
  if (ms < 2000) {
    return {
      label: `${ms}ms · Acceptable`,
      dot: "bg-amber-500",
      pill: "bg-amber-500/10 text-amber-500 border-amber-500/20"
    };
  }
  return {
    label: `${ms}ms · High Latency`,
    dot: "bg-rose-500",
    pill: "bg-rose-500/10 text-rose-500 border-rose-500/20"
  };
}

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
  const [activeTab, setActiveTab] = useState("smtp");

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
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");
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
      // detect preset
      const match = PROVIDER_PRESETS.find(p => p.host === editingPoolEntry.host);
      setSelectedPreset(match ? match.id : "custom");
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
        isPrimary: userPool.length === 0,
        isFallback: false
      });
      setSelectedPreset("custom");
    }
  }, [editingPoolEntry, poolDialogOpen, userPool.length]);

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = PROVIDER_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    if (preset.id === "custom") return;

    setPoolFormState((curr: any) => ({
      ...curr,
      host: preset.host,
      port: preset.port,
      encryption: preset.encryption,
      label: curr.label || preset.name
    }));
  };

  // PWA & Push Notification States
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  const primaryHealth = useMemo(() => health.filter((h) => h.smtpType === "primary" || !h.smtpType), [health]);
  const secondaryHealth = useMemo(() => health.filter((h) => h.smtpType === "secondary"), [health]);

  const primaryEntry = useMemo(() => userPool.find(e => e.isPrimary), [userPool]);
  const fallbackEntry = useMemo(() => userPool.find(e => e.isFallback), [userPool]);

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

      toast.success("Notifications enabled successfully");
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
      const data = await apiFetch<any>("/api/smtp/settings");
      setHealth(data.smtpHealthLog || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load SMTP pool");
    }
  }

  async function handleTestPool(id: string) {
    setTestingPoolId(id);
    try {
      const res = await apiFetch<any>(`/api/smtp/pool/${id}/test`, { method: "POST" });
      if (res.success) {
        toast.success(`Connected successfully (${res.latencyMs}ms latency)`);
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
    if (!confirm("Are you sure you want to remove this SMTP server from the pool?")) return;
    try {
      const res = await apiFetch<any>(`/api/smtp/pool/${id}`, { method: "DELETE" });
      if (res.success) {
        toast.success("SMTP server removed from pool");
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
      toast.success(`"${entry.label}" is now Primary SMTP`);
      await refreshUserPool();
    } catch (e: any) {
      toast.error(e.message || "Failed to set primary");
    }
  }

  async function handleSetPoolFallback(entry: any) {
    try {
      await apiFetch(`/api/smtp/pool/${entry.id}/set-fallback`, { method: "POST" });
      toast.success(`"${entry.label}" is now Fallback SMTP`);
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
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  function addExtraField() {
    if (!newKey.trim()) {
      toast.error("Variable name is required");
      return;
    }
    const sanitizedKey = newKey.trim().replace(/[^a-zA-Z0-9_]/g, "_");
    if (profile.extraFields?.[sanitizedKey]) {
      toast.error("Variable already exists");
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
    toast.success(`Added variable {{${sanitizedKey}}}`);
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

  const userInitials = profile?.name
    ? profile.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                <Cpu className="h-4 w-4" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Account & Infrastructure</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground font-semibold">
                v2.5 Cluster
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-xl">
              Configure your SMTP failover server pool, sender credentials, delivery security keys, and real-time push alerts.
            </p>
          </div>

          {/* Quick Status Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-card/80 text-xs">
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  primaryEntry ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                )}
              />
              <span className="font-semibold text-foreground text-[11px]">
                {primaryEntry ? `Primary: ${primaryEntry.label}` : "No Primary SMTP"}
              </span>
            </div>
          </div>
        </div>

        {/* Forced Password Reset Alert */}
        {profile.forcePasswordReset && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <div className="flex gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm">Action Required: Password Reset Enforced</h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  Your administrator has required a password update for this account. You will not be able to navigate to other pages or dispatch campaigns until your credentials are updated.
                </p>
                <div className="pt-2">
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="h-7 px-3 text-xs font-bold"
                    onClick={goToPassword}
                  >
                    Update Password Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs Control */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="h-10 bg-secondary/60 p-1 border border-border/60 rounded-xl gap-1">
              <TabsTrigger
                value="smtp"
                className="rounded-lg px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center gap-2"
              >
                <Server className="h-3.5 w-3.5 text-primary" />
                <span>SMTP Relay Pool</span>
                {userPool.length > 0 && (
                  <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-bold">
                    {userPool.length}
                  </span>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="profile"
                className="rounded-lg px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center gap-2"
              >
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Profile & Security</span>
              </TabsTrigger>

              <TabsTrigger
                value="app"
                className="rounded-lg px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center gap-2"
              >
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                <span>App & Alerts</span>
                {notificationsEnabled && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: SMTP POOL & TELEMETRY */}
          {/* ========================================================================= */}
          <TabsContent value="smtp" className="space-y-6 focus-visible:outline-none">
            {loading ? (
              <Card className="border-border/80 bg-card">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-96 mt-1" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </CardContent>
              </Card>
            ) : globalSmtpActive || profile.adminSmtpLocked ? (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    <Lock className="h-4 w-4 text-amber-500" /> Admin-Managed Outbound SMTP
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {globalSmtpActive 
                      ? "Global server override is active. All outbound mail is routed through the root administrator SMTP gateway." 
                      : "SMTP settings are locked by your administrator. Outbound emails dispatch using admin-provisioned cluster credentials."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    If you need dedicated sender domains or higher dispatch quotas, please contact your cluster administrator.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/80 bg-card shadow-xs overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 bg-muted/20 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Server className="h-3.5 w-3.5" />
                      </div>
                      <CardTitle className="text-base font-bold text-foreground">SMTP Relay Cluster</CardTitle>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Multi-server cluster configuration. Campaigns route via Primary and seamlessly auto-failover to Secondary upon socket latency or quota rejections.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => { setEditingPoolEntry(null); setPoolDialogOpen(true); }}
                    className="h-8.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Add SMTP Server
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {userPool.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-3">
                        <Server className="h-6 w-6" />
                      </div>
                      <h3 className="font-bold text-sm text-foreground">No SMTP Relay Configured</h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm leading-relaxed">
                        Connect your Gmail, ZeptoMail, SendGrid, or custom SMTP server to begin dispatching email campaigns with high deliverability.
                      </p>
                      <Button
                        onClick={() => { setEditingPoolEntry(null); setPoolDialogOpen(true); }}
                        className="mt-4 h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Your First Server
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto no-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border/60 hover:bg-transparent bg-secondary/30">
                            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 pl-5">Server & Host</TableHead>
                            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3">Sender Identity</TableHead>
                            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3">Cluster Role</TableHead>
                            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3">Health & Latency</TableHead>
                            <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3 text-right pr-5">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userPool.map((entry) => {
                            const badge = getLatencyBadge(entry.lastTestLatency, entry.lastTestSuccess ?? true);

                            return (
                              <TableRow key={entry.id} className="border-border/60 hover:bg-muted/30 transition-colors">
                                {/* Server Info */}
                                <TableCell className="py-3.5 pl-5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-foreground">{entry.label}</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border">
                                      {entry.encryption || "TLS"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-muted-foreground">
                                    <span>{entry.host}:{entry.port}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(`${entry.host}:${entry.port}`);
                                        toast.success("Host copied");
                                      }}
                                      className="text-muted-foreground/60 hover:text-foreground transition-colors"
                                      title="Copy Host"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </div>
                                </TableCell>

                                {/* Sender Identity */}
                                <TableCell className="py-3.5">
                                  <div className="text-xs font-medium text-foreground truncate max-w-[220px]">
                                    {entry.fromName ? (
                                      <span>
                                        <span className="font-semibold">{entry.fromName}</span>{" "}
                                        <span className="text-muted-foreground">&lt;{entry.fromEmail}&gt;</span>
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">&lt;{entry.fromEmail}&gt;</span>
                                    )}
                                  </div>
                                  <div className="text-[11px] font-mono text-muted-foreground/80 mt-0.5 truncate max-w-[220px]">
                                    user: {entry.username}
                                  </div>
                                </TableCell>

                                {/* Role */}
                                <TableCell className="py-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    {entry.isPrimary ? (
                                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold shadow-xs">
                                        <Zap className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                                        <span>Primary</span>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[11px] font-semibold border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                                        onClick={() => handleSetPoolPrimary(entry)}
                                      >
                                        Set Primary
                                      </Button>
                                    )}

                                    {entry.isFallback ? (
                                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-500 text-xs font-bold shadow-xs">
                                        <RefreshCw className="h-3 w-3 text-cyan-500" />
                                        <span>Fallback</span>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary"
                                        onClick={() => handleSetPoolFallback(entry)}
                                      >
                                        Set Fallback
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Health Status */}
                                <TableCell className="py-3.5 whitespace-nowrap">
                                  {testingPoolId === entry.id ? (
                                    <div className="inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      <span>Benchmarking...</span>
                                    </div>
                                  ) : entry.lastTestedAt ? (
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className={cn("h-2 w-2 rounded-full shrink-0", badge.dot)} />
                                        <span className="text-xs font-semibold text-foreground">
                                          {entry.lastTestSuccess ? `${entry.lastTestLatency}ms` : "Failed"}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-muted-foreground">
                                        {formatHealthTime(entry.lastTestedAt)}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/70 italic">Untested</span>
                                  )}
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="py-3.5 text-right pr-5 whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2.5 text-xs gap-1 border-border bg-card hover:bg-secondary font-medium"
                                          onClick={() => handleTestPool(entry.id)}
                                          disabled={testingPoolId !== null}
                                        >
                                          <FlaskConical className="h-3.5 w-3.5 text-primary" />
                                          <span>Test</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs font-semibold">
                                        Test SMTP Socket & Latency
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                          onClick={() => { setEditingPoolEntry(entry); setPoolDialogOpen(true); }}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs font-semibold">
                                        Edit Configuration
                                      </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                          onClick={() => handleDeletePool(entry.id)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs font-semibold">
                                        Remove Server
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Diagnostic Telemetry Feed (Side-by-Side) */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Primary SMTP Telemetry */}
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Primary Relay Telemetry</CardTitle>
                      <CardDescription className="text-[11px]">
                        {primaryEntry ? `Active: ${primaryEntry.label}` : "Socket health & handshake latency log"}
                      </CardDescription>
                    </div>
                  </div>
                  {primaryEntry && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                      onClick={() => handleTestPool(primaryEntry.id)}
                      disabled={testingPoolId !== null}
                    >
                      <RefreshCw className={cn("h-3 w-3 mr-1", testingPoolId === primaryEntry.id && "animate-spin")} />
                      Test Now
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="pt-4">
                  {healthLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  ) : primaryHealth.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground mb-2">
                        <Activity className="h-5 w-5 opacity-60" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">No Diagnostics Logged</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                        Run a connection test on your primary SMTP server to record TLS latency and handshake telemetry.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
                      {[...primaryHealth].reverse().slice(0, 10).map((item, index) => {
                        const isOk = item.success;
                        return (
                          <div
                            key={index}
                            className={cn(
                              "flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors",
                              isOk ? "border-border/80 bg-card hover:bg-secondary/40" : "border-destructive/30 bg-destructive/5"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={cn("h-2 w-2 rounded-full shrink-0", isOk ? "bg-emerald-500" : "bg-rose-500")} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">
                                    {isOk ? "Handshake Connected" : "Connection Failed"}
                                  </span>
                                  {isOk && (
                                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border">
                                      {item.latencyMs}ms
                                    </span>
                                  )}
                                </div>
                                {!isOk && item.error && (
                                  <p className="text-[10px] text-destructive truncate max-w-xs mt-0.5">
                                    {item.error}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                              {formatHealthTime(item.testedAt)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Fallback SMTP Telemetry */}
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-500">
                      <Radio className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Fallback Relay Telemetry</CardTitle>
                      <CardDescription className="text-[11px]">
                        {fallbackEntry ? `Backup: ${fallbackEntry.label}` : "Automatic failover circuit health"}
                      </CardDescription>
                    </div>
                  </div>
                  {fallbackEntry && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                      onClick={() => handleTestPool(fallbackEntry.id)}
                      disabled={testingPoolId !== null}
                    >
                      <RefreshCw className={cn("h-3 w-3 mr-1", testingPoolId === fallbackEntry.id && "animate-spin")} />
                      Test Now
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="pt-4">
                  {healthLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full rounded-lg" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  ) : secondaryHealth.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground mb-2">
                        <Radio className="h-5 w-5 opacity-60" />
                      </div>
                      <p className="text-xs font-semibold text-foreground">No Fallback Tests Recorded</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs leading-relaxed">
                        {fallbackEntry 
                          ? "Run a diagnostic test to verify that the fallback circuit responds if primary fails." 
                          : "Assign a secondary SMTP relay to enable automatic zero-downtime failover."}
                      </p>
                      {fallbackEntry && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 h-7 text-xs border-border bg-card hover:bg-secondary font-medium"
                          onClick={() => handleTestPool(fallbackEntry.id)}
                          disabled={testingPoolId !== null}
                        >
                          <FlaskConical className="h-3.5 w-3.5 mr-1 text-cyan-500" />
                          Run Backup Test
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1 no-scrollbar">
                      {[...secondaryHealth].reverse().slice(0, 10).map((item, index) => {
                        const isOk = item.success;
                        return (
                          <div
                            key={index}
                            className={cn(
                              "flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors",
                              isOk ? "border-border/80 bg-card hover:bg-secondary/40" : "border-destructive/30 bg-destructive/5"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={cn("h-2 w-2 rounded-full shrink-0", isOk ? "bg-cyan-500" : "bg-rose-500")} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">
                                    {isOk ? "Backup Connected" : "Connection Failed"}
                                  </span>
                                  {isOk && (
                                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border">
                                      {item.latencyMs}ms
                                    </span>
                                  )}
                                </div>
                                {!isOk && item.error && (
                                  <p className="text-[10px] text-destructive truncate max-w-xs mt-0.5">
                                    {item.error}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                              {formatHealthTime(item.testedAt)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 2: PROFILE & SECURITY */}
          {/* ========================================================================= */}
          <TabsContent value="profile" className="space-y-6 focus-visible:outline-none">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Profile Card */}
              {loadingProfile ? (
                <Card className="border-border/80 bg-card">
                  <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/80 bg-card shadow-xs">
                  <CardHeader className="border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30 font-extrabold text-sm shadow-xs">
                        {userInitials}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">Profile & Details</CardTitle>
                        <CardDescription className="text-xs">
                          Your sender identity and custom template variables.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-5">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Full Name</Label>
                        <Input
                          value={profile.name || ""}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          placeholder="Jane Doe"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Email Address</Label>
                        <Input
                          type="email"
                          value={profile.email || ""}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          placeholder="jane@company.com"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Phone Number</Label>
                        <Input
                          type="tel"
                          value={profile.phone || ""}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          placeholder="+1 (555) 000-0000"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    {/* Extra Custom Fields */}
                    <div className="space-y-3 pt-3 border-t border-border/60">
                      <div>
                        <Label className="text-xs font-bold text-foreground">Custom Template Variables</Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Account variables usable in campaign bodies as <code className="font-mono text-[10px] bg-secondary px-1 py-0.5 rounded">{"{{key}}"}</code>
                        </p>
                      </div>

                      {/* Existing fields */}
                      {Object.keys(profile.extraFields || {}).length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                          {Object.entries(profile.extraFields || {}).map(([key, val]) => (
                            <div key={key} className="flex gap-2 items-center">
                              <div className="w-1/3 truncate font-mono text-xs bg-secondary/70 px-2.5 py-1.5 rounded-lg border border-border text-foreground font-semibold">
                                {"{{" + key + "}}"}
                              </div>
                              <Input 
                                className="flex-1 h-8 text-xs" 
                                value={String(val)} 
                                onChange={(e) => setExtraFieldValue(key, e.target.value)} 
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeExtraField(key)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add new field row */}
                      <div className="flex gap-2 items-center pt-1">
                        <Input 
                          placeholder="Variable name (e.g. company)" 
                          value={newKey} 
                          onChange={(e) => setNewKey(e.target.value)} 
                          className="w-1/3 h-8.5 text-xs font-mono"
                        />
                        <Input 
                          placeholder="Value" 
                          value={newValue} 
                          onChange={(e) => setNewValue(e.target.value)} 
                          className="flex-1 h-8.5 text-xs"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={addExtraField}
                          className="h-8.5 w-8.5 border-border hover:bg-secondary shrink-0"
                          title="Add Variable"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Default Email Signature */}
                    <div className="space-y-3 pt-3 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <FileSignature className="h-3.5 w-3.5 text-primary" />
                            Default Email Signature
                          </Label>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            HTML or text signature appended when composing new emails
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor="sig-toggle" className="text-[11px] text-muted-foreground cursor-pointer">
                            Auto-insert
                          </Label>
                          <Switch
                            id="sig-toggle"
                            checked={Boolean(profile.extraFields?.signatureEnabled)}
                            onCheckedChange={(checked) => {
                              setProfile((current: any) => ({
                                ...current,
                                extraFields: {
                                  ...(current.extraFields || {}),
                                  signatureEnabled: checked
                                }
                              }));
                            }}
                          />
                        </div>
                      </div>

                      <Textarea
                        placeholder="<p>Best regards,<br/><strong>Your Name</strong><br/>Your Title | Company</p>"
                        value={String(profile.extraFields?.emailSignature || "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProfile((current: any) => ({
                            ...current,
                            extraFields: {
                              ...(current.extraFields || {}),
                              emailSignature: val
                            }
                          }));
                        }}
                        className="min-h-24 text-xs font-mono resize-y"
                      />
                      {profile.extraFields?.emailSignature && (
                        <div className="rounded-md border bg-muted/20 p-2.5 text-xs">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">
                            Signature Preview:
                          </span>
                          <div
                            className="text-xs leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: String(profile.extraFields.emailSignature) }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={saveProfile}
                        disabled={savingProfile}
                        className="h-8.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            Saving Changes...
                          </>
                        ) : (
                          "Save Profile"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Password & Security Card */}
              <Card id="change-password-card" className="border-border/80 bg-card shadow-xs">
                <CardHeader className="border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">Password & Credentials</CardTitle>
                      <CardDescription className="text-xs">
                        Update your master account login credentials.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <PasswordField
                    label="Current Password"
                    value={passwords.currentPassword}
                    visible={visible.currentPassword}
                    error={passwordErrors.currentPassword}
                    onToggle={() => setVisible((c) => ({ ...c, currentPassword: !c.currentPassword }))}
                    onChange={(val) => setPasswords((c) => ({ ...c, currentPassword: val }))}
                  />

                  <div className="space-y-2">
                    <PasswordField
                      label="New Password"
                      value={passwords.newPassword}
                      visible={visible.newPassword}
                      error={passwordErrors.newPassword}
                      onToggle={() => setVisible((c) => ({ ...c, newPassword: !c.newPassword }))}
                      onChange={(val) => setPasswords((c) => ({ ...c, newPassword: val }))}
                    />
                    <div className="space-y-1.5 pt-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full transition-all duration-300" style={{ width: strength.width, backgroundColor: strength.barColor }} />
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Strength rating:</span>
                        <span className="font-semibold" style={{ color: strength.textColor }}>{strength.label}</span>
                      </div>
                    </div>
                  </div>

                  <PasswordField
                    label="Confirm New Password"
                    value={passwords.confirmPassword}
                    visible={visible.confirmPassword}
                    error={passwordErrors.confirmPassword}
                    onToggle={() => setVisible((c) => ({ ...c, confirmPassword: !c.confirmPassword }))}
                    onChange={(val) => setPasswords((c) => ({ ...c, confirmPassword: val }))}
                  />

                  <div className="flex justify-end pt-3">
                    <Button
                      onClick={updatePassword}
                      disabled={changingPassword}
                      className="h-8.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          Updating Password...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 3: APP & NOTIFICATIONS */}
          {/* ========================================================================= */}
          <TabsContent value="app" className="space-y-6 focus-visible:outline-none">
            <div className="grid gap-6 md:grid-cols-2">
              {/* PWA Mobile Application */}
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">Progressive Web App</CardTitle>
                      <CardDescription className="text-xs">
                        Install Postly on your Mac, Windows, iOS, or Android device for native offline performance.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="flex items-center justify-between rounded-xl bg-secondary/40 border border-border/80 p-4">
                    <div>
                      <div className="text-xs font-bold text-foreground uppercase tracking-wider">Installation Status</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {isInstalled ? (
                          <span className="text-emerald-500 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Active PWA Client
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Running in browser window</span>
                        )}
                      </div>
                    </div>
                    {!isInstalled && (
                      <Button
                        onClick={() => window.dispatchEvent(new Event("trigger-pwa-install"))}
                        className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                      >
                        Install App
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Push Notifications Card */}
              <Card className="border-border/80 bg-card shadow-xs">
                <CardHeader className="border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground">Push Notifications & Telemetry Alerts</CardTitle>
                      <CardDescription className="text-xs">
                        Real-time notifications on campaign dispatches, socket failures, and scheduled sends.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="flex items-center justify-between rounded-xl bg-secondary/40 border border-border/80 p-4">
                    <div>
                      <div className="text-xs font-bold text-foreground uppercase tracking-wider">Web Push Service</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {notificationsEnabled ? (
                          <span className="text-emerald-500 font-semibold flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Notifications Active
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Notifications disabled on this browser</span>
                        )}
                      </div>
                    </div>
                    {!notificationsEnabled && (
                      <Button
                        onClick={enableNotifications}
                        disabled={subscribing}
                        className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                      >
                        {subscribing ? "Enabling..." : "Enable Push Alerts"}
                      </Button>
                    )}
                  </div>

                  {notificationsEnabled && (
                    <div className="space-y-4 pt-2 border-t border-border/60">
                      <div className="space-y-2">
                        <Label className="text-foreground font-semibold text-xs uppercase tracking-wider">
                          Active Triggers:
                        </Label>
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>Campaign Dispatched</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>Scheduled Job Trigger</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>Bulk Queue Completed</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span>SMTP Quarantine / Error</span>
                          </div>
                        </div>
                      </div>

                      {/* Registered Devices */}
                      <div className="space-y-2.5 pt-2 border-t border-border/60">
                        <div className="flex items-center justify-between">
                          <Label className="text-foreground font-semibold text-xs uppercase tracking-wider">
                            Active Registered Devices ({subscriptions.length})
                          </Label>
                        </div>
                        {loadingSubscriptions ? (
                          <div className="space-y-2">
                            <Skeleton className="h-9 w-full rounded-md" />
                          </div>
                        ) : subscriptions.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No active devices registered.</p>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                            {subscriptions.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between rounded-lg bg-secondary/30 border border-border/70 p-2.5 text-xs"
                              >
                                <div className="min-w-0 flex-1 mr-3">
                                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                                    <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{sub.deviceName || sub.platform || "Device"}</span>
                                    {sub.platform && (
                                      <span className="px-1.5 py-0.2 rounded bg-secondary text-[10px] text-muted-foreground border border-border">
                                        {sub.platform}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                    Added: {new Date(sub.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDevice(sub.endpoint)}
                                  className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-border/60 flex justify-end">
                        <Button
                          onClick={sendTestNotification}
                          disabled={testingPush}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-border bg-card hover:bg-secondary font-medium"
                        >
                          <Bell className="h-3.5 w-3.5 mr-1.5 text-primary" />
                          {testingPush ? "Dispatching..." : "Send Test Notification"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* ========================================================================= */}
        {/* ADD / EDIT SMTP SERVER MODAL */}
        {/* ========================================================================= */}
        <Dialog open={poolDialogOpen} onOpenChange={setPoolDialogOpen}>
          <DialogContent className="sm:max-w-xl bg-card border-border/80 shadow-lg">
            <DialogHeader className="border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Server className="h-4 w-4" />
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {editingPoolEntry ? "Edit SMTP Relay Server" : "Add SMTP Relay to Cluster"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure your host parameters, authentication keys, and cluster routing options.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSavePoolEntry} className="space-y-4 pt-1">
              {/* Provider Quick-Fill Presets */}
              {!editingPoolEntry && (
                <div className="space-y-2 bg-secondary/30 p-3 rounded-xl border border-border/60">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-primary" /> Quick Provider Presets:
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PROVIDER_PRESETS.map((preset) => {
                      const active = selectedPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset.id)}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-lg font-medium border transition-all",
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-card text-muted-foreground hover:text-foreground border-border hover:bg-secondary"
                          )}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Host & Port */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="poolLabel" className="text-xs font-semibold">Server Label</Label>
                  <Input 
                    id="poolLabel"
                    value={poolFormState.label} 
                    onChange={(e) => setPoolFormState({ ...poolFormState, label: e.target.value })}
                    placeholder="e.g. ZeptoMail Production" 
                    required 
                    className="h-8.5 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="poolPort" className="text-xs font-semibold">Port</Label>
                  <Input 
                    id="poolPort"
                    type="number" 
                    value={poolFormState.port} 
                    onChange={(e) => setPoolFormState({ ...poolFormState, port: Number(e.target.value) })}
                    required 
                    className="h-8.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="poolHost" className="text-xs font-semibold">SMTP Host</Label>
                  <Input 
                    id="poolHost"
                    value={poolFormState.host} 
                    onChange={(e) => setPoolFormState({ ...poolFormState, host: e.target.value })}
                    placeholder="smtp.domain.com" 
                    required 
                    className="h-8.5 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="poolEncryption" className="text-xs font-semibold">Encryption</Label>
                  <Select 
                    value={poolFormState.encryption} 
                    onValueChange={(val) => setPoolFormState({ ...poolFormState, encryption: val })}
                  >
                    <SelectTrigger id="poolEncryption" className="h-8.5 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TLS">TLS (STARTTLS)</SelectItem>
                      <SelectItem value="SSL">SSL (Direct)</SelectItem>
                      <SelectItem value="NONE">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="poolUsername" className="text-xs font-semibold">Username / API Key</Label>
                  <Input 
                    id="poolUsername"
                    value={poolFormState.username} 
                    onChange={(e) => setPoolFormState({ ...poolFormState, username: e.target.value })}
                    placeholder="emailapikey or user@domain.com" 
                    required 
                    className="h-8.5 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="poolPassword" className="text-xs font-semibold">Password / Secret</Label>
                  <div className="relative">
                    <Input 
                      id="poolPassword"
                      type={showPassword ? "text" : "password"} 
                      value={poolFormState.password} 
                      onChange={(e) => setPoolFormState({ ...poolFormState, password: e.target.value })}
                      placeholder={editingPoolEntry ? "Leave empty to retain saved" : "Password or token"} 
                      required={!editingPoolEntry} 
                      className="pr-9 h-8.5 text-xs"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-8.5 w-8.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sender Name & Email */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="poolFromName" className="text-xs font-semibold">From Name</Label>
                  <Input 
                    id="poolFromName"
                    value={poolFormState.fromName} 
                    onChange={(e) => setPoolFormState({ ...poolFormState, fromName: e.target.value })}
                    placeholder="Acme Notifications" 
                    required 
                    className="h-8.5 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="poolFromEmail" className="text-xs font-semibold">From Email Address</Label>
                  <Input 
                    id="poolFromEmail"
                    type="email"
                    value={poolFormState.fromEmail} 
                    onChange={(e) => setPoolFormState({ ...poolFormState, fromEmail: e.target.value })}
                    placeholder="dispatch@acme.com" 
                    required 
                    className="h-8.5 text-xs"
                  />
                </div>
              </div>

              {/* Switches */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between border border-border/80 rounded-lg px-3 py-2 bg-secondary/30">
                  <Label htmlFor="poolIsPrimary" className="text-xs font-semibold cursor-pointer">Make Primary</Label>
                  <Switch 
                    id="poolIsPrimary"
                    checked={poolFormState.isPrimary} 
                    onCheckedChange={(checked) => setPoolFormState({ ...poolFormState, isPrimary: checked, isFallback: checked ? false : poolFormState.isFallback })}
                  />
                </div>

                <div className="flex items-center justify-between border border-border/80 rounded-lg px-3 py-2 bg-secondary/30">
                  <Label htmlFor="poolIsFallback" className="text-xs font-semibold cursor-pointer">Make Fallback</Label>
                  <Switch 
                    id="poolIsFallback"
                    checked={poolFormState.isFallback} 
                    onCheckedChange={(checked) => setPoolFormState({ ...poolFormState, isFallback: checked, isPrimary: checked ? false : poolFormState.isPrimary })}
                  />
                </div>

                <div className="flex items-center justify-between border border-border/80 rounded-lg px-3 py-2 bg-secondary/30">
                  <Label htmlFor="poolRejectUnauth" className="text-xs font-semibold cursor-pointer">Strict TLS</Label>
                  <Switch 
                    id="poolRejectUnauth"
                    checked={poolFormState.rejectUnauth} 
                    onCheckedChange={(checked) => setPoolFormState({ ...poolFormState, rejectUnauth: checked })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPoolDialogOpen(false)}
                  className="h-8.5 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                >
                  {editingPoolEntry ? "Save Server Changes" : "Save to Cluster"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Reset Alert Dialog */}
        <Dialog open={showResetAlert} onOpenChange={setShowResetAlert}>
          <DialogContent className="sm:max-w-md border-destructive/30 bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive font-bold text-base">
                <AlertTriangle className="h-5 w-5" /> Password Reset Required
              </DialogTitle>
              <DialogDescription className="pt-2 text-xs leading-relaxed text-muted-foreground">
                Your cluster administrator has required a security password update for your account. Until you set a new password, campaign dispatches and routing features are suspended.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex sm:justify-end gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="font-bold text-xs"
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
      </div>
    </TooltipProvider>
  );
}

function PasswordField({
  label,
  value,
  visible,
  error,
  onToggle,
  onChange
}: {
  label: string;
  value: string;
  visible?: boolean;
  error?: string;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-9 h-8.5 text-xs"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-8.5 w-8.5 text-muted-foreground hover:text-foreground"
          onClick={onToggle}
        >
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}
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
  if (isNaN(date.getTime())) return "Recently";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  const relative =
    minutes < 1
      ? "just now"
      : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
      ? `${Math.round(minutes / 60)}h ago`
      : `${Math.round(minutes / 1440)}d ago`;
  return `${relative} · ${date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}
