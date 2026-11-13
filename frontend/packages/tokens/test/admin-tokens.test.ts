import { describe, expect, it } from "vitest";
import { declarations, readCss } from "./css.ts";

describe("admin tokens", () => {
  const css = readCss("admin.css");
  const light = declarations(css, ":root");
  const dark = declarations(css, ".dark");
  const theme = declarations(css, "@theme inline");

  it("uses the pastel blue palette in light mode", () => {
    expect(light.get("--background")).toBe("#f5f8fc");
    expect(light.get("--card")).toBe("#ffffff");
    expect(light.get("--border")).toBe("#e2e8f0");
    expect(light.get("--foreground")).toBe("#0f172a");
    expect(light.get("--muted-foreground")).toBe("#5b6b80");
    expect(light.get("--primary")).toBe("#2563eb");
    expect(light.get("--primary-foreground")).toBe("#ffffff");
    expect(light.get("--secondary")).toBe("#eff6ff");
    expect(light.get("--secondary-foreground")).toBe("#1d4ed8");
    expect(light.get("--sidebar-accent")).toBe("#dbeafe");
    expect(light.get("--sidebar-accent-foreground")).toBe("#1e40af");
    expect(light.get("--status-new")).toBe("#ede9fe");
    expect(light.get("--status-new-foreground")).toBe("#5b21b6");
  });

  it("uses the dark palette in dark mode", () => {
    expect(dark.get("--background")).toBe("#0b1220");
    expect(dark.get("--sidebar")).toBe("#0e1626");
    expect(dark.get("--card")).toBe("#111b2e");
    expect(dark.get("--border")).toBe("#1e293b");
    expect(dark.get("--foreground")).toBe("#f1f5f9");
    expect(dark.get("--muted-foreground")).toBe("#94a3b8");
    expect(dark.get("--primary")).toBe("#2563eb");
    expect(dark.get("--sidebar-accent-foreground")).toBe("#bfdbfe");
    expect(dark.get("--status-new-foreground")).toBe("#c4b5fd");
  });

  it("defines every variable in both modes", () => {
    expect([...dark.keys()].sort()).toEqual([...light.keys()].filter((name) => name !== "--radius").sort());
  });

  it("exposes every colour variable to Tailwind", () => {
    const exposed = [...theme.values()];
    for (const name of light.keys()) {
      if (name !== "--radius") {
        expect(exposed).toContain(`var(${name})`);
      }
    }
  });
});
