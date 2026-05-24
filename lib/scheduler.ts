import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/json-fields";
import type { AttachmentRecord } from "@/types/models";

export interface ScheduleEmailParams {
  userId: string;
  toAddresses: string[];
  ccAddresses?: string[];
  bccAddresses?: string[];
  replyTo?: string;
  subject: string;
  bodyHtml: string;
  attachments?: AttachmentRecord[];
  scheduledAt: Date;
}

export async function scheduleEmail(params: ScheduleEmailParams): Promise<string> {
  const scheduled = await prisma.scheduledEmail.create({
    data: {
      userId: params.userId,
      toAddresses: toJson(params.toAddresses)!,
      ccAddresses: toJson(params.ccAddresses),
      bccAddresses: toJson(params.bccAddresses),
      replyTo: params.replyTo ?? null,
      subject: params.subject,
      bodyHtml: params.bodyHtml,
      attachments: toJson(params.attachments),
      scheduledAt: params.scheduledAt,
      status: "pending"
    }
  });

  return scheduled.id;
}

export async function cancelScheduledEmail(scheduledEmailId: string, userId: string): Promise<boolean> {
  const result = await prisma.scheduledEmail.updateMany({
    where: {
      id: scheduledEmailId,
      userId,
      status: "pending"
    },
    data: { status: "cancelled" }
  });

  return result.count > 0;
}

export async function rescheduleEmail(
  scheduledEmailId: string,
  userId: string,
  newScheduledAt: Date
): Promise<boolean> {
  const result = await prisma.scheduledEmail.updateMany({
    where: {
      id: scheduledEmailId,
      userId,
      status: { in: ["pending", "failed"] }
    },
    data: {
      scheduledAt: newScheduledAt,
      status: "pending",
      errorMsg: null
    }
  });

  return result.count > 0;
}
