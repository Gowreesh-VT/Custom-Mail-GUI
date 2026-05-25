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
  return png(styled, 200, "public, max-age=3600");
}

function png(buffer: Buffer, status: number, cacheControl: string) {
  return new Response(new Uint8Array(buffer), {
    status,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": cacheControl
    }
  });
}
