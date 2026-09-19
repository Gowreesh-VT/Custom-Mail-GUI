"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/client-api";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Loader2, Lock, Plus, Unlock } from "lucide-react";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [emailPage, setEmailPage] = useState(1);

  useEffect(() => {
    setEmailPage(1);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    apiFetch<any>(`/api/admin/users/${id}?emailPage=${emailPage}`).then(setData);
  }, [id, emailPage]);

  const user = data?.user;
  const emails = data?.emails || [];
  const emailsTotal = data?.emailsTotal || 0;
  const emailPageSize = data?.emailPageSize || 25;
  const totalEmailPages = Math.max(1, Math.ceil(emailsTotal / emailPageSize));
  const currentEmailPage = data?.emailPage || emailPage;
  const sentMonth = data?.sentThisMonth ?? 0;
  const failedTotal = data?.failedTotal ?? 0;

  if (!user) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{user.name}</h2>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground mt-1">
            <span>{user.email}</span>
            <Badge>{user.role}</Badge>
            <Badge variant={user.isActive === false ? "failed" : "sent"}>
              {user.isActive === false ? "Deactivated" : "Active"}
            </Badge>
          </div>
        </div>
        <EditUserDialog
          user={user}
          onUpdate={(updatedUser) => setData((prev: any) => ({ ...prev, user: updatedUser }))}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sent">Sent Emails</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="smtp">SMTP Pool & Lock</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sent This Month</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{sentMonth}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Failed Total</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{failedTotal}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Scheduled Pending</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{data.scheduledPending}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Daily Limit</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{user.dailyLimit || "Unlimited"}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Limit</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{user.monthlyLimit || "Unlimited"}</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">SMTP Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  <span className="font-semibold">Host:</span> {user.smtpHost || "Not configured"}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Status:</span>
                  {user.smtpHealthLog && user.smtpHealthLog[0] ? (
                    <Badge variant={user.smtpHealthLog[0].success ? "sent" : "failed"}>
                      {user.smtpHealthLog[0].success ? "Connected" : "Failed"}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Untested</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Fallback SMTP</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="font-semibold">Fallback:</span>{" "}
                  <Badge variant={user.smtpFallbackEnabled ? "sent" : "outline"}>
                    {user.smtpFallbackEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                {user.smtpFallbackEnabled && (
                  <>
                    <p className="text-sm">
                      <span className="font-semibold">Secondary Host:</span> {user.smtpSecondaryHost || "Not configured"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Last fallback event:</span>{" "}
                      {user.smtpFallbackLogs && user.smtpFallbackLogs[0] ? (
                        `${new Date(user.smtpFallbackLogs[0].createdAt).toLocaleString()} (${user.smtpFallbackLogs[0].fallbackSuccess ? "Success" : "Failed"})`
                      ) : (
                        "Never triggered"
                      )}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="sent">
          <SimpleTable
            rows={emails}
            columns={["Date", "To", "Subject", "Status"]}
            render={(e) => [new Date(e.sentAt).toLocaleString(), e.to?.join(", "), e.subject, e.status]}
            footer={
              totalEmailPages > 1 ? (
                <Pagination
                  currentPage={currentEmailPage}
                  totalPages={totalEmailPages}
                  onPageChange={setEmailPage}
                />
              ) : null
            }
          />
        </TabsContent>
        <TabsContent value="templates">
          <SimpleTable
            rows={data.templates || []}
            columns={["Name", "Fields", "Created"]}
            render={(t) => [t.name, t.mergeFields?.length, new Date(t.createdAt).toLocaleString()]}
          />
        </TabsContent>
        <TabsContent value="smtp">
          <AdminSmtpPoolTab 
            userId={id} 
            initialLocked={Boolean(user.adminSmtpLocked)} 
            initialPool={user.smtpPool || []} 
          />
        </TabsContent>
        <TabsContent value="audit">
          <SimpleTable
            rows={data.audits || []}
            columns={["Time", "Action", "User", "Target"]}
            render={(a) => [new Date(a.createdAt).toLocaleString(), a.action, a.userName, a.targetName]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditUserDialog({ user, onUpdate }: { user: any; onUpdate: (user: any) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(event.currentTarget);
      const res = await apiFetch<any>(`/api/admin/users/${user._id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          role: formData.get("role"),
          dailyLimit: Number(formData.get("dailyLimit")),
          monthlyLimit: Number(formData.get("monthlyLimit"))
        })
      });
      toast.success("User details and limits updated successfully");
      onUpdate(res.user);
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Edit User & Limits</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User & Limits</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" defaultValue={user.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={user.email} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" defaultValue={user.role}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Daily Limit</Label>
              <Input id="dailyLimit" name="dailyLimit" type="number" defaultValue={user.dailyLimit} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthlyLimit">Monthly Limit</Label>
              <Input id="monthlyLimit" name="monthlyLimit" type="number" defaultValue={user.monthlyLimit} required />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving Changes..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SimpleTable({ rows, columns, render, footer }: { rows: any[]; columns: string[]; render: (row: any) => React.ReactNode[]; footer?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row._id}>
                {render(row).map((cell, i) => (
                  <TableCell key={i}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
        Prev
      </Button>
      <div className="flex flex-wrap gap-2">
        {pages.map((page) => (
          <Button
            key={page}
            size="sm"
            variant={page === currentPage ? "default" : "outline"}
            onClick={() => onPageChange(page)}
            className="min-w-10"
          >
            {page}
          </Button>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
        Next
      </Button>
    </div>
  );
}

function AdminSmtpPoolTab({ userId, initialLocked, initialPool }: { userId: string; initialLocked: boolean; initialPool: any[] }) {
  const [locked, setLocked] = useState(initialLocked);
  const [pool, setPool] = useState<any[]>(initialPool);
  const [loadingLock, setLoadingLock] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [formState, setFormState] = useState<any>({
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
    if (editingEntry) {
      setFormState({
        label: editingEntry.label || "",
        host: editingEntry.host || "",
        port: editingEntry.port || 587,
        username: editingEntry.username || "",
        password: "",
        fromName: editingEntry.fromName || "",
        fromEmail: editingEntry.fromEmail || "",
        encryption: editingEntry.encryption || "TLS",
        rejectUnauth: editingEntry.rejectUnauth !== false,
        isPrimary: Boolean(editingEntry.isPrimary),
        isFallback: Boolean(editingEntry.isFallback)
      });
    } else {
      setFormState({
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
  }, [editingEntry, dialogOpen]);

  async function refreshPool() {
    try {
      const data = await apiFetch<any>(`/api/admin/users/${userId}/smtp-pool`);
      if (data.success) {
        setPool(data.entries || []);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load SMTP pool");
    }
  }

  async function handleToggleLock() {
    setLoadingLock(true);
    try {
      const endpoint = locked ? `/api/admin/users/${userId}/unlock-smtp` : `/api/admin/users/${userId}/lock-smtp`;
      const res = await apiFetch<any>(endpoint, { method: "POST", body: "{}" });
      if (res.success) {
        setLocked(!locked);
        toast.success(locked ? "SMTP settings unlocked for user" : "SMTP settings locked to admin credentials");
      }
    } catch (e: any) {
      toast.error(e.message || "Operation failed");
    } finally {
      setLoadingLock(false);
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      const res = await apiFetch<any>(`/api/admin/users/${userId}/smtp-pool/${id}/test`, { method: "POST" });
      if (res.success) {
        toast.success(`Connected successfully in ${res.latencyMs}ms`);
      } else {
        toast.error(res.error || "Connection test failed");
      }
      await refreshPool();
    } catch (e: any) {
      toast.error(e.message || "Connection test failed");
      await refreshPool();
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this SMTP server?")) return;
    try {
      const res = await apiFetch<any>(`/api/admin/users/${userId}/smtp-pool/${id}`, { method: "DELETE" });
      if (res.success) {
        toast.success("SMTP server removed");
        if (res.warning) toast.warning(res.warning);
        await refreshPool();
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to delete SMTP server");
    }
  }

  async function handleTogglePrimary(entry: any) {
    try {
      await apiFetch(`/api/admin/users/${userId}/smtp-pool/${entry.id}`, {
        method: "PUT",
        body: JSON.stringify({ isPrimary: !entry.isPrimary, isFallback: false })
      });
      toast.success(entry.isPrimary ? "Primary role removed" : "Set as primary SMTP");
      await refreshPool();
    } catch (e: any) {
      toast.error(e.message || "Failed to update role");
    }
  }

  async function handleToggleFallback(entry: any) {
    try {
      await apiFetch(`/api/admin/users/${userId}/smtp-pool/${entry.id}`, {
        method: "PUT",
        body: JSON.stringify({ isFallback: !entry.isFallback, isPrimary: false })
      });
      toast.success(entry.isFallback ? "Fallback role removed" : "Set as fallback SMTP");
      await refreshPool();
    } catch (e: any) {
      toast.error(e.message || "Failed to update role");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload: any = { ...formState };
      if (editingEntry && !payload.password) {
        delete payload.password;
      }
      
      const endpoint = editingEntry 
        ? `/api/admin/users/${userId}/smtp-pool/${editingEntry.id}`
        : `/api/admin/users/${userId}/smtp-pool`;
      
      const method = editingEntry ? "PUT" : "POST";
      const res = await apiFetch<any>(endpoint, { method, body: JSON.stringify(payload) });
      if (res.success) {
        toast.success(editingEntry ? "SMTP server updated" : "SMTP server added to pool");
        setDialogOpen(false);
        setEditingEntry(null);
        await refreshPool();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save SMTP settings");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                {locked ? <Lock className="h-5 w-5 text-failed" /> : <Unlock className="h-5 w-5 text-sent" />}
                SMTP Override & Restriction
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Prevent this user from configuring their own SMTP. When locked, all outgoing emails are forced to use the admin-assigned credentials below.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
              <Badge variant={locked ? "failed" : "sent"}>
                {locked ? "Locked to Admin SMTP" : "Unlocked (User Custom SMTP Allowed)"}
              </Badge>
              <Button 
                variant={locked ? "outline" : "destructive"} 
                disabled={loadingLock}
                onClick={handleToggleLock}
              >
                {loadingLock ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : locked ? (
                  "Unlock Settings"
                ) : (
                  "Lock to Admin"
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Admin-Assigned SMTP Pool</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Add and manage SMTP servers assigned to this user. You must designate one as primary before locking.
            </p>
          </div>
          <Button onClick={() => { setEditingEntry(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add SMTP Server
          </Button>
        </CardHeader>
        <CardContent>
          {pool.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg bg-muted/20 text-muted-foreground">
              <span className="text-2xl mb-2">📬</span>
              <p className="font-medium text-sm">No SMTP servers assigned yet</p>
              <p className="text-xs">Add at least one server to configure primary sending.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
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
                  {pool.map((entry) => (
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
                          onClick={() => handleTogglePrimary(entry)}
                        >
                          {entry.isPrimary ? "★ Primary" : "Set Primary"}
                        </Button>
                        <Button
                          size="sm"
                          variant={entry.isFallback ? "secondary" : "outline"}
                          className="h-7 px-2 text-[10px] uppercase font-bold"
                          onClick={() => handleToggleFallback(entry)}
                        >
                          {entry.isFallback ? "🔄 Fallback" : "Set Fallback"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {testingId === entry.id ? (
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
                        <Button size="sm" variant="outline" className="h-7 px-2.5" onClick={() => handleTest(entry.id)} disabled={testingId !== null}>
                          Test
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2.5" onClick={() => { setEditingEntry(entry); setDialogOpen(true); }}>
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 px-2.5" onClick={() => handleDelete(entry.id)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit SMTP Server" : "Add SMTP Server"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="label">Label</Label>
              <Input 
                id="label"
                value={formState.label} 
                onChange={(e) => setFormState({ ...formState, label: e.target.value })}
                placeholder="e.g. Sendgrid Main" 
                required 
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="host">Host</Label>
                <Input 
                  id="host"
                  value={formState.host} 
                  onChange={(e) => setFormState({ ...formState, host: e.target.value })}
                  placeholder="smtp.domain.com" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="port">Port</Label>
                <Input 
                  id="port"
                  type="number" 
                  value={formState.port} 
                  onChange={(e) => setFormState({ ...formState, port: Number(e.target.value) })}
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username"
                  value={formState.username} 
                  onChange={(e) => setFormState({ ...formState, username: e.target.value })}
                  placeholder="API Key or User" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password"
                    type={showPassword ? "text" : "password"} 
                    value={formState.password} 
                    onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                    placeholder={editingEntry ? "Leave empty to keep saved" : "Password"} 
                    required={!editingEntry} 
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
                <Label htmlFor="fromName">From Name</Label>
                <Input 
                  id="fromName"
                  value={formState.fromName} 
                  onChange={(e) => setFormState({ ...formState, fromName: e.target.value })}
                  placeholder="Sender Name" 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input 
                  id="fromEmail"
                  type="email"
                  value={formState.fromEmail} 
                  onChange={(e) => setFormState({ ...formState, fromEmail: e.target.value })}
                  placeholder="sender@domain.com" 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="encryption">Encryption</Label>
                <Select 
                  value={formState.encryption} 
                  onValueChange={(val) => setFormState({ ...formState, encryption: val })}
                >
                  <SelectTrigger id="encryption">
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
                <Label htmlFor="rejectUnauth" className="text-xs cursor-pointer">Reject Unauthorized</Label>
                <Switch 
                  id="rejectUnauth"
                  checked={formState.rejectUnauth} 
                  onCheckedChange={(checked) => setFormState({ ...formState, rejectUnauth: checked })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/20">
                <Label htmlFor="isPrimary" className="text-xs cursor-pointer">Set as Primary</Label>
                <Switch 
                  id="isPrimary"
                  checked={formState.isPrimary} 
                  onCheckedChange={(checked) => setFormState({ ...formState, isPrimary: checked, isFallback: checked ? false : formState.isFallback })}
                />
              </div>
              <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/20">
                <Label htmlFor="isFallback" className="text-xs cursor-pointer">Set as Fallback</Label>
                <Switch 
                  id="isFallback"
                  checked={formState.isFallback} 
                  onCheckedChange={(checked) => setFormState({ ...formState, isFallback: checked, isPrimary: checked ? false : formState.isPrimary })}
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2 font-bold">
              {editingEntry ? "Save Changes" : "Add SMTP Server"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
