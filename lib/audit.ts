import { type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { AuditLog } from "@/models/AuditLog";
import { User } from "@/models/User";

const CATEGORY: Record<string, string> = {
  user: "AUTH",
  email: "EMAIL",
  admin: "ADMIN"
};

export async function logAudit(
  action: string,
  userId?: string,
  metadata: Record<string, unknown> = {},
  targetId?: string,
  req?: NextRequest
) {
  try {
    await connectToDatabase();
    const user = userId ? await User.findById(userId).select("name email").lean() : null;
    const target = targetId ? await User.findById(targetId).select("name email").lean() : null;
    await AuditLog.create({
      action,
      category: CATEGORY[action.split(".")[0]] || "SYSTEM",
      userId,
      userName: user ? `${user.name} <${user.email}>` : undefined,
      targetId,
      targetName: target ? `${target.name} <${target.email}>` : undefined,
      metadata,
      ip: req?.headers.get("x-forwarded-for")?.split(",")[0] || req?.headers.get("x-real-ip") || "",
      userAgent: req?.headers.get("user-agent") || ""
    });
  } catch {
    // Audit logging should not break primary user actions.
  }
}
