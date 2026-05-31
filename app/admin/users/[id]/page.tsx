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
                <p className="text-sm">
                  <span className="font-semibold">Fallback:</span>{" "}
                  <Badge variant={user.smtpFallbackEnabled ? "sent" : "outline"}>
                    {user.smtpFallbackEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </p>
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
