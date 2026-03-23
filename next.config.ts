import type { NextConfig } from "next";

if (process.env.VERCEL && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    "[SportHub] NEXT_PUBLIC_API_URL ausente no build. Vercel → Settings → Environment Variables → adicione a URL do backend (sem barra no final) e faça Redeploy.",
  );
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/favicon.svg" }];
  },
};

export default nextConfig;
