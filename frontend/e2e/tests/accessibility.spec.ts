import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { adminCredentials, LOCALES, PANEL, PUBLIC_PAGES, SITE } from "./urls";

// WCAG 2.1 level AA, the target the design guide sets
const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
  return results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map((node) => node.target.join(" ")),
  }));
}

test.describe("accessibility", () => {
  for (const locale of LOCALES) {
    test(`public pages in ${locale}`, async ({ page }) => {
      for (const path of [...PUBLIC_PAGES[locale], `/${locale}/olmayan-sayfa`]) {
        await page.goto(SITE + path);
        expect(await violations(page), path).toEqual([]);
      }
    });

    test(`public phone menu in ${locale}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${SITE}/${locale}`);
      await page.locator("header button").click();
      await expect(page.getByRole("dialog")).toBeVisible();

      expect(await violations(page)).toEqual([]);
    });
  }

  test("admin panel", async ({ page }) => {
    await page.goto(PANEL + "/giris");
    expect(await violations(page), "login").toEqual([]);

    const admin = adminCredentials();
    await page.getByLabel("Kullanıcı adı").fill(admin.username);
    await page.getByLabel("Şifre").fill(admin.password);
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

    for (const path of ["/", "/kullanicilar", "/kullanicilar/roller", "/aktivite", "/hesap/sifre"]) {
      await page.goto(PANEL + path);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(await violations(page), path).toEqual([]);
    }
  });
});
