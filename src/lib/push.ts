import webpush from "web-push"
import { prisma } from "@/lib/prisma"

// Configure VAPID on module load
// Ensure this runs only if environment variables are set to prevent errors on startup
if (
  process.env.VAPID_EMAIL &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
} else {
  console.warn("VAPID details are not fully set in environment variables. Web push notifications might fail.")
}

export type PushPayload = {
  title: string
  body: string
  icon?: string   // default: /icons/icon-192.png
  badge?: string  // default: /icons/icon-96.png
  url?: string    // where to navigate on click
  tag?: string    // notification grouping key
  data?: Record<string, unknown>
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  // Fetch all active subscriptions for user
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, isActive: true }
  })

  let sent = 0
  let failed = 0

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon ?? "/icons/icon-192.png",
          badge: payload.badge ?? "/icons/icon-96.png",
          url: payload.url ?? "/",
          tag: payload.tag,
          data: payload.data ?? {}
        })
      )

      // Update lastUsedAt
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date() }
      })

      sent++
    } catch (error: any) {
      console.error("Failed to send push notification to subscription:", sub.id, error)
      
      // Subscription expired, invalidated, or VAPID credentials mismatched
      // 410 Gone = subscription no longer valid
      // 404 Not Found = subscription endpoint does not exist
      // 403 Forbidden = VAPID credentials mismatch / authorization failed
      // 400 Bad Request = invalid registration endpoint / payload
      if (error && (error.statusCode === 410 || error.statusCode === 404 || error.statusCode === 403 || error.statusCode === 400)) {
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { isActive: false }
        })
      }
      failed++
    }
  }

  return { sent, failed }
}
