import type { NextConfig } from "next";
import { PUBLIC_API_BASE_PRODUCTION } from "./lib/api-config";

if (process.env.VERCEL && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    `[SportHub] NEXT_PUBLIC_API_URL ausente no build. Defina ${PUBLIC_API_BASE_PRODUCTION} em Vercel → Environment Variables e faça Redeploy.`,
  );
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/favicon.svg" }];
  },
};

export default nextConfig;
