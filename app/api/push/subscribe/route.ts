import { type NextRequest } from "next/server"
import { requireUser } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { user } = await requireUser(req)
    const body = await req.json()
    const { endpoint, p256dh, auth, deviceName, userAgent, platform } = body

    if (!endpoint || !p256dh || !auth) {
      return Response.json({ success: false, error: "Missing required subscription fields" }, { status: 400 })
    }

    const userId = String(user._id)

    // Upsert subscription based on unique endpoint
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        p256dh,
        auth,
        deviceName: deviceName || null,
        userAgent: userAgent || null,
        platform: platform || null,
        isActive: true,
        lastUsedAt: new Date()
      },
      create: {
        userId,
        endpoint,
        p256dh,
        auth,
        deviceName: deviceName || null,
        userAgent: userAgent || null,
        platform: platform || null,
        isActive: true
      }
    })

    return Response.json({ success: true, subscription })
  } catch (error: any) {
    console.error("Error in /api/push/subscribe:", error)
    return Response.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
