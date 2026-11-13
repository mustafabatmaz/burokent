import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public client", () => {
  it("never imports the admin API", () => {
    const source = readFileSync(new URL("../src/public.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(/generated\/admin|\.\/admin/);
  });
});
