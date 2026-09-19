"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  Layers,
  Loader2,
  Mail,
  MousePointerClick,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/client-api";

export interface CampaignSummary {
  bulkJobId: string;
  subject: string;
  templateName: string;
  templateId: string | null;
  sentAt: string;
  lastSentAt: string;
  totalRecipients: number;
  successfulCount: number;
  failedCount: number;
  openedCount: number;
  clickedCount: number;
  totalOpens: number;
  totalClicks: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export interface CampaignsApiResponse {
  success: boolean;
  campaigns: CampaignSummary[];
  summary: {
    totalCampaigns: number;
    totalEmails: number;
    totalSuccessful: number;
    totalFailed: number;
    avgDeliveryRate: number;
    openRate: number;
    clickRate: number;
  };
}

interface CampaignsDirectoryProps {
  showTitle?: boolean;
  onCampaignSelect?: (bulkJobId: string) => void;
}

export function CampaignsDirectory({ showTitle = true, onCampaignSelect }: CampaignsDirectoryProps) {
  const [data, setData] = React.useState<CampaignsApiResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"newest" | "oldest" | "recipients" | "openRate">("newest");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const loadCampaigns = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<CampaignsApiResponse>("/api/sent/campaign");
      setData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const copyJobId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("Campaign ID copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const campaigns = data?.campaigns;
  const filteredCampaigns = React.useMemo(() => {
    if (!campaigns) return [];
    let list = [...campaigns];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.subject.toLowerCase().includes(q) ||
          c.templateName.toLowerCase().includes(q) ||
          c.bulkJobId.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
      if (sortBy === "oldest") return new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
      if (sortBy === "recipients") return b.totalRecipients - a.totalRecipients;
      if (sortBy === "openRate") return b.openRate - a.openRate;
      return 0;
    });

    return list;
  }, [campaigns, search, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header (optional) */}
      {showTitle && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Campaign Jobs Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Comprehensive performance telemetry across all dispatched bulk campaigns.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadCampaigns}
              disabled={loading}
              className="gap-1.5 h-8 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button asChild size="sm" className="gap-1.5 h-8 text-xs">
              <Link href="/bulk">
                <Send className="h-3.5 w-3.5" />
                Launch Campaign
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="pb-1 pt-3.5 px-4">
            <CardDescription className="text-xs font-medium flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-500" />
              Total Campaigns
            </CardDescription>
            <CardTitle className="text-xl font-bold">
              {loading ? <span className="inline-block h-6 w-12 bg-muted animate-pulse rounded" /> : data?.summary?.totalCampaigns ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-[11px] text-muted-foreground">
            Dispatched bulk runs
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="pb-1 pt-3.5 px-4">
            <CardDescription className="text-xs font-medium flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5 text-sky-500" />
              Total Recipients
            </CardDescription>
            <CardTitle className="text-xl font-bold">
              {loading ? <span className="inline-block h-6 w-12 bg-muted animate-pulse rounded" /> : data?.summary?.totalEmails?.toLocaleString() ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-[11px] text-muted-foreground">
            {data?.summary?.totalSuccessful ?? 0} delivered
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="pb-1 pt-3.5 px-4">
            <CardDescription className="text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Avg Delivery
            </CardDescription>
            <CardTitle className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? <span className="inline-block h-6 w-12 bg-muted animate-pulse rounded" /> : `${data?.summary?.avgDeliveryRate ?? 0}%`}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-[11px] text-muted-foreground">
            {data?.summary?.totalFailed ?? 0} failed
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="pb-1 pt-3.5 px-4">
            <CardDescription className="text-xs font-medium flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-indigo-500" />
              Avg Open Rate
            </CardDescription>
            <CardTitle className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {loading ? <span className="inline-block h-6 w-12 bg-muted animate-pulse rounded" /> : `${data?.summary?.openRate ?? 0}%`}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-[11px] text-muted-foreground">
            Across all delivered
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs col-span-2 sm:col-span-1">
          <CardHeader className="pb-1 pt-3.5 px-4">
            <CardDescription className="text-xs font-medium flex items-center gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5 text-amber-500" />
              Avg Click Rate
            </CardDescription>
            <CardTitle className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {loading ? <span className="inline-block h-6 w-12 bg-muted animate-pulse rounded" /> : `${data?.summary?.clickRate ?? 0}%`}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-[11px] text-muted-foreground">
            Unique link clicks
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search campaigns, templates, or job IDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Sort by:</span>
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest Dispatched</SelectItem>
              <SelectItem value="oldest">Oldest Dispatched</SelectItem>
              <SelectItem value="recipients">Highest Volume</SelectItem>
              <SelectItem value="openRate">Highest Open Rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Campaigns Table / Cards */}
      <Card className="border border-border/60 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading campaign telemetry...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold">
              {search ? "No matching campaigns found" : "No bulk campaigns dispatched yet"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              {search
                ? "Try searching with a different keyword or clear the search filter."
                : "Create a template, upload a CSV, and run your first personalized bulk campaign."}
            </p>
            {search ? (
              <Button variant="outline" size="sm" onClick={() => setSearch("")} className="text-xs">
                Clear Search
              </Button>
            ) : (
              <Button asChild size="sm" className="text-xs gap-1.5">
                <Link href="/bulk">
                  <Send className="h-3.5 w-3.5" />
                  Launch First Campaign
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold">Campaign & Template</TableHead>
                  <TableHead className="text-xs font-semibold">Job ID</TableHead>
                  <TableHead className="text-xs font-semibold">Dispatched</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Recipients</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Deliverability</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Open Rate</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Click Rate</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((c) => (
                  <TableRow
                    key={c.bulkJobId}
                    className="hover:bg-muted/40 transition-colors group cursor-pointer"
                    onClick={() => {
                      if (onCampaignSelect) {
                        onCampaignSelect(c.bulkJobId);
                      }
                    }}
                  >
                    {/* Campaign & Template */}
                    <TableCell className="max-w-[240px]">
                      <div className="space-y-1">
                        <p className="font-medium text-xs text-foreground truncate group-hover:text-primary transition-colors" title={c.subject}>
                          {c.subject}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground">
                            {c.templateName}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>

                    {/* Job ID */}
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => copyJobId(c.bulkJobId, e)}
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground bg-muted/50 px-1.5 py-0.5 rounded transition-colors"
                            >
                              <span>#{c.bulkJobId.slice(0, 8)}</span>
                              <Copy className="h-3 w-3 opacity-60 hover:opacity-100" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {copiedId === c.bulkJobId ? "Copied!" : `Full ID: ${c.bulkJobId}`}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Dispatched */}
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      <div>{new Date(c.sentAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                      <div className="text-[10px] opacity-75">{new Date(c.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </TableCell>

                    {/* Recipients */}
                    <TableCell className="text-right whitespace-nowrap text-xs">
                      <span className="font-semibold text-foreground">{c.totalRecipients}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">total</span>
                    </TableCell>

                    {/* Deliverability */}
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <Badge
                          variant={c.deliveryRate >= 95 ? "sent" : c.deliveryRate >= 80 ? "outline" : "failed"}
                          className="text-[10px] px-1.5 py-0 h-4"
                        >
                          {c.deliveryRate}%
                        </Badge>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {c.successfulCount} / {c.totalRecipients}
                        </span>
                      </div>
                    </TableCell>

                    {/* Open Rate */}
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {c.openRate}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {c.openedCount} unique ({c.totalOpens} total)
                        </span>
                      </div>
                    </TableCell>

                    {/* Click Rate */}
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {c.clickRate}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {c.clickedCount} unique
                        </span>
                      </div>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="text-right whitespace-nowrap">
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs px-2.5 gap-1">
                        <Link href={`/sent/campaign/${c.bulkJobId}`} onClick={(e) => e.stopPropagation()}>
                          <span>View Analytics</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
