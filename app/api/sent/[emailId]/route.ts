import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { emailRecord } from "@/lib/records";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ emailId: string }> }) {
  try {
    const { user } = await requireUser(req);
    const { emailId } = await params;

    const email = await prisma.email.findUnique({
      where: { id: emailId }
    });

    if (!email) {
      return jsonError("Email not found", 404);
    }

    // Verify ownership or admin role
    if (email.userId !== String(user._id) && user.role !== "admin") {
      return jsonError("Forbidden", 403);
    }

    return Response.json({
      success: true,
      email: emailRecord(email)
    });
  } catch (error: any) {
    return jsonError(error.message || "Unauthorized", 401);
  }
}
