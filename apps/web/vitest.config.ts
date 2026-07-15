import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@nexa/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@nexa/db": path.resolve(__dirname, "../../packages/db/src/index.ts"),
      "@nexa/ai": path.resolve(__dirname, "../../packages/ai/src/index.ts"),
    },
  },
});
