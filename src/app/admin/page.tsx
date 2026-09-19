"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/client-api";

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<any>(null);
  const [chart, setChart] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setMounted(true);
    apiFetch<any>("/api/admin/stats/overview").then(setOverview);
    apiFetch<any>("/api/admin/stats/chart").then(setChart);
    const timer = setInterval(() => apiFetch<any>("/api/admin/stats/overview").then(setOverview), 30000);
    return () => clearInterval(timer);
  }, []);

  const stats = overview?.stats || {};
  const cards = [
    ["Total Users", `${stats.totalUsers || 0} (${stats.activeUsers || 0} active / ${stats.inactiveUsers || 0} inactive)`],
    ["Emails Sent Today", stats.emailsToday || 0],
    ["Emails Sent Total", stats.emailsTotal || 0],
    ["Failed Emails", stats.failed7 || 0],
    ["Scheduled Pending", stats.scheduledPending || 0],
    ["Bulk Jobs This Month", stats.bulkMonth || 0]
  ];

  const recentEmails = overview?.recent || [];
  const paginatedRecent = recentEmails.slice((currentPage - 1) * 10, currentPage * 10);
  const totalPages = Math.ceil(Math.min(recentEmails.length, 50) / 10);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">{cards.map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{value}</div></CardContent></Card>)}</div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2"><CardHeader><CardTitle>User Activity</CardTitle></CardHeader><CardContent className="h-80">{mounted ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chart?.byUser || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="sent" fill="hsl(var(--sent))" /><Bar dataKey="failed" fill="hsl(var(--failed))" /></BarChart></ResponsiveContainer> : null}</CardContent></Card>
        <Card><CardHeader><CardTitle>Status Breakdown</CardTitle></CardHeader><CardContent className="h-80">{mounted ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={(chart?.status || []).map((s: any) => ({ name: s._id, value: s.value }))} dataKey="value" nameKey="name" innerRadius={70}>{(chart?.status || []).map((_: any, i: number) => <Cell key={i} fill={["hsl(var(--sent))", "hsl(var(--failed))", "hsl(var(--scheduled))"][i % 3]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : null}</CardContent></Card>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Card><CardHeader><CardTitle>Top Senders</CardTitle></CardHeader><CardContent className="space-y-3">{(overview?.top || []).map((user: any, i: number) => <div key={user.email} className="flex items-center justify-between rounded-md border p-3"><span>{i + 1}. {user.name}<br /><span className="text-sm text-muted-foreground">{user.email}</span></span><Badge variant="sent">{user.sent} sent</Badge></div>)}</CardContent></Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 min-h-[300px]">
              {paginatedRecent.map((email: any) => (
                <div key={email._id} className="rounded-md border p-3 text-sm flex items-center justify-between">
                  <div>
                    <Badge variant={email.status === "sent" ? "sent" : "failed"}>{email.status}</Badge>
                    <span className="ml-2 font-medium">{email.userId?.name || "System"}</span>
                    <span className="text-muted-foreground"> → {email.to?.[0] || "Recipient"}</span>
                    <div className="text-xs text-muted-foreground mt-1 truncate max-w-[280px] sm:max-w-md">{email.subject}</div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(email.sentAt).toLocaleTimeString()}</span>
                </div>
              ))}
              {paginatedRecent.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">No recent activity</div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-1.5 pt-2">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  return (
                    <Button
                      key={p}
                      variant={currentPage === p ? "default" : "outline"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Newly Joined Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(overview?.recentUsers || []).map((user: any) => (
              <div key={user.id} className="rounded-md border p-3 text-sm flex items-center justify-between">
                <div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                    New User Joined
                  </Badge>
                  <p className="text-zinc-300 mt-1 font-medium">
                    {user.name} <span className="text-xs text-muted-foreground">({user.email})</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    registered on the platform
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {(overview?.recentUsers || []).length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground">No recent registrations</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

