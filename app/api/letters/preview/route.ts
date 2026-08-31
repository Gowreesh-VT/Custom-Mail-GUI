import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";
import { generateLetterAttachmentForRow, type LetterConfig } from "@/lib/letter-generator";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);

    const formData = await req.formData();
    const rowJson = formData.get("row") as string;
    const configJson = formData.get("letterConfig") as string;

    const defaultDocxFile = formData.get("defaultDocx") as File | null;
    const entrepreneurshipDocxFile = formData.get("entrepreneurshipDocx") as File | null;

    if (!rowJson || !configJson) {
      return jsonError("Missing row data or letter configuration", 400);
    }

    const row = JSON.parse(rowJson);
    const config: LetterConfig = JSON.parse(configJson);

    const templateBuffers: { defaultDocx?: Buffer; entrepreneurshipDocx?: Buffer } = {};
    if (defaultDocxFile && defaultDocxFile.size > 0) {
      templateBuffers.defaultDocx = Buffer.from(await defaultDocxFile.arrayBuffer());
    }
    if (entrepreneurshipDocxFile && entrepreneurshipDocxFile.size > 0) {
      templateBuffers.entrepreneurshipDocx = Buffer.from(await entrepreneurshipDocxFile.arrayBuffer());
    }

    const result = await generateLetterAttachmentForRow(row, config, templateBuffers);

    return NextResponse.json({
      success: true,
      fileName: result.name,
      pdfBase64: result.content.toString("base64")
    });
  } catch (error: any) {
    console.error("[letter preview] error:", error);
    return jsonError(error.message || "Failed to generate letter preview", 500);
  }
}
