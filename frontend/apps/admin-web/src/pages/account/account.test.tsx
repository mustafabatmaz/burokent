import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { errorText, messages } from "../../messages.ts";
import { renderApp } from "../../test/render.tsx";
import { logIn, TEST_PASSWORD } from "../../test/server.ts";

describe("change own password", () => {
  it("shows a wrong current password under its field, then saves", async () => {
    logIn();
    renderApp("/hesap/sifre");
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText(/Mevcut şifre/), "yanlis-sifre");
    await user.type(screen.getByLabelText(/Yeni şifre/), "yepyeni-bir-sifre");
    await user.click(screen.getByRole("button", { name: messages.common.save }));
    expect(await screen.findByText(errorText("invalid"))).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Mevcut şifre/));
    await user.type(screen.getByLabelText(/Mevcut şifre/), TEST_PASSWORD);
    await user.click(screen.getByRole("button", { name: messages.common.save }));

    expect(await screen.findByText(messages.account.changed)).toBeInTheDocument();
  });
});
