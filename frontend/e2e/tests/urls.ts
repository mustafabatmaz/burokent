export const SITE = "https://burokent.test";
export const PANEL = "https://panel.burokent.test";

export const LOCALES = ["tr", "en", "ar"] as const;

/** Every public page in each language, as the visitor sees its address. */
export const PUBLIC_PAGES = {
  tr: [
    "/tr",
    "/tr/koleksiyon",
    "/tr/kurumsal",
    "/tr/atolyemiz",
    "/tr/projeler",
    "/tr/iletisim",
    "/tr/teklif",
    "/tr/kvkk",
    "/tr/cerez-politikasi",
  ],
  en: [
    "/en",
    "/en/collection",
    "/en/corporate",
    "/en/workshop",
    "/en/projects",
    "/en/contact",
    "/en/quote",
    "/en/privacy",
    "/en/cookie-policy",
  ],
  ar: [
    "/ar",
    "/ar/collection",
    "/ar/corporate",
    "/ar/workshop",
    "/ar/projects",
    "/ar/contact",
    "/ar/quote",
    "/ar/privacy",
    "/ar/cookie-policy",
  ],
} as const;

export function adminCredentials(): { username: string; password: string } {
  const username = process.env.E2E_ADMIN_USERNAME;
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error("Run the tests through infra/e2e/run.sh, which creates the admin user");
  }
  return { username, password };
}
