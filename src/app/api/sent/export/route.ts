import { type NextRequest } from "next/server";
import Papa from "papaparse";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseJsonAddresses(val?: string | null): string {
  if (!val) return "";
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.join(", ");
    return String(parsed);
  } catch {
    return String(val);
  }
}

function parseAttachmentsInfo(val?: string | null): { count: number; names: string } {
  if (!val) return { count: 0, names: "" };
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) {
      return {
        count: parsed.length,
        names: parsed.map((a: any) => a.name || "unnamed").join("; ")
      };
    }
  } catch {}
  return { count: 0, names: "" };
}

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "summary"; // "summary" | "detailed"
  const status = url.searchParams.get("status") || "all"; // "all" | "sent" | "failed"
  const format = url.searchParams.get("format") || "csv"; // "csv" | "json"
  const fromDate = url.searchParams.get("from") || url.searchParams.get("startDate") || "";
  const toDate = url.searchParams.get("to") || url.searchParams.get("endDate") || "";

  const whereClause: any = {
    userId: String(user._id)
  };

  if (status && status !== "all") {
    whereClause.status = status;
  }

  const sentAtFilter: any = {};
  if (fromDate) {
    const start = new Date(fromDate);
    if (!isNaN(start.getTime())) {
      sentAtFilter.gte = start;
    }
  }
  if (toDate) {
    const end = new Date(toDate.includes("T") ? toDate : `${toDate}T23:59:59.999Z`);
    if (!isNaN(end.getTime())) {
      sentAtFilter.lte = end;
    }
  }
  if (Object.keys(sentAtFilter).length > 0) {
    whereClause.sentAt = sentAtFilter;
  }

  const emails = await prisma.email.findMany({
    where: whereClause,
    orderBy: { sentAt: "desc" }
  });

  if (format === "json") {
    return Response.json({
      success: true,
      count: emails.length,
      type,
      emails: emails.map((e) => ({
        id: e.id,
        sentAt: e.sentAt.toISOString(),
        to: parseJsonAddresses(e.toAddresses),
        cc: parseJsonAddresses(e.ccAddresses),
        bcc: parseJsonAddresses(e.bccAddresses),
        subject: e.subject,
        status: e.status,
        errorMsg: e.errorMsg || null,
        openCount: e.openCount,
        clickCount: e.clickCount,
        firstOpenedAt: e.firstOpenedAt?.toISOString() || null,
        lastOpenedAt: e.lastOpenedAt?.toISOString() || null,
        templateName: e.templateName || null,
        bulkJobId: e.bulkJobId || null,
        usedFallbackSmtp: e.usedFallbackSmtp,
        isBulk: e.isBulk,
        retryCount: e.retryCount,
        mergeData: e.mergeData ? JSON.parse(e.mergeData) : null
      }))
    });
  }

  let rows: Record<string, any>[] = [];

  if (type === "detailed") {
    rows = emails.map((e) => {
      const attach = parseAttachmentsInfo(e.attachments);
      let parsedMerge = "";
      try {
        if (e.mergeData) {
          const obj = JSON.parse(e.mergeData);
          parsedMerge = Object.entries(obj)
            .map(([k, v]) => `${k}=${v}`)
            .join(" | ");
        }
      } catch {
        parsedMerge = e.mergeData || "";
      }

      return {
        "Email ID": e.id,
        "Date Sent": e.sentAt.toISOString(),
        "Recipient (To)": parseJsonAddresses(e.toAddresses),
        "CC": parseJsonAddresses(e.ccAddresses),
        "BCC": parseJsonAddresses(e.bccAddresses),
        "Reply-To": e.replyTo || "",
        "Subject": e.subject,
        "Delivery Status": e.status,
        "Failure Reason / Error": e.errorMsg || "",
        "Opens": e.openCount,
        "Clicks": e.clickCount,
        "First Opened At": e.firstOpenedAt ? e.firstOpenedAt.toISOString() : "",
        "Last Opened At": e.lastOpenedAt ? e.lastOpenedAt.toISOString() : "",
        "Used Fallback SMTP": e.usedFallbackSmtp ? "Yes" : "No",
        "Retry Count": e.retryCount,
        "Template Name": e.templateName || "",
        "Campaign ID (Bulk Job)": e.bulkJobId || "",
        "Is Bulk": e.isBulk ? "Yes" : "No",
        "Attachments Count": attach.count,
        "Attachment Names": attach.names,
        "Tracking Enabled": e.trackingEnabled ? "Yes" : "No",
        "Custom Merge Fields": parsedMerge
      };
    });
  } else {
    // Summary export
    rows = emails.map((e) => ({
      "Date Sent": e.sentAt.toISOString(),
      "Recipient": parseJsonAddresses(e.toAddresses),
      "Subject": e.subject,
      "Status": e.status,
      "Opens": e.openCount,
      "Clicks": e.clickCount,
      "First Opened At": e.firstOpenedAt ? e.firstOpenedAt.toISOString() : "",
      "Template": e.templateName || "",
      "Campaign ID": e.bulkJobId || "",
      "Used Fallback SMTP": e.usedFallbackSmtp ? "Yes" : "No",
      "Error Reason": e.errorMsg || ""
    }));
  }

  const csv = Papa.unparse(rows);
  let datePart = "";
  if (fromDate && toDate) {
    datePart = `_${fromDate}_to_${toDate}`;
  } else if (fromDate) {
    datePart = `_from_${fromDate}`;
  } else if (toDate) {
    datePart = `_until_${toDate}`;
  } else {
    datePart = `_${new Date().toISOString().slice(0, 10)}`;
  }
  const filename = `sent_emails_${type}${status !== "all" ? `_${status}` : ""}${datePart}.${format}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
