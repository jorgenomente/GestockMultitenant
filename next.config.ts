// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // En CI/Vercel no frenes el build por ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
