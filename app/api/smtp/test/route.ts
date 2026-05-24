import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { createTransporter } from "@/lib/mailer";
import { jsonError } from "@/lib/utils";
import { User } from "@/lib/models";

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const started = Date.now();
    await createTransporter(user).verify();
    const latencyMs = Date.now() - started;
    await User.updateOne(
      { _id: user._id },
      { $push: { smtpHealthLog: { $each: [{ testedAt: new Date(), success: true, latencyMs }], $slice: -10 } } }
    );
    return Response.json({ success: true, status: "connected", latencyMs });
  } catch (error: any) {
    try {
      const { user } = await requireUser(req);
      await User.updateOne(
        { _id: user._id },
        { $push: { smtpHealthLog: { $each: [{ testedAt: new Date(), success: false, latencyMs: 0, error: error.message }], $slice: -10 } } }
      );
    } catch {}
    return jsonError(error.message || "SMTP test failed", 400, "SMTP_TEST_FAILED");
  }
}
