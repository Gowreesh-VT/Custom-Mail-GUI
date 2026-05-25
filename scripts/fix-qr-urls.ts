import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set.");
  }

  const codes = await prisma.qrCode.findMany({
    where: {
      imageUrl: { startsWith: "/api/qr/img/" }
    },
    select: {
      id: true,
      imageUrl: true
    }
  });

  for (const code of codes) {
    await prisma.qrCode.update({
      where: { id: code.id },
      data: {
        imageUrl: `${appUrl}${code.imageUrl}`
      }
    });
  }

  console.log(`Updated ${codes.length} QR image URL${codes.length === 1 ? "" : "s"}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
