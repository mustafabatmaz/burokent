import { getTranslations } from "next-intl/server";

/** A page whose content arrives with the catalogue; only its title for now, no invented details. */
export async function PlaceholderPage({ title }: { title: string }) {
  const t = await getTranslations("placeholder");
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24 lg:px-10">
      <h1 className="text-4xl md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-prose text-sand">{t("text")}</p>
    </section>
  );
}
