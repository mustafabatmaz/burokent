import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { formatDate, LegalDocument, LegalSection } from "@/components/content";
import { COMPANY, LEGAL_UPDATED } from "@/content/company";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/cookie-policy">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("cookiePolicy"), alternates: alternates(locale, "/cookie-policy") };
}

interface CookieRow {
  name: string;
  purpose: string;
  duration: string;
  provider: string;
}

const COLUMNS = ["name", "purpose", "duration", "provider"] as const;

export default async function CookiePolicyPage({ params }: PageProps<"/[locale]/cookie-policy">) {
  const locale = (await params).locale as Locale;
  const t = await getTranslations("cookies");
  const rows = t.raw("used.rows") as CookieRow[];

  return (
    <LegalDocument
      title={t("title")}
      lead={t("lead")}
      updated={t("updated", { date: formatDate(LEGAL_UPDATED, locale) })}
    >
      <LegalSection id="what" title={t("what.title")} text={t("what.text")} />
      <LegalSection id="used" title={t("used.title")} text={t("used.text")}>
        {/* A table on wide screens; on phones each cookie becomes a small block */}
        <table className="w-full border-collapse text-start text-sm">
          <caption className="sr-only">{t("used.title")}</caption>
          <thead className="hidden md:table-header-group">
            <tr className="border-b border-line">
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="py-3 pe-4 text-start font-semibold text-ivory">
                  {t(`used.columns.${column}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="flex flex-col gap-1 border-b border-line py-4 md:table-row md:py-0">
                {COLUMNS.map((column) => (
                  <td key={column} className="text-sand md:py-3 md:pe-4 md:align-top">
                    <span className="font-semibold text-ivory md:hidden">{t(`used.columns.${column}`)}: </span>
                    {column === "name" ? (
                      <code dir="ltr" className="text-ivory">
                        {row.name}
                      </code>
                    ) : (
                      row[column]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </LegalSection>
      <LegalSection id="none" title={t("none.title")} text={t("none.text")} />
      <LegalSection id="manage" title={t("manage.title")} text={t("manage.text")} />
      <LegalSection
        id="more"
        title={t("more.title")}
        text={t.rich("more.text", {
          address: COMPANY.email,
          email: (chunks) => (
            <a href={`mailto:${COMPANY.email}`} dir="ltr" className="text-gold underline underline-offset-4">
              {chunks}
            </a>
          ),
        })}
      >
        <Link href="/privacy" className="self-start text-gold underline underline-offset-4 hover:text-gold-light">
          {t("more.link")}
        </Link>
      </LegalSection>
    </LegalDocument>
  );
}
