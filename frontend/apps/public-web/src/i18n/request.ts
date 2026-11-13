import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { routing, type Locale } from "./routing";

const messages = {
  tr: () => import("../../messages/tr.json"),
  en: () => import("../../messages/en.json"),
  ar: () => import("../../messages/ar.json"),
} satisfies Record<Locale, () => Promise<unknown>>;

// The page language comes from the [locale] segment (read through next/root-params), so pages need no
// setRequestLocale call. Unknown prefixes are a 404.
export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const fromPath = await rootParams.locale();
    if (!hasLocale(routing.locales, fromPath)) {
      notFound();
    }
    locale = fromPath;
  }
  return { locale, timeZone: "Europe/Istanbul", messages: (await messages[locale]()).default };
});
