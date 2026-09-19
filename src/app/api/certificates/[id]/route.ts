import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { normalizeCertField, parseCertFields } from "@/lib/certificate";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const template = await prisma.certificateTemplate.findFirst({
    where: { id, userId: String(user._id) }
  });
  if (!template) return jsonError("Certificate template not found", 404);
  return Response.json({ template: { ...template, fields: parseCertFields(template.fields) } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const body = await req.json();
  const existing = await prisma.certificateTemplate.findFirst({ where: { id, userId: String(user._id) } });
  if (!existing) return jsonError("Certificate template not found", 404);

  const fields = Array.isArray(body.fields) ? body.fields.map(normalizeCertField) : parseCertFields(existing.fields);
  const template = await prisma.certificateTemplate.update({
    where: { id },
    data: {
      name: String(body.name || existing.name).trim() || existing.name,
      description: body.description === undefined ? existing.description : String(body.description || "") || null,
      fields: JSON.stringify(fields)
    }
  });
  await logAudit({ action: "certificate.template_updated", category: "ADMIN", userId: String(user._id), metadata: { name: template.name }, req });
  return Response.json({ template: { ...template, fields } });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const existing = await prisma.certificateTemplate.findFirst({ where: { id, userId: String(user._id) } });
  if (!existing) return jsonError("Certificate template not found", 404);
  await prisma.certificateTemplate.delete({ where: { id } });
  await logAudit({ action: "certificate.template_deleted", category: "ADMIN", userId: String(user._id), metadata: { name: existing.name }, req });
  return Response.json({ success: true });
}
