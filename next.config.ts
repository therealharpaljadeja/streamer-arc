import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@coinbase/cdp-sdk",
    "@base-org/account",
    "@solana/kit",
    "@solana-program/system",
    "@solana-program/token",
    "axios",
    "axios-retry",
  ],
  turbopack: {},
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

export default nextConfig;
