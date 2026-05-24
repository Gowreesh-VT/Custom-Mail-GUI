import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/json-fields";

export type AuditCategory = "AUTH" | "EMAIL" | "ADMIN";

const CATEGORY: Record<string, AuditCategory> = {
  user: "AUTH",
  auth: "AUTH",
  email: "EMAIL",
  admin: "ADMIN"
};

type AuditParams = {
  action: string;
  category?: AuditCategory;
  userId?: string;
  userName?: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
  req?: NextRequest;
};

export async function logAudit(
  actionOrParams: string | AuditParams,
  userId?: string,
  metadata: Record<string, unknown> = {},
  targetId?: string,
  req?: NextRequest
): Promise<void> {
  const params: AuditParams =
    typeof actionOrParams === "string"
      ? { action: actionOrParams, userId, metadata, targetId, req }
      : actionOrParams;

  try {
    const [actor, target] = await Promise.all([
      params.userId
        ? prisma.user.findUnique({ where: { id: params.userId }, select: { name: true, email: true } })
        : null,
      params.targetId
        ? prisma.user.findUnique({ where: { id: params.targetId }, select: { name: true, email: true } })
        : null
    ]);

    const actionRoot = params.action.split(".")[0];
    await prisma.auditLog.create({
      data: {
        action: params.action,
        category: params.category ?? CATEGORY[actionRoot] ?? "ADMIN",
        userId: params.userId ?? "",
        userName: params.userName ?? (actor ? `${actor.name} <${actor.email}>` : ""),
        targetId: params.targetId ?? null,
        targetName: params.targetName ?? (target ? `${target.name} <${target.email}>` : null),
        metadata: params.metadata ? toJson(params.metadata) : null,
        ip:
          params.req?.headers.get("x-forwarded-for")?.split(",")[0] ??
          params.req?.headers.get("x-real-ip") ??
          null,
        userAgent: params.req?.headers.get("user-agent") ?? null
      }
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
