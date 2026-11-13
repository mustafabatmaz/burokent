import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export interface FakeUser {
  id: number;
  username: string;
  displayName: string;
  superAdmin: boolean;
  permissions: string[];
}

export const TEST_USER: FakeUser = {
  id: 7,
  username: "test-user",
  displayName: "Test Kullanıcı",
  superAdmin: false,
  permissions: ["audit.read"],
};
export const TEST_PASSWORD = "test-user-password";
export const RATE_LIMITED_USERNAME = "rate-limited";

/** State of the fake backend; tests change it to simulate expired tokens and sessions. */
export const backend = {
  user: null as FakeUser | null,
  accessTokenValid: true,
  refreshTokenValid: true,
  refreshCalls: 0,
  logoutCalls: 0,
};

export function resetBackend(): void {
  backend.user = null;
  backend.accessTokenValid = true;
  backend.refreshTokenValid = true;
  backend.refreshCalls = 0;
  backend.logoutCalls = 0;
}

export function logIn(user: FakeUser = TEST_USER): void {
  backend.user = user;
  backend.accessTokenValid = true;
}

function problem(status: number, code: string, headers: Record<string, string> = {}) {
  return HttpResponse.json(
    { type: "about:blank", status, code },
    { status, headers: { "Content-Type": "application/problem+json", ...headers } },
  );
}

export const server = setupServer(
  http.get("*/api/admin/auth/csrf", () => new HttpResponse(null, { status: 204 })),
  http.post("*/api/admin/auth/login", async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string };
    if (body.username === RATE_LIMITED_USERNAME) {
      return problem(429, "too_many_attempts", { "Retry-After": "120" });
    }
    if (body.username === TEST_USER.username && body.password === TEST_PASSWORD) {
      logIn();
      return new HttpResponse(null, { status: 204 });
    }
    return problem(401, "invalid_credentials");
  }),
  http.post("*/api/admin/auth/refresh", () => {
    backend.refreshCalls++;
    if (backend.user && backend.refreshTokenValid) {
      backend.accessTokenValid = true;
      return new HttpResponse(null, { status: 204 });
    }
    return problem(401, "unauthorized");
  }),
  http.post("*/api/admin/auth/logout", () => {
    backend.logoutCalls++;
    backend.user = null;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("*/api/admin/me", () => {
    if (!backend.user || !backend.accessTokenValid) {
      return problem(401, "unauthorized");
    }
    return HttpResponse.json(backend.user);
  }),
);
