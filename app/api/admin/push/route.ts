import webpush from "web-push";
import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Configure VAPID if not already done
if (
  process.env.VAPID_EMAIL &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY
) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdmin(req);

  const subscriptions = await prisma.pushSubscription.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Aggregate by platform
  const byPlatform = subscriptions.reduce(
    (acc, sub) => {
      const platform = sub.platform ?? "Desktop";
      acc[platform] = (acc[platform] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const active = subscriptions.filter((s) => s.isActive).length;
  const inactive = subscriptions.filter((s) => !s.isActive).length;

  // Group by user
  const byUser = subscriptions.reduce(
    (acc, sub) => {
      const uid = sub.userId;
      if (!acc[uid]) {
        acc[uid] = {
          userId: uid,
          name: sub.user.name,
          email: sub.user.email,
          devices: [],
        };
      }
      acc[uid].devices.push({
        id: sub.id,
        deviceName: sub.deviceName,
        platform: sub.platform,
        isActive: sub.isActive,
        createdAt: sub.createdAt,
        lastUsedAt: sub.lastUsedAt,
      });
      return acc;
    },
    {} as Record<
      string,
      {
        userId: string;
        name: string;
        email: string;
        devices: Array<{
          id: string;
          deviceName: string | null;
          platform: string | null;
          isActive: boolean;
          createdAt: Date;
          lastUsedAt: Date;
        }>;
      }
    >
  );

  return Response.json({
    success: true,
    summary: {
      total: subscriptions.length,
      active,
      inactive,
      byPlatform,
      uniqueUsers: Object.keys(byUser).length,
    },
    subscriptions: subscriptions.map((sub) => ({
      id: sub.id,
      userId: sub.userId,
      userName: sub.user.name,
      userEmail: sub.user.email,
      deviceName: sub.deviceName,
      platform: sub.platform,
      isActive: sub.isActive,
      createdAt: sub.createdAt,
      lastUsedAt: sub.lastUsedAt,
    })),
    byUser: Object.values(byUser),
  });
}

// POST /api/admin/push — broadcast a notification to all active subscribers
export async function POST(req: NextRequest) {
  await requireAdmin(req);

  const body = (await req.json()) as {
    title: string;
    body: string;
    url?: string;
    targetUserId?: string;
  };

  if (!body.title || !body.body) {
    return Response.json({ success: false, error: "title and body are required" }, { status: 400 });
  }

  const where = body.targetUserId
    ? { isActive: true, userId: body.targetUserId }
    : { isActive: true };

  const subs = await prisma.pushSubscription.findMany({ where });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: body.title,
          body: body.body,
          url: body.url ?? "/compose",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-72.png",
          tag: "admin-broadcast",
        })
      );
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date() },
      });
      sent++;
    } catch (err: unknown) {
      // If subscription expired / invalid, deactivate it
      const errAny = err as { statusCode?: number };
      if (errAny?.statusCode === 410 || errAny?.statusCode === 404) {
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        });
      }
      errors.push(sub.id);
      failed++;
    }
  }

  return Response.json({ success: true, sent, failed, errors });
}
