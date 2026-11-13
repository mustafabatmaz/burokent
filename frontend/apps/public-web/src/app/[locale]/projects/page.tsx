import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import type { Locale } from "@/i18n/routing";
import { alternates } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[locale]/projects">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("projects"), alternates: alternates(locale, "/projects") };
}

export default async function ProjectsPage() {
  const t = await getTranslations("pages");
  return <PlaceholderPage title={t("projects")} />;
}
