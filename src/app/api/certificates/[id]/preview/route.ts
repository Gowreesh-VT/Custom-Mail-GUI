import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { generateCertificate, parseCertFields } from "@/lib/certificate";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const body = await req.json();
  const template = await prisma.certificateTemplate.findFirst({
    where: { id, userId: String(user._id) }
  });
  if (!template) return jsonError("Certificate template not found", 404);

  const pdf = await generateCertificate({
    pdfBase64: template.pdfBase64,
    fields: parseCertFields(template.fields),
    mergeData: body.mergeData || {}
  });

  return Response.json({ pdfBase64: pdf.toString("base64") });
}
