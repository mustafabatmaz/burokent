import { readFileSync } from "node:fs";

export function readCss(file: string): string {
  return readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
}

/** Custom properties declared directly inside the first block that starts with `selector {`. */
export function declarations(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) {
    throw new Error(`No block for ${selector}`);
  }
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const result = new Map<string, string>();
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    result.set(match[1]!, match[2]!.trim());
  }
  return result;
}
