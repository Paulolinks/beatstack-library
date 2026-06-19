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
    // Middleware/proxy bufferam o body — default 10MB quebra upload de packs grandes
    middlewareClientMaxBodySize: "500mb",
    proxyClientMaxBodySize: "500mb",
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
};

export default nextConfig;
