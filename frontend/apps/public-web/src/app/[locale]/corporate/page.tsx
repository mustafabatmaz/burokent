import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CallToAction, Cards, PageIntro, Section, Steps, type Item } from "@/components/content";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/corporate">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages" });
  const page = await getTranslations({ locale, namespace: "corporate" });
  return { title: t("corporate"), description: page("lead"), alternates: alternates(locale, "/corporate") };
}

export default async function CorporatePage() {
  const t = await getTranslations("corporate");
  return (
    <>
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <Section id="audience" title={t("audience.title")} tone="raised">
        <Cards items={t.raw("audience.items") as Item[]} />
      </Section>
      <Section id="process" title={t("process.title")}>
        <Steps labelledBy="process-title" items={t.raw("process.steps") as Item[]} />
      </Section>
      <Section id="flexible" title={t("flexible.title")} intro={t("flexible.text")} tone="emerald" />
      <CallToAction
        id="corporate-cta"
        title={t("cta.title")}
        text={t("cta.text")}
        primary={{ href: "/quote", label: t("cta.primary") }}
        secondary={{ href: "/workshop", label: t("cta.secondary") }}
      />
    </>
  );
}
