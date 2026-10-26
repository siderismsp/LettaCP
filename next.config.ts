import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Package a minimal standalone server (used by the production Dockerfile).
  output: "standalone",
};

export default nextConfig;
