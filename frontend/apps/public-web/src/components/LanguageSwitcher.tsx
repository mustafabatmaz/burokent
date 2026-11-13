"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const SHORT = { tr: "TR", en: "EN", ar: "ع" } as const;

/** Links to the same page in the other languages. */
export function LanguageSwitcher() {
  const t = useTranslations("languages");
  const label = useTranslations("nav")("language");
  const current = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex items-center gap-1 text-sm">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          lang={locale}
          hrefLang={locale}
          aria-label={t(locale)}
          aria-current={locale === current ? "true" : undefined}
          className="flex min-h-11 min-w-11 items-center justify-center text-sand hover:text-gold aria-[current]:text-gold"
        >
          {SHORT[locale]}
        </Link>
      ))}
    </nav>
  );
}
