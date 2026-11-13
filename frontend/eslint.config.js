import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// Physical direction utilities break the Arabic (RTL) layout; use the logical ones (ms-, me-, ps-, pe-, start-,
// end-, text-start, text-end, rounded-s-, rounded-e-, border-s-, border-e-) instead.
export const PHYSICAL_DIRECTION_CLASS =
  "/(^|\\s|:)-?(ml|mr|pl|pr|left|right|scroll-ml|scroll-mr|scroll-pl|scroll-pr)-(\\d|auto|full|px|\\[)|(^|\\s|:)(rounded-(l|r|tl|tr|bl|br)|border-(l|r))(-|\\s|$)|(^|\\s|:)(text|float)-(left|right)(\\s|$)/";

const PHYSICAL_DIRECTION_MESSAGE =
  "Physical direction class: use the logical utility (ms-/me-, ps-/pe-, start-/end-, text-start/text-end, rounded-s/e, border-s/e) so RTL works.";

export default defineConfig(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/generated/**",
      "**/next-env.d.ts",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  { files: ["**/*.{js,mjs}"], extends: [tseslint.configs.disableTypeChecked] },
  { files: ["**/*.tsx"], extends: [reactHooks.configs.flat.recommended] },
  {
    // Next's own rules (next/link, next/image, Core Web Vitals) for the public site only
    files: ["apps/public-web/**/*.{ts,tsx}"],
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // Only for the old pages/ router
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${PHYSICAL_DIRECTION_CLASS}]`, message: PHYSICAL_DIRECTION_MESSAGE },
        { selector: `TemplateElement[value.raw=${PHYSICAL_DIRECTION_CLASS}]`, message: PHYSICAL_DIRECTION_MESSAGE },
      ],
    },
  },
  // The rule's own test feeds it forbidden classes on purpose
  { files: ["tests/physical-direction-rule.test.ts"], rules: { "no-restricted-syntax": "off" } },
);
