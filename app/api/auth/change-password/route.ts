import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = schema.parse(await req.json());
    const matches = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!matches) return jsonError("Current password is incorrect", 401, "INCORRECT_PASSWORD");
    user.passwordHash = await bcrypt.hash(body.newPassword, 12);
    user.forcePasswordReset = false;
    await user.save();
    return Response.json({ success: true });
  } catch (error: any) {
    return jsonError(error.message || "Unable to change password", 400);
  }
}
