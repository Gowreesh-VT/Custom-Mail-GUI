import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { parseCertFields } from "@/lib/certificate";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await requireUser(req);
  const templates = await prisma.certificateTemplate.findMany({
    where: { userId: String(user._id) },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      pdfFileName: true,
      pdfSizeBytes: true,
      pageCount: true,
      fields: true,
      previewImage: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { generations: true } }
    }
  });

  return Response.json({
    templates: templates.map((template) => ({
      ...template,
      fields: parseCertFields(template.fields)
    }))
  });
}
