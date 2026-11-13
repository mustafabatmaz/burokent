import { describe, expect, it } from "vitest";
import { declarations, readCss } from "./css.ts";

// Brand colours of the public site, as specified in the design guide
const EXPECTED_COLORS: Record<string, string> = {
  night: "#0F0D0A",
  "night-raised": "#16130E",
  line: "#3A3220",
  walnut: "#2A1B12",
  gold: "#C9A24A",
  "gold-light": "#D9B45A",
  "gold-dark": "#7A5C1E",
  emerald: "#1F3A2E",
  cream: "#F3EBDD",
  ivory: "#EFE6D2",
  sand: "#B5A989",
  cognac: "#8A4A22",
  success: "#2F6B3F",
  warning: "#8A5A00",
  error: "#A12B2B",
  info: "#1F5A8A",
};

describe("public tokens", () => {
  const theme = declarations(readCss("public.css"), "@theme");

  it("defines exactly the brand colours", () => {
    const colors = Object.fromEntries(
      [...theme].filter(([name]) => name.startsWith("--color-")).map(([name, value]) => [name.slice(8), value]),
    );
    const expected = Object.fromEntries(
      Object.entries(EXPECTED_COLORS).map(([name, hex]) => [name, hex.toLowerCase()]),
    );

    expect(colors).toEqual(expected);
  });

  it("defines the font families for headings, Arabic headings, body text and labels", () => {
    expect([...theme.keys()].filter((name) => name.startsWith("--font-")).sort()).toEqual([
      "--font-body",
      "--font-heading",
      "--font-heading-ar",
      "--font-label",
    ]);
  });
});
