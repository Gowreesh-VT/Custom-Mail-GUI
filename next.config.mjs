import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development"
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "nodemailer", "bcryptjs", "sharp"],
  turbopack: {
    root: process.cwd()
  },
};

export default withPWA(nextConfig);
