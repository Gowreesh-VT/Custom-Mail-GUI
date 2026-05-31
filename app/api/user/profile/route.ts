import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  extraFields: z.record(z.string(), z.any()).nullable().optional()
});

export async function GET(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const dbUser = await prisma.user.findUnique({
      where: { id: user._id }
    });
    if (!dbUser) return jsonError("User not found", 404);
    
    let extraFieldsObj = {};
    if (dbUser.extraFields) {
      try {
        extraFieldsObj = JSON.parse(dbUser.extraFields);
      } catch (e) {
        console.error("Failed to parse extraFields", e);
      }
    }

    return Response.json({
      success: true,
      profile: {
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone || "",
        extraFields: extraFieldsObj
      }
    });
  } catch (error: any) {
    return jsonError(error.message || "Unauthorized", 401);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user } = await requireUser(req);
    const body = schema.parse(await req.json());

    // Check email uniqueness if email changed
    if (body.email !== user.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: body.email,
          NOT: { id: user._id }
        }
      });
      if (existing) {
        return jsonError("Email is already in use by another user", 400, "EMAIL_IN_USE");
      }
    }

    await prisma.user.update({
      where: { id: user._id },
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        extraFields: body.extraFields ? JSON.stringify(body.extraFields) : null
      }
    });

    return Response.json({ success: true });
  } catch (error: any) {
    return jsonError(error.message || "Failed to update profile", 400);
  }
}
