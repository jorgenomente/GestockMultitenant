// next.config.ts
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ayuda a Next a detectar correctamente la raíz del workspace cuando hay múltiples lockfiles
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    // En CI/Vercel no frenes el build por ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
