import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("operatorToken")?.value;
    if (!token) {
      return jsonError("Unauthorized", 401);
    }

    const payload = verifyToken(token, "access");
    if (!payload.userId) {
      return jsonError("Unauthorized", 401);
    }

    const operator = await prisma.qrOperator.findUnique({
      where: { id: payload.userId },
      include: { campaigns: { include: { campaign: true } } }
    });

    if (!operator || !operator.isActive) {
      return jsonError("Operator not found or inactive", 401);
    }

    return Response.json({
      success: true,
      operator: {
        id: operator.id,
        name: operator.name,
        email: operator.email,
        campaigns: operator.campaigns.map((c) => ({
          id: c.campaign.id,
          name: c.campaign.name,
          type: c.campaign.type
        }))
      }
    });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}
