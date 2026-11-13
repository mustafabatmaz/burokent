import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    // Same origin in development too, so the SameSite=Strict session cookies work
    proxy: { "/api": "http://localhost:8090" },
  },
  test: {
    name: "@burokent/admin-web",
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
