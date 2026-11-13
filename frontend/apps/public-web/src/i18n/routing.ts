import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "en", "ar"],
  defaultLocale: "tr",
  localePrefix: "always",
  // hreflang links come from each page's metadata, with English as x-default
  alternateLinks: false,
  // Folders use the English names; Turkish addresses are translated, Arabic ones use the English addresses
  pathnames: {
    "/": "/",
    "/collection": { tr: "/koleksiyon", en: "/collection", ar: "/collection" },
    "/corporate": { tr: "/kurumsal", en: "/corporate", ar: "/corporate" },
    "/workshop": { tr: "/atolyemiz", en: "/workshop", ar: "/workshop" },
    "/projects": { tr: "/projeler", en: "/projects", ar: "/projects" },
    "/contact": { tr: "/iletisim", en: "/contact", ar: "/contact" },
    "/quote": { tr: "/teklif", en: "/quote", ar: "/quote" },
    "/privacy": { tr: "/kvkk", en: "/privacy", ar: "/privacy" },
    "/cookie-policy": { tr: "/cerez-politikasi", en: "/cookie-policy", ar: "/cookie-policy" },
  },
});

export type Locale = (typeof routing.locales)[number];
export type Pathname = keyof typeof routing.pathnames;
