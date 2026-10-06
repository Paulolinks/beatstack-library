import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  outputFileTracingExcludes: {
    "*": [
      "./storage/**",
      "./data/**",
      "./releases/**",
      "./dist-electron/**",
      "./dist-electron-manager/**",
      "./dist-electron-manager-*/**",
      "./dist-build-manager-release/**",
      "./dist-build-fresh-*/**",
      "./dist-build-fresh-211/**",
      "./dist-build-fresh-212/**",
      "./dist-build-fresh-213/**",
      "./scripts/manager-template.db",
      "./prisma/dev.db",
      "./prisma/*.db",
    ],
  },
  turbopack: {
    root: path.join(__dirname),
  },
  serverExternalPackages: ["node-unrar-js"],
  experimental: {
    // Manager local — packs grandes (até ~10 GB)
    proxyClientMaxBodySize: "10240mb",
    serverActions: {
      bodySizeLimit: "10240mb",
    },
  },
};

export default nextConfig;
