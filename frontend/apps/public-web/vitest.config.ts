import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    name: "@burokent/public-web",
    // Most of this app runs on the server
    environment: "node",
    // next-intl's ESM build imports "next/server" without a file extension, which Node's resolver rejects
    server: { deps: { inline: ["next-intl"] } },
  },
});
