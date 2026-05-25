import { prisma } from "@/lib/prisma";
import { applyQrStyling, generateExpiredQrBuffer, generateInvalidQrBuffer, generateQrBuffer } from "@/lib/qr";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qrCode = await prisma.qrCode.findUnique({ where: { id }, include: { campaign: true } });
  if (!qrCode) return png(await generateInvalidQrBuffer(), 404, "no-store");
  const expired = qrCode.status === "expired" || (qrCode.campaign.expiresAt && qrCode.campaign.expiresAt < new Date());
  if (expired) return png(await generateExpiredQrBuffer(), 200, "public, max-age=300");
  const buffer = await generateQrBuffer(qrCode.encodedData, qrCode.campaign);
  const styled = await applyQrStyling(buffer, qrCode.campaign);
  return png(styled, 200, "public, max-age=86400");
}

export async function HEAD(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qrCode = await prisma.qrCode.findUnique({ where: { id }, select: { id: true } });
  if (!qrCode) return new Response(null, { status: 404 });
  return new Response(null, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function png(buffer: Buffer, status: number, cacheControl: string) {
  return new Response(new Uint8Array(buffer), {
    status,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff"
    }
  });
}
