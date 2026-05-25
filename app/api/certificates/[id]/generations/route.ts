import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { fromJson } from "@/lib/json-fields";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireUser(req);
  const { id } = await params;
  const template = await prisma.certificateTemplate.findFirst({ where: { id, userId: String(user._id) } });
  if (!template) return jsonError("Certificate template not found", 404);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
  const where = {
    templateId: id,
    ...(status && status !== "all" ? { status } : {})
  };
  const [generations, total, successful, failed, last] = await Promise.all([
    prisma.certificateGeneration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.certificateGeneration.count({ where: { templateId: id } }),
    prisma.certificateGeneration.count({ where: { templateId: id, status: "attached" } }),
    prisma.certificateGeneration.count({ where: { templateId: id, status: "failed" } }),
    prisma.certificateGeneration.findFirst({ where: { templateId: id }, orderBy: { createdAt: "desc" } })
  ]);

  return Response.json({
    stats: {
      total,
      successful,
      failed,
      lastGenerated: last?.generatedAt || last?.createdAt || null
    },
    generations: generations.map((generation) => ({
      ...generation,
      mergeData: fromJson<Record<string, string>>(generation.mergeData, {})
    })),
    page,
    limit
  });
}
