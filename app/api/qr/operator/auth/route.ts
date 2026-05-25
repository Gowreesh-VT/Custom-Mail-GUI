import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonSuccess, parseDisplayFields } from "@/lib/qr-api";
import { jsonError } from "@/lib/utils";

export async function POST(req: Request) {
  const body = await req.json();
  const operator = await prisma.qrOperator.findUnique({
    where: { email: String(body.email || "").toLowerCase() },
    include: {
      campaigns: {
        where: { campaign: { isActive: true } },
        include: { campaign: true }
      }
    }
  });
  if (!operator || !(await bcrypt.compare(String(body.pin || ""), operator.pinHash))) return jsonError("Invalid email or PIN", 401);
  if (!operator.isActive) return jsonError("Your account has been deactivated. Contact your administrator.", 403);
  return jsonSuccess({
    operatorId: operator.id,
    operatorName: operator.name,
    campaigns: operator.campaigns.map(({ campaign }) => ({ ...campaign, displayFields: parseDisplayFields(campaign.displayFields) }))
  });
}
