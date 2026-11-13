import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Providers } from "@/components/Providers";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { routing } from "@/i18n/routing";
import { directionOf } from "@/lib/i18n";
import { amiri, cairo, cinzel, playfair } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3100"),
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: t("description"),
    icons: {
      icon: [{ url: "/brand/favicon.ico", sizes: "48x48" }],
      apple: "/brand/ikon-180.png",
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  const t = await getTranslations("nav");
  const direction = directionOf(locale);
  const fonts = [playfair, amiri, cairo, cinzel].map((font) => font.variable).join(" ");

  return (
    <html lang={locale} dir={direction} className={fonts}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:bg-gold focus:px-4 focus:py-2 focus:text-night"
        >
          {t("skipToContent")}
        </a>
        {/* Only the header's client parts need translations in the browser */}
        <NextIntlClientProvider>
          <Providers direction={direction}>
            <SiteHeader />
            <main id="icerik" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
