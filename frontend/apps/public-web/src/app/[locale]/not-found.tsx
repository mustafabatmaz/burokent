import { getTranslations } from "next-intl/server";
import { goldButton } from "@/components/buttons";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-16 md:px-6 md:py-24 lg:px-10">
      <p className="eyebrow">404</p>
      <h1 className="text-4xl md:text-5xl">{t("title")}</h1>
      <p className="max-w-prose text-sand">{t("text")}</p>
      <Link href="/" className={goldButton}>
        {t("home")}
      </Link>
    </section>
  );
}
