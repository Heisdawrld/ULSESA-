import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Prisma's generated client lives in node_modules/.prisma/client and is
  // loaded dynamically at runtime, so Next.js' standalone file-tracer does
  // not pick it up automatically. Without this, the standalone server
  // bundle ships with an empty PrismaClient — every `db.<model>.findMany()`
  // throws "Cannot read properties of undefined (reading 'findMany')".
  // Explicitly include the generated client (and @prisma/client) so the
  // model delegates survive into .next/standalone.
  outputFileTracingIncludes: {
    "/": ["./node_modules/.prisma/client/**/*", "./node_modules/@prisma/client/**/*"],
  },
};

export default nextConfig;
