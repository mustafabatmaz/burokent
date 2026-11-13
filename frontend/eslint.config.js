import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

// Physical direction utilities break the Arabic (RTL) layout; use the logical ones (ms-, me-, ps-, pe-, start-,
// end-, text-start, text-end, rounded-s-, rounded-e-, border-s-, border-e-) instead.
export const PHYSICAL_DIRECTION_CLASS =
  "/(^|\\s|:)(-?(ml|mr|pl|pr)|left|right|rounded-(l|r|tl|tr|bl|br)|border-(l|r)|scroll-(ml|mr|pl|pr))-|(^|\\s|:)(text|float)-(left|right)(\\s|$)/";

const PHYSICAL_DIRECTION_MESSAGE =
  "Physical direction class: use the logical utility (ms-/me-, ps-/pe-, start-/end-, text-start/text-end, rounded-s/e, border-s/e) so RTL works.";

export default defineConfig(
  { ignores: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/coverage/**", "**/generated/**"] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  { files: ["**/*.js"], extends: [tseslint.configs.disableTypeChecked] },
  { files: ["**/*.tsx"], extends: [reactHooks.configs.flat.recommended] },
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
