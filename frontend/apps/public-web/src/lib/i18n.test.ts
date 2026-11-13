import { describe, expect, it } from "vitest";
import { alternates, directionOf } from "./i18n";

describe("alternates", () => {
  it("lists every language and English as the default for other visitors", () => {
    expect(alternates("tr", "/collection")).toEqual({
      canonical: "/tr/koleksiyon",
      languages: {
        tr: "/tr/koleksiyon",
        en: "/en/collection",
        ar: "/ar/collection",
        "x-default": "/en/collection",
      },
    });
  });
});

describe("directionOf", () => {
  it("is right-to-left only for Arabic", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("tr")).toBe("ltr");
    expect(directionOf("en")).toBe("ltr");
  });
});
