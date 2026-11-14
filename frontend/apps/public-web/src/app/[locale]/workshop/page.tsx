import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CallToAction, Cards, PageIntro, Section, Steps, type Item } from "@/components/content";
import { COMPANY } from "@/content/company";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/workshop">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages" });
  const page = await getTranslations({ locale, namespace: "workshop" });
  return { title: t("workshop"), description: page("lead"), alternates: alternates(locale, "/workshop") };
}

export default async function WorkshopPage() {
  const t = await getTranslations("workshop");
  return (
    <>
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <Section id="place" title={t("place.title")} intro={t("place.text")} tone="raised">
        <Cards items={t.raw("place.items") as Item[]} />
      </Section>
      <Section id="craft" title={t("craft.title")} intro={t("craft.text")} tone="emerald" />
      <Section id="custom" title={t("custom.title")} intro={t("custom.text")}>
        <Steps labelledBy="custom-title" items={t.raw("custom.steps") as Item[]} />
      </Section>
      <CallToAction
        id="visit"
        title={t("visit.title")}
        text={t("visit.text", COMPANY.hours)}
        primary={{ href: "/contact", label: t("visit.primary") }}
        secondary={{ href: "/quote", label: t("visit.secondary") }}
      />
    </>
  );
}
