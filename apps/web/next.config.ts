import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@nexa/ai", "@nexa/db", "@nexa/shared"],
};

export default nextConfig;
