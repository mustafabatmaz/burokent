import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { File as NodeFile } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messages } from "../../messages.ts";
import { renderApp } from "../../test/render.tsx";
import { backend, logIn, MEDIA_VIEWER, SUPER_ADMIN, TEST_USER } from "../../test/server.ts";

// Error toasts are also announced in a live region, so their text appears twice
const toast = async (text: string) => (await screen.findAllByText(text))[0];

const library = () => screen.findByRole("list", { name: messages.media.title });

function image(name: string, type = "image/jpeg", size?: number): File {
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type });
  if (size !== undefined) {
    Object.defineProperty(file, "size", { value: size });
  }
  return file;
}

function uploads() {
  return backend.calls.filter((call) => call.method === "POST" && call.path === "/api/admin/media");
}

// jsdom brings its own FormData and File, which Node's fetch (under MSW) cannot send as multipart. A browser has one
// implementation; here the Node ones stand in while these tests run, so uploads are encoded as a browser would
const NodeFormData = (await new Response(new URLSearchParams()).formData()).constructor as typeof FormData;

describe("media library", () => {
  beforeEach(() => {
    vi.stubGlobal("FormData", NodeFormData);
    vi.stubGlobal("File", NodeFile);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lists images newest first and marks the ones without a Turkish alt text", async () => {
    logIn(SUPER_ADMIN);
    renderApp("/medya");

    const items = within(await library()).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("atolye.jpg");
    expect(items[0]).toHaveTextContent(messages.media.missingAlt);
    expect(items[1]).toHaveTextContent("hilal-makam.jpg");
    expect(items[1]).not.toHaveTextContent(messages.media.missingAlt);
    expect(within(items[1]!).getByRole("img")).toHaveAttribute("alt", "Hilal makam masası");
    // The panel's own address, which keeps working after an image is archived
    expect(within(items[1]!).getByRole("img").getAttribute("src")).toMatch(/^\/api\/admin\/media\/files\/.+-400\.jpg$/);
  });

  it("is in the menu only with the read permission", async () => {
    logIn(TEST_USER);
    renderApp("/");

    await screen.findByRole("heading", { name: messages.dashboard.title });
    expect(screen.queryByRole("link", { name: messages.media.title })).not.toBeInTheDocument();
  });

  it("offers uploading only with the manage permission", async () => {
    logIn(MEDIA_VIEWER);
    renderApp("/medya");
    await library();
    expect(screen.queryByRole("button", { name: messages.media.upload })).not.toBeInTheDocument();
  });

  it("uploads several files one after the other and shows them", async () => {
    logIn(SUPER_ADMIN);
    renderApp("/medya");
    const user = userEvent.setup();
    await library();

    await user.upload(screen.getByLabelText(messages.media.upload, { selector: "input" }), [
      image("kanepe.jpg"),
      image("koltuk.png", "image/png"),
    ]);

    expect(await screen.findByText(messages.media.uploaded(2))).toBeInTheDocument();
    expect(uploads().map((call) => call.body)).toEqual([
      expect.objectContaining({ fileName: "kanepe.jpg" }),
      expect.objectContaining({ fileName: "koltuk.png" }),
    ]);
    await waitFor(() =>
      expect(within(screen.getByRole("list", { name: messages.media.title })).getAllByRole("listitem")).toHaveLength(4),
    );
  });

  it("refuses too large or unsupported files before sending them", async () => {
    logIn(SUPER_ADMIN);
    renderApp("/medya");
    const user = userEvent.setup({ applyAccept: false });
    await library();

    await user.upload(screen.getByLabelText(messages.media.upload, { selector: "input" }), [
      image("dev.jpg", "image/jpeg", 21 * 1024 * 1024),
      image("telefon.heic", "image/heic"),
    ]);

    expect(await toast(`dev.jpg: ${messages.errors.media_file_too_large}`)).toBeInTheDocument();
    expect(await toast(`telefon.heic: ${messages.errors.media_type_unsupported}`)).toBeInTheDocument();
    expect(uploads()).toHaveLength(0);
  });

  it("shows the server's reason when it refuses a file", async () => {
    logIn(SUPER_ADMIN);
    renderApp("/medya");
    const user = userEvent.setup();
    await library();

    await user.upload(screen.getByLabelText(messages.media.upload, { selector: "input" }), image("bad.jpg"));

    expect(await toast(`bad.jpg: ${messages.errors.media_type_unsupported}`)).toBeInTheDocument();
  });

  it("edits the alt texts per language with a version check", async () => {
    logIn(SUPER_ADMIN);
    renderApp("/medya/1");
    const user = userEvent.setup();

    const turkish = await screen.findByLabelText(messages.media.altTextIn("tr"));
    await waitFor(() => expect(turkish).toHaveValue("Hilal makam masası"));
    expect(screen.getByRole("tab", { name: new RegExp(messages.media.locales.ar) })).toHaveTextContent(
      messages.media.missing,
    );

    await user.click(screen.getByRole("tab", { name: new RegExp(messages.media.locales.ar) }));
    const arabic = screen.getByLabelText(messages.media.altTextIn("ar"));
    expect(arabic).toHaveAttribute("dir", "rtl");
    await user.type(arabic, "طاولة مكتب");
    await user.click(screen.getByRole("button", { name: messages.common.save }));

    expect(await screen.findByText(messages.media.updated)).toBeInTheDocument();
    expect(backend.calls.filter((call) => call.method === "PUT").at(-1)?.body).toEqual({
      altText: { tr: "Hilal makam masası", en: null, ar: "طاولة مكتب" },
      version: 0,
    });
  });

  it("archives an image after confirmation", async () => {
    logIn(SUPER_ADMIN);
    renderApp("/medya/2");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: messages.media.actions.archive }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(messages.media.confirmArchive);
    await user.click(within(dialog).getByRole("button", { name: messages.media.actions.archive }));

    expect(await screen.findByText(messages.media.archivedToast)).toBeInTheDocument();
    expect(backend.media.find((media) => media.id === 2)?.archived).toBe(true);
  });
});
