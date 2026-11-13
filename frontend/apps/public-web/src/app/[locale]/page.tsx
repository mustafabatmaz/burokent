import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { goldButton, outlineButton } from "@/components/buttons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternates(locale as Locale, "/") };
}

export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 md:px-6 md:py-24 lg:px-10">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="max-w-3xl text-[clamp(44px,6vw,84px)]">{t("title")}</h1>
      <p className="max-w-prose text-lg text-sand">{t("text")}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/quote" className={goldButton}>
          {t("primary")}
        </Link>
        <Link href="/collection" className={outlineButton}>
          {t("secondary")}
        </Link>
      </div>
    </section>
  );
}
