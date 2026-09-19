import { type NextRequest } from "next/server"
import { requireUser } from "@/lib/api"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    await requireUser(req)
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!publicKey) {
      return Response.json({ success: false, error: "VAPID public key not configured on server" }, { status: 500 })
    }

    return Response.json({ success: true, publicKey })
  } catch (error: any) {
    return Response.json({ success: false, error: error.message || "Unauthorized" }, { status: 401 })
  }
}
