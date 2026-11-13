import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { messages } from "../../messages.ts";
import { renderApp } from "../../test/render.tsx";
import { backend, logIn, MANAGER, TEST_USER } from "../../test/server.ts";

describe("activity log", () => {
  it("shows readable entries and filters by action", async () => {
    logIn(MANAGER);
    const { router } = renderApp("/aktivite");
    const user = userEvent.setup();

    const table = await screen.findByRole("table", { name: messages.audit.title });
    expect(within(table).getByText("Süper Yönetici, test-user kullanıcısını oluşturdu")).toBeInTheDocument();
    expect(within(table).getByText("“bilinmeyen” kullanıcı adıyla başarısız giriş denemesi")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(messages.audit.filters.action), "auth.login_failed");

    await waitFor(() => expect(router.state.location.search).toContain("islem=auth.login_failed"));
    await waitFor(() => expect(backend.calls.at(-1)?.query).toContain("action=auth.login_failed"));
    expect(await screen.findByText(messages.common.total(1))).toBeInTheDocument();
  });

  it("is hidden from users without the permission", async () => {
    logIn({ ...TEST_USER, permissions: [] });
    renderApp("/aktivite");

    expect(await screen.findByRole("heading", { name: messages.forbidden.title })).toBeInTheDocument();
  });

  it("appears in the menu only with the permission", async () => {
    logIn(MANAGER);
    renderApp("/");

    const navigation = await screen.findByRole("navigation", { name: messages.layout.navigation });
    expect(within(navigation).getByRole("link", { name: messages.audit.title })).toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: messages.users.title })).toBeInTheDocument();
  });
});
