import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { formatDate, LegalDocument, LegalSection } from "@/components/content";
import { COMPANY, controllerName, LEGAL_UPDATED } from "@/content/company";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("privacy"), alternates: alternates(locale, "/privacy") };
}

// The sections of the notice that are lists
type ListSection = "data" | "purposes" | "legalBasis" | "transfer" | "retention" | "rights";

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const locale = (await params).locale as Locale;
  const t = await getTranslations("privacy");
  const site = await getTranslations("site");
  const list = (key: ListSection) => t.raw(`${key}.items`) as string[];
  const email = COMPANY.email;

  return (
    <LegalDocument
      title={t("title")}
      lead={t("lead")}
      updated={t("updated", { date: formatDate(LEGAL_UPDATED, locale) })}
    >
      <LegalSection
        id="controller"
        title={t("controller.title")}
        text={t.rich("controller.text", {
          controller: controllerName(COMPANY, site("name")),
          address: email,
          email: (chunks) => <EmailLink email={email}>{chunks}</EmailLink>,
        })}
      />
      <LegalSection id="data" title={t("data.title")} text={t("data.text")} items={list("data")} />
      <LegalSection id="purposes" title={t("purposes.title")} items={list("purposes")} />
      <LegalSection
        id="legal-basis"
        title={t("legalBasis.title")}
        text={t("legalBasis.text")}
        items={list("legalBasis")}
        note={t("legalBasis.note")}
      />
      <LegalSection id="collection" title={t("collection.title")} text={t("collection.text")} />
      <LegalSection
        id="transfer"
        title={t("transfer.title")}
        text={t("transfer.text")}
        items={list("transfer")}
        note={t("transfer.note")}
      />
      <LegalSection id="retention" title={t("retention.title")} items={list("retention")} />
      <LegalSection id="rights" title={t("rights.title")} text={t("rights.text")} items={list("rights")} />
      <LegalSection
        id="application"
        title={t("application.title")}
        text={t.rich("application.text", {
          address: email,
          email: (chunks) => <EmailLink email={email}>{chunks}</EmailLink>,
        })}
      />
    </LegalDocument>
  );
}

function EmailLink({ email, children }: { email: string; children: ReactNode }) {
  return (
    <a href={`mailto:${email}`} dir="ltr" className="text-gold underline underline-offset-4 hover:text-gold-light">
      {children}
    </a>
  );
}
