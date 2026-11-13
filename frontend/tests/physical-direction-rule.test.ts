import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: new URL("..", import.meta.url).pathname });

async function messages(code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: "fixture.js" });
  return (result?.messages ?? []).filter((message) => message.ruleId === "no-restricted-syntax").map((m) => m.message);
}

describe("physical direction class rule", () => {
  it.each([
    'export const a = "ml-4 flex";',
    'export const a = "flex mr-2";',
    'export const a = "md:pl-6";',
    'export const a = "-mr-1";',
    'export const a = "absolute left-0";',
    'export const a = "text-left";',
    'export const a = "rounded-l-md";',
    'export const a = "border-l";',
    'export const a = "left-1/2";',
    'export const a = "md:right-[3px]";',
    'export const a = "border-r-2";',
    "export const a = `gap-2 ${String(1)} pr-3`;",
  ])("rejects %s", async (code) => {
    expect(await messages(code)).toHaveLength(1);
  });

  it.each([
    'export const a = "ms-4 me-2 ps-6 pe-1 start-0 end-0 text-start text-end rounded-s-md border-e-2";',
    'export const a = "Sol tarafta menü";',
    'export const a = "max-w-prose";',
    'export const a = "items-center";',
    'export const a = "is right-to-left only for Arabic";',
    'export const a = "border-s rounded-e";',
  ])("accepts %s", async (code) => {
    expect(await messages(code)).toEqual([]);
  });
});
