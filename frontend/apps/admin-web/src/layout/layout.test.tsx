import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { messages } from "../messages.ts";
import { backend, logIn, TEST_USER } from "../test/server.ts";
import { renderApp } from "../test/render.tsx";

describe("layout", () => {
  it("shows the user and the dashboard in the navigation", async () => {
    logIn();
    renderApp("/");

    const navigation = await screen.findByRole("navigation", { name: messages.layout.navigation });
    expect(within(navigation).getByRole("link", { name: messages.dashboard.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: messages.layout.userMenu(TEST_USER.displayName) })).toBeInTheDocument();
  });

  it("uses the short label in the phone's bottom tabs", async () => {
    logIn();
    renderApp("/");

    const tabs = await screen.findByRole("navigation", { name: messages.layout.tabs });
    expect(within(tabs).getByRole("link", { name: messages.layout.dashboardTab })).toBeInTheDocument();
  });

  it("logs out from the user menu", async () => {
    logIn();
    renderApp("/");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: messages.layout.userMenu(TEST_USER.displayName) }));
    await user.click(await screen.findByRole("menuitem", { name: messages.layout.logout }));

    expect(await screen.findByLabelText(messages.login.username)).toBeInTheDocument();
    expect(backend.logoutCalls).toBe(1);
  });

  it("shows a not found page for unknown addresses", async () => {
    logIn();
    renderApp("/olmayan-adres");

    expect(await screen.findByRole("heading", { name: messages.notFound.title })).toBeInTheDocument();
  });
});
