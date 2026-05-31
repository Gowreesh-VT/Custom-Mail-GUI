"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BellRing, CalendarClock, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";

type AnnouncementRow = {
  _id: string;
  message: string;
  type: "info" | "warning" | "critical";
  isActive: boolean;
  expiresAt?: string | null;
  createdAt?: string;
};

const typeBadgeVariant: Record<string, "scheduled" | "warning" | "failed"> = {
  info: "scheduled",
  warning: "warning",
  critical: "failed"
};

const typeCardStyles: Record<string, string> = {
  info: "border-scheduled/30 bg-scheduled/5",
  warning: "border-warning/30 bg-warning/5",
  critical: "border-failed/30 bg-failed/5"
};

function formatDate(value?: string | null) {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No expiry";
  return date.toLocaleString();
}

export default function AdminAnnouncementsPage() {
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  async function load() {
    setRows((await apiFetch<any>("/api/admin/announcements")).announcements);
  }

  useEffect(() => { load(); }, []);

  async function create(formData: FormData) {
    await apiFetch("/api/admin/announcements", {
      method: "POST",
      body: JSON.stringify({
        message: formData.get("message"),
        type: formData.get("type"),
        expiresAt: formData.get("expiresAt") || undefined
      })
    });
    toast.success("Announcement created");
    setOpen(false);
    load();
  }

  async function toggle(row: AnnouncementRow) {
    await apiFetch(`/api/admin/announcements/${row._id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: !row.isActive })
    });
    toast.success(row.isActive ? "Announcement deactivated" : "Announcement activated");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await apiFetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    toast.success("Announcement deleted");
    load();
  }

  const filteredRows = rows.filter((row) => {
    if (filter === "active") return row.isActive;
    if (filter === "inactive") return !row.isActive;
    return true;
  });

  const activeCount = rows.filter((row) => row.isActive).length;
  const criticalCount = rows.filter((row) => row.type === "critical").length;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-linear-to-r from-card via-card to-muted/40 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold">
              <BellRing className="h-5 w-5 text-scheduled" />
              Announcements
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Broadcast timely updates to all users and manage visibility from one place.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />New Announcement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Announcement</DialogTitle>
              </DialogHeader>
              <form action={create} className="space-y-3">
                <Textarea name="message" required placeholder="Write the announcement message..." className="min-h-28" />
                <Select name="type" defaultValue="info">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Input name="expiresAt" type="datetime-local" />
                <Button className="w-full">Create Announcement</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle>{rows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-sent">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Critical</CardDescription>
            <CardTitle className="text-failed">{criticalCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
          <Button variant={filter === "active" ? "default" : "outline"} size="sm" onClick={() => setFilter("active")}>Active</Button>
          <Button variant={filter === "inactive" ? "default" : "outline"} size="sm" onClick={() => setFilter("inactive")}>Inactive</Button>
        </CardContent>
      </Card>

      {filteredRows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No announcements found</p>
            <p className="text-sm text-muted-foreground">Try another filter or create a new announcement.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredRows.map((row) => (
            <Card key={row._id} className={cn(typeCardStyles[row.type] || typeCardStyles.info)}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={typeBadgeVariant[row.type] || "scheduled"}>{row.type.toUpperCase()}</Badge>
                    <Badge variant={row.isActive ? "sent" : "outline"}>{row.isActive ? "ACTIVE" : "INACTIVE"}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDate(row.expiresAt)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="whitespace-pre-wrap leading-relaxed">{row.message}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => toggle(row)}>
                    <CheckCircle2 className="h-4 w-4" />
                    {row.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-2" onClick={() => remove(row._id)}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
