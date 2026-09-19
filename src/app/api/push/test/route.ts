import { type NextRequest } from "next/server"
import { requireUser } from "@/lib/api"
import { sendPushToUser } from "@/lib/push"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req)
    const userId = String(user._id)

    const result = await sendPushToUser(userId, {
      title: "Test Notification 🔔",
      body: "Push notifications are working!",
      url: "/settings",
      tag: "test-notification"
    })

    return Response.json({
      success: true,
      message: `Test push sent. Successful: ${result.sent}, Failed: ${result.failed}`,
      ...result
    })
  } catch (error: any) {
    console.error("Error in /api/push/test:", error)
    return Response.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
