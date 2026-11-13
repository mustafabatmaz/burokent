import { describe, expect, it } from "vitest";
import { createAdminClient } from "../src/admin.ts";

function recordingFetch() {
  const requests: Request[] = [];
  const fetch = (input: Request) => {
    requests.push(input);
    return Promise.resolve(new Response(null, { status: 204 }));
  };
  return { requests, fetch: fetch as typeof globalThis.fetch };
}

describe("admin client", () => {
  it("sends the CSRF token from the cookie on state-changing requests", async () => {
    const { requests, fetch } = recordingFetch();
    const client = createAdminClient({
      baseUrl: "http://localhost",
      fetch,
      getCookies: () => "theme=dark; XSRF-TOKEN=abc-123",
    });

    await client.POST("/api/admin/auth/logout");

    expect(requests[0]?.headers.get("X-XSRF-TOKEN")).toBe("abc-123");
  });

  it("does not send the CSRF token on reads", async () => {
    const { requests, fetch } = recordingFetch();
    const client = createAdminClient({ baseUrl: "http://localhost", fetch, getCookies: () => "XSRF-TOKEN=abc-123" });

    await client.GET("/api/admin/auth/csrf");

    expect(requests[0]?.headers.has("X-XSRF-TOKEN")).toBe(false);
  });

  it("decodes the cookie value and works without a token", async () => {
    const { requests, fetch } = recordingFetch();
    const encoded = createAdminClient({ baseUrl: "http://localhost", fetch, getCookies: () => "XSRF-TOKEN=a%2Fb" });
    const missing = createAdminClient({ baseUrl: "http://localhost", fetch, getCookies: () => "" });

    await encoded.POST("/api/admin/auth/logout");
    await missing.POST("/api/admin/auth/logout");

    expect(requests[0]?.headers.get("X-XSRF-TOKEN")).toBe("a/b");
    expect(requests[1]?.headers.has("X-XSRF-TOKEN")).toBe(false);
  });

  it("sends cookies only to the same origin", async () => {
    const { requests, fetch } = recordingFetch();
    const client = createAdminClient({ baseUrl: "http://localhost", fetch, getCookies: () => "" });

    await client.GET("/api/admin/me");

    expect(requests[0]?.credentials).toBe("same-origin");
  });
});
