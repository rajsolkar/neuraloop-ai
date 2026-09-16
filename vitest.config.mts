import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    clearMocks: true,
    testTimeout: 20000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": import.meta.dirname + "/src",
    },
  },
});