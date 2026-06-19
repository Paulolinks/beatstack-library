import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: path.join(__dirname),
  },
  serverExternalPackages: ["node-unrar-js"],
  experimental: {
    // Default 10MB — packs de 40MB+ falhavam com "Failed to parse body as FormData"
    proxyClientMaxBodySize: "1536mb",
    serverActions: {
      bodySizeLimit: "1536mb",
    },
  },
};

export default nextConfig;
