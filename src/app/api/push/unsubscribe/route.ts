import { type NextRequest } from "next/server"
import { requireUser } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  // Support POST with custom action or delete method to bypass browser constraints if needed
  return handleUnsubscribe(req)
}

export async function DELETE(req: NextRequest) {
  return handleUnsubscribe(req)
}

async function handleUnsubscribe(req: NextRequest) {
  try {
    const { user } = await requireUser(req)
    const body = await req.json()
    const { endpoint } = body

    if (!endpoint) {
      return Response.json({ success: false, error: "Missing subscription endpoint" }, { status: 400 })
    }

    // Set isActive to false for this endpoint
    const pushSubscriptionModel =
      (prisma as any).pushSubscription ?? (prisma as any).pushSubscriptions

    if (!pushSubscriptionModel?.updateMany) {
      throw new Error("PushSubscription model is not available on Prisma client")
    }

    await pushSubscriptionModel.updateMany({
      where: {
        endpoint,
        userId: String(user._id)
      },
      data: {
        isActive: false
      }
    })

    return Response.json({ success: true })
  } catch (error: any) {
    console.error("Error in /api/push/unsubscribe:", error)
    return Response.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
