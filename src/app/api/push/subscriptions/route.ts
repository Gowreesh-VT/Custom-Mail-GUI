import { type NextRequest } from "next/server"
import { requireUser } from "@/lib/api"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req)
    const userId = String(user._id)

    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true
      },
      orderBy: {
        lastUsedAt: "desc"
      }
    })

    return Response.json({ success: true, subscriptions })
  } catch (error: any) {
    console.error("Error fetching subscriptions:", error)
    return Response.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
