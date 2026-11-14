import { expect, test } from "@playwright/test";
import { LOCALES, PUBLIC_PAGES, SITE } from "./urls";

test.describe("public site", () => {
  for (const locale of LOCALES) {
    test(`every page answers in ${locale}`, async ({ page }) => {
      for (const path of PUBLIC_PAGES[locale]) {
        const response = await page.goto(SITE + path);
        expect(response?.status(), path).toBe(200);
        await expect(page.locator("h1")).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
      }
    });
  }

  test("sends visitors to their browser's language", async ({ browser }) => {
    // The browser locale sets Accept-Language
    const context = await browser.newContext({ ignoreHTTPSErrors: true, locale: "ar-SA" });
    const page = await context.newPage();

    await page.goto(SITE + "/");

    await expect(page).toHaveURL(`${SITE}/ar`);
    await context.close();
  });

  test("the language switcher keeps the page", async ({ page }) => {
    await page.goto(SITE + "/tr/koleksiyon");

    await page.getByRole("link", { name: "العربية" }).first().click();

    await expect(page).toHaveURL(`${SITE}/ar/collection`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("unknown addresses are a real 404", async ({ page }) => {
    const response = await page.goto(SITE + "/tr/olmayan-sayfa");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
  });

  test("the corporate page walks through the process, on-site survey included", async ({ page }) => {
    await page.goto(SITE + "/tr/kurumsal");

    const steps = page.getByRole("list", { name: "Nasıl çalışıyoruz" }).getByRole("listitem");
    await expect(steps).toHaveCount(5);
    await expect(steps.nth(1)).toContainText("Keşif ve ölçü");
    await expect(page.getByRole("link", { name: "Teklif İste" }).last()).toHaveAttribute("href", "/tr/teklif");
  });

  for (const locale of LOCALES) {
    test(`contact details in ${locale}, and the section for customers abroad only in English and Arabic`, async ({
      page,
    }) => {
      await page.goto(`${SITE}/${locale}/${locale === "tr" ? "iletisim" : "contact"}`);

      await expect(page.locator('main a[href="mailto:info@burokent.com"]')).toBeVisible();
      await expect(page.locator("main")).toContainText("08:00–18:00");
      await expect(page.locator("#abroad")).toHaveCount(locale === "tr" ? 0 : 1);
    });

    test(`the privacy notice lists all nine rights in ${locale}`, async ({ page }) => {
      await page.goto(`${SITE}/${locale}/${locale === "tr" ? "kvkk" : "privacy"}`);

      await expect(page.locator("#rights li")).toHaveCount(9);
      await expect(page.locator("#controller")).toContainText("info@burokent.com");
    });
  }

  test("the Arabic corporate page looks as approved", async ({ page }) => {
    await page.goto(SITE + "/ar/corporate");
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot("ar-corporate.png", { fullPage: true });
  });

  test("the Arabic home page looks as approved", async ({ page }) => {
    await page.goto(SITE + "/ar");
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot("ar-home.png", { fullPage: true });
  });

  test("the Arabic phone menu looks as approved", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(SITE + "/ar");
    await page.evaluate(() => document.fonts.ready);

    await page.getByRole("button", { name: "القائمة" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await expect(page).toHaveScreenshot("ar-phone-menu.png");
  });
});
