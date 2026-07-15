import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@nexa/ai", "@nexa/db", "@nexa/shared"],
};

export default nextConfig;
