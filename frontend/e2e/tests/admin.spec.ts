import { expect, test, type Page } from "@playwright/test";
import { adminCredentials, PANEL } from "./urls";

async function logIn(page: Page, username: string, password: string) {
  await page.goto(PANEL + "/giris");
  await page.getByLabel("Kullanıcı adı").fill(username);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
}

async function logOut(page: Page) {
  await page.getByRole("button", { name: /^Kullanıcı menüsü/ }).click();
  await page.getByRole("menuitem", { name: "Çıkış yap" }).click();
  await expect(page.getByLabel("Kullanıcı adı")).toBeVisible();
}

test.describe("admin panel", () => {
  test("rejects a wrong password", async ({ page }) => {
    await logIn(page, adminCredentials().username, "not-the-password");

    await expect(page.getByRole("alert")).toHaveText("Kullanıcı adı veya şifre hatalı.");
  });

  test("the super admin creates a user who cannot open the user list without a role", async ({ page }) => {
    const admin = adminCredentials();
    const username = `e2e-${Date.now()}`;
    const password = "uçtan uca test şifresi";

    await logIn(page, admin.username, admin.password);
    await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

    await page.goto(PANEL + "/kullanicilar/yeni");
    await page.getByLabel(/Kullanıcı adı/).fill(username);
    await page.getByLabel(/Görünen ad/).fill("Uçtan Uca");
    await page.getByLabel(/^Şifre/).fill(password);
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByText("Kullanıcı oluşturuldu.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Uçtan Uca" })).toBeVisible();

    await logOut(page);
    await logIn(page, username, password);
    await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

    await page.goto(PANEL + "/kullanicilar");
    await expect(page.getByRole("heading", { name: "Bu sayfayı görme yetkiniz yok" })).toBeVisible();
  });

  test("reports the backend's health for uptime monitoring, without details", async ({ request }) => {
    const response = await request.get(PANEL + "/api/health");

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "UP" });
  });
});
