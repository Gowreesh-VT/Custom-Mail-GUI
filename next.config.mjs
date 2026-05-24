/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "nodemailer", "bcryptjs"],
  turbopack: {
    root: process.cwd()
  },
};

export default nextConfig;
