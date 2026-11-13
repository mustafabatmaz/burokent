import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Finds the request config at src/i18n/request.ts
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The workspace packages ship source files; Next compiles them like app code
  transpilePackages: ["@burokent/tokens"],
};

export default withNextIntl(nextConfig);
