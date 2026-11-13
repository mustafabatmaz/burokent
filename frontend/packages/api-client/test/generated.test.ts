import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { API_GROUPS, generatedFile, renderTypes } from "../scripts/codegen.ts";

describe("generated API types", () => {
  it.each(API_GROUPS)("%s types match the committed spec (run pnpm generate:api)", async (group) => {
    expect(readFileSync(generatedFile(group), "utf8")).toBe(await renderTypes(group));
  });
});
