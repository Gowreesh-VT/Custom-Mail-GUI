/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["mongoose", "nodemailer", "agenda", "bcryptjs"],
  turbopack: {
    root: process.cwd()
  },
};

export default nextConfig;
