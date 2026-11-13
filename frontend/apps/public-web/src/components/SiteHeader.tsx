import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Pathname } from "@/i18n/routing";
import { goldButton } from "./buttons";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";

export const MENU = [
  { href: "/collection", key: "collection" },
  { href: "/corporate", key: "corporate" },
  { href: "/workshop", key: "workshop" },
  { href: "/projects", key: "projects" },
  { href: "/contact", key: "contact" },
] as const satisfies readonly { href: Pathname; key: string }[];

export async function SiteHeader() {
  const t = await getTranslations("nav");
  const site = await getTranslations("site");
  const items = MENU.map((item) => ({ href: item.href, label: t(item.key) }));
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-night/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2 md:px-6 lg:px-10">
        <Link href="/" className="shrink-0">
          {/* At least 120 px wide, as the logo rules require */}
          <Image
            src="/brand/burokent-logo-altin.svg"
            alt={site("name")}
            width={140}
            height={80}
            unoptimized
            priority
            className="h-auto w-[124px] md:w-[140px]"
          />
        </Link>
        <nav aria-label={t("main")} className="ms-6 hidden flex-1 items-center gap-1 lg:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-11 items-center px-3 text-sm text-ivory transition-colors duration-300 hover:text-gold"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          <Link href="/quote" className={goldButton}>
            {t("quote")}
          </Link>
          <MobileMenu
            items={items}
            labels={{ menu: t("menu"), close: t("closeMenu"), main: t("main"), quote: t("quote") }}
          />
        </div>
      </div>
    </header>
  );
}
