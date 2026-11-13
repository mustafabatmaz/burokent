import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/*",
      {
        test: {
          name: "workspace",
          include: ["tests/**/*.test.ts"],
          environment: "node",
        },
      },
    ],
  },
});
