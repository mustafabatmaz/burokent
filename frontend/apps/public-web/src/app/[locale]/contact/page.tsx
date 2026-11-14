import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CallToAction, Cards, PageIntro, Section, type Item } from "@/components/content";
import { COMPANY, contactLines } from "@/content/company";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages" });
  const page = await getTranslations({ locale, namespace: "contact" });
  return { title: t("contact"), description: page("lead"), alternates: alternates(locale, "/contact") };
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const locale = (await params).locale as Locale;
  const t = await getTranslations("contact");
  return (
    <>
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <Section id="details" title={t("details.title")} tone="raised">
        <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {contactLines(COMPANY).map((line) => (
            <div key={line.kind} className="flex flex-col gap-2 border-t border-gold pt-4">
              <dt className="eyebrow">{t(`details.${line.kind}`)}</dt>
              <dd className="text-lg">
                {line.href ? (
                  // Addresses and numbers read left to right in every language
                  <a href={line.href} dir="ltr" className="break-all hover:text-gold">
                    {line.value}
                  </a>
                ) : (
                  <span dir={line.kind === "hours" ? "ltr" : undefined}>{line.value}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      {/* Installation abroad is taught, not done there: only for visitors reading in English or Arabic */}
      {locale !== "tr" && (
        <Section id="abroad" title={t("abroad.title")} intro={t("abroad.text")} tone="emerald">
          <Cards items={t.raw("abroad.items") as Item[]} />
        </Section>
      )}
      <CallToAction
        id="contact-cta"
        title={t("cta.title")}
        text={t("cta.text")}
        primary={{ href: "/quote", label: t("cta.primary") }}
      />
    </>
  );
}
