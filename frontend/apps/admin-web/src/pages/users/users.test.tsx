import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { messages } from "../../messages.ts";
import { renderApp } from "../../test/render.tsx";
import { backend, logIn, MANAGER, server, SUPER_ADMIN } from "../../test/server.ts";

const table = () => screen.findByRole("table", { name: messages.users.tabUsers });

describe("users", () => {
  it("lists users with their role and status", async () => {
    logIn(SUPER_ADMIN);
    renderApp("/kullanicilar");

    const rows = within(await table()).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[2]!).getByText("Yönetici")).toBeInTheDocument();
    expect(within(rows[1]!).getByText(messages.users.superAdmin)).toBeInTheDocument();
  });

  it("shows the create button only with the manage permission", async () => {
    logIn(MANAGER);
    renderApp("/kullanicilar");

    await table();
    expect(screen.queryByRole("link", { name: messages.users.new })).not.toBeInTheDocument();
  });

  it("creates a user and shows server errors under the fields", async () => {
    logIn(SUPER_ADMIN);
    const { router } = renderApp("/kullanicilar/yeni");
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/Kullanıcı adı/), "test-user");
    await user.type(screen.getByLabelText(/Görünen ad/), "Yeni Kişi");
    await user.type(screen.getByLabelText(/^Şifre/), "bir-uzun-sifre-cumlesi");
    await user.click(screen.getByRole("button", { name: messages.common.save }));
    expect(await screen.findByText(messages.errors.username_taken!)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Kullanıcı adı/));
    await user.type(screen.getByLabelText(/Kullanıcı adı/), "yeni-kisi");
    await user.selectOptions(screen.getByLabelText(/^Rol/), "Yönetici");
    await user.click(screen.getByRole("button", { name: messages.common.save }));

    expect(await screen.findByText(messages.users.created)).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/kullanicilar\/\d+$/));
    const created = backend.calls.filter((call) => call.method === "POST" && call.path === "/api/admin/users");
    expect(created.at(-1)?.body).toMatchObject({ username: "yeni-kisi", roleId: 1 });
  });

  it("asks before leaving a form with unsaved changes", async () => {
    logIn(SUPER_ADMIN);
    const { router } = renderApp("/kullanicilar/yeni");
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/Görünen ad/), "Yarım kalan");
    await user.click(screen.getAllByRole("link", { name: messages.dashboard.title })[0]!);

    expect(await screen.findByRole("alertdialog")).toHaveTextContent(messages.common.unsavedTitle);
    await user.click(screen.getByRole("button", { name: messages.common.stay }));
    expect(router.state.location.pathname).toBe("/kullanicilar/yeni");
  });

  it("edits a user and handles a concurrent change", async () => {
    logIn(SUPER_ADMIN);
    renderApp("/kullanicilar/7");
    const user = userEvent.setup();

    const name = await screen.findByLabelText(/Görünen ad/);
    await waitFor(() => expect(name).toHaveValue("Test Kullanıcı"));
    backend.users.find((record) => record.id === 7)!.version = 5;
    await user.clear(name);
    await user.type(name, "Yeni Ad");
    await user.click(screen.getByRole("button", { name: messages.common.save }));

    expect(await screen.findByRole("alertdialog")).toHaveTextContent(messages.common.conflictTitle);
    await user.click(screen.getByRole("button", { name: messages.common.reload }));
    await user.clear(screen.getByLabelText(/Görünen ad/));
    await user.type(screen.getByLabelText(/Görünen ad/), "Yeni Ad");
    await user.click(screen.getByRole("button", { name: messages.common.save }));

    expect(await screen.findByText(messages.users.updated)).toBeInTheDocument();
    expect(backend.calls.filter((call) => call.method === "PUT").at(-1)?.body).toMatchObject({ version: 5 });
  });

  it("shows the user's role even when the role list arrives later", async () => {
    server.use(
      http.get("*/api/admin/roles", async () => {
        await delay(100);
        return HttpResponse.json(backend.roles);
      }),
    );
    logIn(SUPER_ADMIN);
    renderApp("/kullanicilar/7");

    const role = await screen.findByLabelText(/^Rol/);
    await waitFor(() => expect(role).toHaveValue("1"));
  });

  it("archives a user after confirmation", async () => {
    logIn(SUPER_ADMIN);
    renderApp("/kullanicilar/7");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: messages.users.actions.archive }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(messages.users.confirmArchive("Test Kullanıcı"));
    await user.click(within(dialog).getByRole("button", { name: messages.users.actions.archive }));

    expect(await screen.findByText(messages.users.archivedToast)).toBeInTheDocument();
    expect(backend.calls.some((call) => call.path === "/api/admin/users/7/archive")).toBe(true);
  });

  it("does not offer changes to the super admin", async () => {
    logIn(SUPER_ADMIN);
    renderApp("/kullanicilar/1");

    expect(await screen.findByText(messages.users.superAdminNote)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: messages.common.save })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: messages.users.actions.archive })).not.toBeInTheDocument();
  });

  it("shows the record's history", async () => {
    logIn(SUPER_ADMIN);
    renderApp("/kullanicilar/7");

    const history = await screen.findByRole("region", { name: messages.audit.history });
    const tabs = screen.getByRole("navigation", { name: messages.users.title });
    expect(within(tabs).getByRole("link", { name: messages.users.tabUsers })).toHaveAttribute("aria-current", "page");
    expect(await within(history).findByText("Süper Yönetici, test-user kullanıcısını oluşturdu")).toBeInTheDocument();
  });
});

describe("roles", () => {
  it("offers only delegable permissions and saves the selection", async () => {
    logIn(SUPER_ADMIN);
    const { router } = renderApp("/kullanicilar/roller/yeni");
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/Rol adı/), "Depo");
    const manage = await screen.findByText(messages.permissions["identity.manage"]!.label);
    expect(within(manage.closest("li")!).queryByRole("checkbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: new RegExp(messages.permissions["audit.read"]!.label) }));
    await user.click(screen.getByRole("button", { name: messages.common.save }));

    expect(await screen.findByText(messages.roles.created)).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/kullanicilar\/roller\/\d+$/));
    expect(backend.calls.find((call) => call.method === "POST")?.body).toMatchObject({
      name: "Depo",
      permissions: ["audit.read"],
    });
  });

  it("lists roles with their permission count", async () => {
    logIn(SUPER_ADMIN);
    renderApp("/kullanicilar/roller");

    const rolesTable = await screen.findByRole("table", { name: messages.users.tabRoles });
    expect(within(rolesTable).getByText(messages.roles.permissionCount(2))).toBeInTheDocument();
  });
});
