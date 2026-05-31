"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/client-api";

export default function AdminSmtpPage() {
  const [mode, setMode] = useState(false);
  const [smtp, setSmtp] = useState<any>({ port: 587, encryption: "TLS", rejectUnauth: true });
  const [users, setUsers] = useState<any[]>([]);
  const [tooltipUser, setTooltipUser] = useState<string | null>(null);

  async function load() { const d = await apiFetch<any>("/api/admin/smtp"); setMode(d.config.globalSmtpActive); setSmtp({ ...d.config.globalSmtp, password: "" }); setUsers(d.users); }
  useEffect(() => { load(); }, []);
  async function save() { await apiFetch("/api/admin/smtp", { method: "PUT", body: JSON.stringify({ globalSmtpActive: mode, globalSmtp: smtp }) }); toast.success("SMTP settings saved"); load(); }
  async function test() { const d = await apiFetch<any>("/api/admin/smtp/test", { method: "POST", body: "{}" }); toast.success(`Connected in ${d.latencyMs}ms`); }

  function formatFallbackTime(val?: string) {
    if (!val) return "Never triggered";
    const date = new Date(val);
    return date.toLocaleString();
  }

  return <div className="space-y-5"><h2 className="text-2xl font-semibold">Global SMTP</h2><Card><CardHeader><CardTitle>Mode</CardTitle></CardHeader><CardContent className="flex items-center justify-between"><span>{mode ? "Global SMTP Override" : "Per-User SMTP"}</span><Switch checked={mode} onCheckedChange={async (checked) => { setMode(checked); await apiFetch("/api/admin/smtp", { method: "PUT", body: JSON.stringify({ globalSmtpActive: checked, globalSmtp: smtp }) }); toast.success(`SMTP switched to ${checked ? "Global Override" : "Per-User SMTP"}`); load(); }} /></CardContent></Card>{mode && <Card><CardHeader><CardTitle>Global SMTP Override</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Field label="Host" value={smtp.host} set={(v) => setSmtp({ ...smtp, host: v })} /><Field label="Port" type="number" value={smtp.port} set={(v) => setSmtp({ ...smtp, port: Number(v) })} /><Field label="Username" value={smtp.username} set={(v) => setSmtp({ ...smtp, username: v })} /><Field label="Password" type="password" value={smtp.password} set={(v) => setSmtp({ ...smtp, password: v })} /><Field label="From Name" value={smtp.fromName} set={(v) => setSmtp({ ...smtp, fromName: v })} /><Field label="From Email" value={smtp.fromEmail} set={(v) => setSmtp({ ...smtp, fromEmail: v })} /><div className="space-y-2"><Label>Encryption</Label><Select value={smtp.encryption} onValueChange={(v) => setSmtp({ ...smtp, encryption: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="TLS">TLS</SelectItem><SelectItem value="SSL">SSL</SelectItem><SelectItem value="NONE">None</SelectItem></SelectContent></Select></div><div className="flex items-center justify-between rounded-md border p-3"><Label>Reject Unauthorized</Label><Switch checked={smtp.rejectUnauth !== false} onCheckedChange={(v) => setSmtp({ ...smtp, rejectUnauth: v })} /></div><div className="flex gap-2 md:col-span-2"><Button onClick={save}>Save & Activate Override</Button><Button variant="outline" onClick={test}>Test Connection</Button></div></CardContent></Card>}<Card><CardHeader><CardTitle>Per-User SMTP Summary</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Host</TableHead><TableHead>Last Tested</TableHead><TableHead>Status</TableHead><TableHead>Fallback</TableHead></TableRow></TableHeader><TableBody>{users.map((u) => <TableRow key={u._id}><TableCell>{u.name}<br /><span className="text-muted-foreground">{u.email}</span></TableCell><TableCell>{u.host}</TableCell><TableCell>{u.lastTested ? new Date(u.lastTested).toLocaleString() : "-"}</TableCell><TableCell>{u.status === undefined ? "Untested" : u.status ? "Connected" : "Failed"}</TableCell><TableCell className="relative">{u.fallbackEnabled ? (<div><Button variant="ghost" size="sm" className="h-auto p-1 font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1" onClick={() => setTooltipUser(tooltipUser === u._id ? null : u._id)}>🔄 Enabled</Button>{tooltipUser === u._id && (<div className="absolute right-0 top-full mt-1 z-10 w-52 rounded-md border bg-popover p-3 text-popover-foreground shadow-md animate-in fade-in zoom-in-95"><p className="text-xs font-semibold border-b pb-1 mb-1">Fallback Config</p><p className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Secondary:</span> {u.secondaryHost}:{u.secondaryPort}</p><p className="text-[11px] text-muted-foreground mt-1"><span className="font-semibold text-foreground">Last used:</span> {formatFallbackTime(u.lastFallbackTriggered)}</p></div>)}</div>) : (<span className="text-muted-foreground text-sm">— Disabled</span>)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div>;
}

function Field({ label, value, set, type = "text" }: { label: string; value?: string | number; set: (v: string) => void; type?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value || ""} onChange={(e) => set(e.target.value)} /></div>;
}
