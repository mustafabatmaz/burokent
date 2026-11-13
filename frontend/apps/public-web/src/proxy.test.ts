import { NextRequest } from "next/server";
import { getRedirectUrl, unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "./proxy";

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, "http://localhost:3100"), { headers });
}

describe("proxy", () => {
  it.each([
    ["en-US,en;q=0.9", "/en"],
    ["ar-SA,ar;q=0.9", "/ar"],
    ["tr-TR", "/tr"],
    ["de-DE", "/tr"],
  ])("sends a browser preferring %s to %s", (language, target) => {
    expect(getRedirectUrl(proxy(request("/", { "accept-language": language })))).toBe(`http://localhost:3100${target}`);
  });

  it("prefers the language chosen on the site over the browser language", () => {
    const response = proxy(request("/", { "accept-language": "en", cookie: "NEXT_LOCALE=ar" }));

    expect(getRedirectUrl(response)).toBe("http://localhost:3100/ar");
  });

  it("leaves addresses with a language alone", () => {
    expect(getRedirectUrl(proxy(request("/tr/koleksiyon", { "accept-language": "en" })))).toBeNull();
  });

  it("sends no hreflang header; pages declare their alternates", () => {
    expect(proxy(request("/tr")).headers.get("link")).toBeNull();
  });

  it("does not run for static files and the API", () => {
    expect(unstable_doesMiddlewareMatch({ config, url: "/_next/static/chunks/main.js" })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: "/api/public/series" })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: "/brand/favicon.ico" })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: "/en/collection" })).toBe(true);
  });
});
