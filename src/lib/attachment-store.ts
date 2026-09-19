import { prisma } from "@/lib/prisma";

export const DB_PATH_PREFIX = "db:";

// Vercel's filesystem is read-only, so uploads live in the database there.
export const useDbAttachmentStorage = Boolean(process.env.VERCEL);

export function isDbAttachmentPath(value: string | undefined | null): value is string {
  return Boolean(value?.startsWith(DB_PATH_PREFIX));
}

export async function saveDbAttachment(userId: string, file: { name: string; mimeType: string; content: Buffer }) {
  const stored = await prisma.storedFile.create({
    data: {
      userId,
      name: file.name,
      mimeType: file.mimeType || "application/octet-stream",
      size: file.content.length,
      data: new Uint8Array(file.content)
    },
    select: { id: true }
  });
  return `${DB_PATH_PREFIX}${stored.id}`;
}

export async function loadDbAttachment(userId: string, attachmentPath: string) {
  const id = attachmentPath.slice(DB_PATH_PREFIX.length);
  const stored = await prisma.storedFile.findFirst({ where: { id, userId } });
  if (!stored) throw new Error("Attachment not found");
  return { name: stored.name, mimeType: stored.mimeType, content: Buffer.from(stored.data) };
}

export async function dbAttachmentExists(userId: string, attachmentPath: string) {
  const id = attachmentPath.slice(DB_PATH_PREFIX.length);
  return Boolean(await prisma.storedFile.findFirst({ where: { id, userId }, select: { id: true } }));
}
