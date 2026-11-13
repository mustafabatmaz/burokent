import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Finds the request config at src/i18n/request.ts
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // A self-contained server (server.js + only the traced node_modules) for the Docker image
  output: "standalone",
  // Trace from the workspace root: the app uses workspace packages outside apps/public-web
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  poweredByHeader: false,
  // The workspace packages ship source files; Next compiles them like app code
  transpilePackages: ["@burokent/tokens"],
};

export default withNextIntl(nextConfig);
