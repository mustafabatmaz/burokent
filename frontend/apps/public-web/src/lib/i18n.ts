import { getPathname } from "@/i18n/navigation";
import { routing, type Locale, type Pathname } from "@/i18n/routing";

export function directionOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Canonical address and hreflang alternates of a page; visitors of other languages get English. */
export function alternates(locale: Locale, href: Pathname) {
  const languages = Object.fromEntries(routing.locales.map((other) => [other, getPathname({ locale: other, href })]));
  return {
    canonical: getPathname({ locale, href }),
    languages: { ...languages, "x-default": getPathname({ locale: "en", href }) },
  };
}
