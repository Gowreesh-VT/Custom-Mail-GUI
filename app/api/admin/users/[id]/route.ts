import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { logAudit } from "@/lib/audit";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { auditRecord, emailRecord, templateRecord, userRecord } from "@/lib/records";

export const dynamic = "force-dynamic";

const EMAIL_PAGE_SIZE = 25;

const updateSchema = z.object({ name: z.string().min(1), email: z.string().email(), role: z.enum(["admin", "user"]), dailyLimit: z.number(), monthlyLimit: z.number() });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id } = await params;
  const url = new URL(req.url);
  const emailPage = Math.max(Number(url.searchParams.get("emailPage") || 1), 1);
  const emailPageSize = EMAIL_PAGE_SIZE;
  const emailSkip = (emailPage - 1) * emailPageSize;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      smtpHealthLogs: { orderBy: { testedAt: "desc" }, take: 10 },
      smtpFallbackLogs: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });
  if (!user) return jsonError("User not found", 404);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [emails, emailsTotal, templates, audits, scheduledPending, sentThisMonth, failedTotal] = await Promise.all([
    prisma.email.findMany({ where: { userId: id }, orderBy: { sentAt: "desc" }, take: emailPageSize, skip: emailSkip }),
    prisma.email.count({ where: { userId: id } }),
    prisma.template.findMany({ where: { userId: id }, select: { id: true, name: true, mergeFields: true, createdAt: true, updatedAt: true } }),
    prisma.auditLog.findMany({ where: { OR: [{ userId: id }, { targetId: id }] }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.scheduledEmail.count({ where: { userId: id, status: "pending" } }),
    prisma.email.count({ where: { userId: id, status: "sent", sentAt: { gte: startOfMonth } } }),
    prisma.email.count({ where: { userId: id, status: "failed" } })
  ]);
  return Response.json({
    success: true,
    user: { ...userRecord(user), passwordHash: undefined, smtpPasswordEnc: undefined },
    emails: emails.map(emailRecord),
    emailsTotal,
    emailPageSize,
    emailPage,
    templates: templates.map(templateRecord),
    audits: audits.map(auditRecord),
    scheduledPending,
    sentThisMonth,
    failedTotal
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user: admin } = await requireAdmin(req);
  const { id } = await params;
  const body = updateSchema.parse(await req.json());
  const updated = await prisma.user.update({ where: { id }, data: body });
  if (!updated) return jsonError("User not found", 404);
  await logAudit("admin.user_edited", String(admin._id), body, id, req);
  return Response.json({ success: true, user: { ...userRecord(updated), passwordHash: undefined, smtpPasswordEnc: undefined } });
}
