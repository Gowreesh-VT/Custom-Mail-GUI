import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { type NextRequest } from "next/server";
import { requireUser } from "@/lib/api";
import { jsonError } from "@/lib/utils";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 10;

export async function POST(req: NextRequest) {
  const { user } = await requireUser(req);
  const form = await req.formData();
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  if (files.length > MAX_FILES) return jsonError("Maximum 10 files are allowed", 400, "TOO_MANY_FILES");
  const uploadDir = path.join(process.cwd(), "uploads", String(user._id));
  await mkdir(uploadDir, { recursive: true });
  const saved = [];
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) return jsonError(`${file.name} is larger than 25MB`, 400, "FILE_TOO_LARGE");
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
    saved.push({ name: file.name, size: file.size, mimeType: file.type, path: filePath });
  }
  return Response.json({ success: true, attachments: saved });
}
