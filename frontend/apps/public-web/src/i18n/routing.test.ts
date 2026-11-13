import { describe, expect, it } from "vitest";
import { getPathname } from "./navigation";
import { routing } from "./routing";

// The addresses agreed for each page (Turkish, English; Arabic uses the English ones)
const ADDRESSES = {
  "/": ["/tr", "/en"],
  "/collection": ["/tr/koleksiyon", "/en/collection"],
  "/corporate": ["/tr/kurumsal", "/en/corporate"],
  "/workshop": ["/tr/atolyemiz", "/en/workshop"],
  "/projects": ["/tr/projeler", "/en/projects"],
  "/contact": ["/tr/iletisim", "/en/contact"],
  "/quote": ["/tr/teklif", "/en/quote"],
  "/privacy": ["/tr/kvkk", "/en/privacy"],
  "/cookie-policy": ["/tr/cerez-politikasi", "/en/cookie-policy"],
} as const;

describe("routing", () => {
  it("serves Turkish, English and Arabic with Turkish as the default", () => {
    expect(routing.locales).toEqual(["tr", "en", "ar"]);
    expect(routing.defaultLocale).toBe("tr");
  });

  it.each(Object.entries(ADDRESSES))("maps %s to the agreed addresses", (href, [turkish, english]) => {
    const page = href as keyof typeof ADDRESSES;
    expect(getPathname({ locale: "tr", href: page })).toBe(turkish);
    expect(getPathname({ locale: "en", href: page })).toBe(english);
    expect(getPathname({ locale: "ar", href: page })).toBe(english.replace(/^\/en/, "/ar"));
  });

  it("covers every page", () => {
    expect(Object.keys(routing.pathnames ?? {}).sort()).toEqual(Object.keys(ADDRESSES).sort());
  });
});
