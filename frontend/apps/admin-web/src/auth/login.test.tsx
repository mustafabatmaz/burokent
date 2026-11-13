import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { messages } from "../messages.ts";
import { RATE_LIMITED_USERNAME, server, TEST_PASSWORD, TEST_USER } from "../test/server.ts";
import { renderApp } from "../test/render.tsx";

async function submitLogin(username: string, password: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(messages.login.username), username);
  await user.type(screen.getByLabelText(messages.login.password), password);
  await user.click(screen.getByRole("button", { name: messages.login.submit }));
}

describe("login", () => {
  it("opens the dashboard with valid credentials", async () => {
    renderApp("/giris");

    await submitLogin(TEST_USER.username, TEST_PASSWORD);

    expect(await screen.findByRole("heading", { name: messages.dashboard.title })).toBeInTheDocument();
  });

  it("still logs in when the CSRF cookie could not be fetched at first", async () => {
    let csrfCalls = 0;
    server.use(
      http.get("*/api/admin/auth/csrf", () => {
        csrfCalls++;
        return csrfCalls === 1 ? new HttpResponse(null, { status: 502 }) : new HttpResponse(null, { status: 204 });
      }),
    );
    document.cookie = "XSRF-TOKEN=; max-age=0";
    renderApp("/giris");

    await submitLogin(TEST_USER.username, TEST_PASSWORD);

    expect(await screen.findByRole("heading", { name: messages.dashboard.title })).toBeInTheDocument();
    expect(csrfCalls).toBeGreaterThan(1);
  });

  it("shows a Turkish error for wrong credentials", async () => {
    renderApp("/giris");

    await submitLogin(TEST_USER.username, "wrong-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(messages.login.errors.invalidCredentials);
  });

  it("tells how long to wait when rate limited", async () => {
    renderApp("/giris");

    await submitLogin(RATE_LIMITED_USERNAME, "any-password");

    expect(await screen.findByRole("alert")).toHaveTextContent(messages.login.errors.tooManyAttempts(2));
  });

  it("sends a logged-out visitor to the login page and back afterwards", async () => {
    const { router } = renderApp("/bilinmeyen-sayfa");

    expect(await screen.findByLabelText(messages.login.username)).toBeInTheDocument();
    expect(router.state.location.search).toBe("?sonra=%2Fbilinmeyen-sayfa");

    await submitLogin(TEST_USER.username, TEST_PASSWORD);

    expect(await screen.findByRole("heading", { name: messages.notFound.title })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/bilinmeyen-sayfa");
  });
});
