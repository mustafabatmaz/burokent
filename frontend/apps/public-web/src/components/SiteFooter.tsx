import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { MENU } from "./SiteHeader";

export async function SiteFooter() {
  const t = await getTranslations("nav");
  const footer = await getTranslations("footer");
  const site = await getTranslations("site");
  return (
    <footer className="border-t border-line bg-night-raised">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 md:px-6 lg:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <Image
            src="/brand/burokent-logo-altin.svg"
            alt={site("name")}
            width={160}
            height={91}
            unoptimized
            className="h-auto w-40"
          />
          <nav aria-label={t("footer")} className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-3">
            {MENU.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center text-sm text-sand hover:text-gold"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-6 text-sm text-sand md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {site("name")}. {footer("rights")}
          </p>
          <nav aria-label={t("legal")} className="flex flex-wrap gap-x-6">
            <Link href="/privacy" className="flex min-h-11 items-center hover:text-gold">
              {t("privacy")}
            </Link>
            <Link href="/cookie-policy" className="flex min-h-11 items-center hover:text-gold">
              {t("cookies")}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
