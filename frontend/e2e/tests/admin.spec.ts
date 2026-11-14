import { expect, test, type Page } from "@playwright/test";
import { adminCredentials, PANEL, SITE } from "./urls";

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
    const health = (await response.json()) as Record<string, unknown>;
    expect(health.status).toBe("UP");
    expect(health).not.toHaveProperty("components");
    expect(health).not.toHaveProperty("details");
  });

  test("an image bigger than nginx's default limit uploads through the panel and is served on the site", async ({
    page,
  }) => {
    const admin = adminCredentials();
    await logIn(page, admin.username, admin.password);
    await expect(page.getByRole("heading", { name: "Gösterge Paneli" })).toBeVisible();

    // Random noise barely compresses: a JPEG of several megabytes, as a phone photo would be. Uploaded from the
    // panel's own page, so the session and CSRF cookies are the real ones
    const result = await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = 1200;
      const context = canvas.getContext("2d")!;
      const pixels = context.createImageData(canvas.width, canvas.height);
      for (let i = 0; i < pixels.data.length; i++) {
        pixels.data[i] = i % 4 === 3 ? 255 : Math.floor(Math.random() * 256);
      }
      context.putImageData(pixels, 0, 0);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 1));
      const csrf = /(?:^|; )XSRF-TOKEN=([^;]*)/.exec(document.cookie)?.[1] ?? "";
      const form = new FormData();
      form.append("file", blob, "e2e-noise.jpg");
      const response = await fetch("/api/admin/media", {
        method: "POST",
        body: form,
        headers: { "X-XSRF-TOKEN": decodeURIComponent(csrf) },
      });
      return { size: blob.size, status: response.status, body: (await response.json()) as Record<string, unknown> };
    });

    expect(result.size).toBeGreaterThan(1024 * 1024);
    expect(result.status).toBe(201);
    expect(result.body.width).toBe(1800);

    const image = await page.request.get(SITE + String(result.body.url));
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/jpeg");
    expect(image.headers()["cache-control"]).toContain("immutable");
    const thumbnail = await page.request.get(SITE + String(result.body.thumbnailUrl));
    expect(thumbnail.status()).toBe(200);
  });
});
