import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonSuccess, parseDisplayFields } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";
import { clearRateLimit, getRequestIp, rateLimitAttempt } from "@/lib/security";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email || "").toLowerCase();
  const ip = getRequestIp(req);
  const rateKey = `qr-operator-auth:${ip}:${email}`;
  const limiter = rateLimitAttempt(rateKey, 5, 15 * 60 * 1000);
  if (!limiter.allowed) return jsonError("Too many PIN attempts. Try again later.", 429, "RATE_LIMITED");
  const operator = await prisma.qrOperator.findUnique({
    where: { email },
    include: {
      campaigns: {
        where: { campaign: { isActive: true } },
        include: { campaign: true }
      }
    }
  });
  if (!operator || !(await bcrypt.compare(String(body.pin || ""), operator.pinHash))) return jsonError("Invalid email or PIN", 401);
  if (!operator.isActive) return jsonError("Your account has been deactivated. Contact your administrator.", 403);
  clearRateLimit(rateKey);
  return jsonSuccess({
    operatorId: operator.id,
    operatorName: operator.name,
    campaigns: operator.campaigns.map(({ campaign }) => ({ ...campaign, displayFields: parseDisplayFields(campaign.displayFields) }))
  });
}
