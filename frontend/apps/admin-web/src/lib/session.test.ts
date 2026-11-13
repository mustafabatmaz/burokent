import { describe, expect, it, vi } from "vitest";
import { backend, logIn } from "../test/server.ts";
import { api, onSessionExpired } from "./api.ts";

describe("session refresh", () => {
  it("refreshes once and retries the request when the access token expired", async () => {
    logIn();
    backend.accessTokenValid = false;

    const { response } = await api.GET("/api/admin/me");

    expect(response.status).toBe(200);
    expect(backend.refreshCalls).toBe(1);
  });

  it("shares one refresh between requests that fail at the same time", async () => {
    logIn();
    backend.accessTokenValid = false;

    const results = await Promise.all([api.GET("/api/admin/me"), api.GET("/api/admin/me"), api.GET("/api/admin/me")]);

    expect(results.map(({ response }) => response.status)).toEqual([200, 200, 200]);
    expect(backend.refreshCalls).toBe(1);
  });

  it("ends the session when the refresh token is no longer valid", async () => {
    logIn();
    backend.accessTokenValid = false;
    backend.refreshTokenValid = false;
    const expired = vi.fn();
    onSessionExpired(expired);

    const { response } = await api.GET("/api/admin/me");

    expect(response.status).toBe(401);
    expect(expired).toHaveBeenCalledOnce();
  });

  it("does not try to refresh failed logins", async () => {
    await api.POST("/api/admin/auth/login", { body: { username: "nobody", password: "wrong" } });

    expect(backend.refreshCalls).toBe(0);
  });
});
