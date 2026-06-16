import { type NextRequest } from "next/server";
import dns from "dns";

export const maxDuration = 300; // Allow up to 5 minutes for bulk validation
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Perform MX check on domain
async function checkDomainMx(domain: string): Promise<boolean> {
  try {
    const records = await dns.promises.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    try {
      const records = await dns.promises.resolve(domain, "MX");
      return records && records.length > 0;
    } catch {
      try {
        const addresses = await dns.promises.resolve4(domain);
        return addresses && addresses.length > 0;
      } catch {
        return false;
      }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = await req.json();
    const emails: string[] = Array.isArray(body.emails) ? body.emails.map((e: any) => String(e || "").trim().toLowerCase()).filter(Boolean) : [];
    const templateId = body.templateId ? String(body.templateId) : undefined;
    const globalCheck = body.globalCheck !== false; // default true

    if (emails.length === 0) {
      return Response.json({ success: true, invalidMxDomains: [], alreadySent: [] });
    }

    // 1. Gather unique domains
    const uniqueDomains = Array.from(
      new Set(
        emails
          .map((e) => {
            const parts = e.split("@");
            return parts.length > 1 ? parts[parts.length - 1] : "";
          })
          .filter(Boolean)
      )
    );

    // 2. Perform batch MX checks
    const mxResults = await Promise.all(
      uniqueDomains.map(async (domain) => {
        const isValid = await checkDomainMx(domain);
        return { domain, isValid };
      })
    );
    const invalidMxDomains = mxResults.filter((r) => !r.isValid).map((r) => r.domain);

    // 3. Check already sent list
    // Select sent emails by this user
    const sentEmails = await prisma.email.findMany({
      where: {
        userId: String(user._id),
        status: "sent",
        ...(templateId && !globalCheck ? { templateId } : {})
      },
      select: {
        toAddresses: true
      }
    });

    // Parse all sent addresses into a set
    const sentSet = new Set<string>();
    for (const record of sentEmails) {
      try {
        const to = JSON.parse(record.toAddresses);
        if (Array.isArray(to)) {
          to.forEach((addr: string) => sentSet.add(addr.trim().toLowerCase()));
        }
      } catch {
        if (typeof record.toAddresses === "string") {
          record.toAddresses
            .split(",")
            .map((s: string) => s.trim().toLowerCase())
            .forEach((addr: string) => sentSet.add(addr));
        }
      }
    }

    const alreadySent = emails.filter((email) => sentSet.has(email));

    return Response.json({
      success: true,
      invalidMxDomains,
      alreadySent
    });
  } catch (error: any) {
    return jsonError(error.message || "Bulk validation failed", 500);
  }
}
