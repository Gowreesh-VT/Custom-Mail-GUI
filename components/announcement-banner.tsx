"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  info: "border-scheduled/30 bg-scheduled/10 text-foreground",
  warning: "border-warning/30 bg-warning/10 text-foreground",
  critical: "border-failed/30 bg-failed/10 text-foreground"
};

export function AnnouncementBanner() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { apiFetch<any>("/api/announcements/active").then((d) => setItems(d.announcements || [])).catch(() => {}); }, []);
  async function dismiss(item: any) {
    await apiFetch(`/api/announcements/${item._id}/dismiss`, { method: "POST", body: "{}" });
    setItems((current) => current.filter((entry) => entry._id !== item._id));
  }
  if (!items.length) return null;
  return <div className="mb-4 space-y-2">{items.map((item) => <div key={item._id} className={cn("flex items-start justify-between gap-3 rounded-md border p-3 text-sm", styles[item.type] || styles.info)}><span>{item.message}</span>{item.type !== "critical" && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => dismiss(item)}><X className="h-4 w-4" /></Button>}</div>)}</div>;
}
