import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { messages } from "../messages.ts";
import { renderApp } from "../test/render.tsx";
import { backend, logIn, TEST_USER } from "../test/server.ts";

describe("dashboard", () => {
  it("shows the central bank's rates with their date and source", async () => {
    logIn(TEST_USER);
    renderApp("/");

    const rates = await screen.findByRole("table", { name: messages.dashboard.rates.title });
    const rows = within(rates).getAllByRole("row");
    expect(rows[1]).toHaveTextContent(messages.dashboard.rates.currencies.USD!);
    expect(rows[1]).toHaveTextContent("40,1000");
    expect(rows[1]).toHaveTextContent("40,2000");
    expect(rows[3]).toHaveTextContent(messages.dashboard.rates.currencies.SAR!);
    expect(screen.getByText(messages.dashboard.rates.source("13 Kasım 2026"))).toBeInTheDocument();
  });

  it("shows the gold price per gram, its change and its source", async () => {
    logIn(TEST_USER);
    renderApp("/");

    const gold = await screen.findByRole("region", { name: messages.dashboard.gold.title });
    expect(gold).toHaveTextContent("6.321,00 ₺");
    expect(gold).toHaveTextContent(messages.dashboard.gold.change("-%0,91", "6.379,00 ₺"));
    expect(gold).toHaveTextContent(messages.dashboard.gold.source("13 Kasım 2026"));
  });

  it("explains a missing gold price until the server has its key", async () => {
    backend.dashboard.gold = undefined;
    backend.dashboard.goldConfigured = false;
    logIn(TEST_USER);
    renderApp("/");

    const gold = await screen.findByRole("region", { name: messages.dashboard.gold.title });
    expect(gold).toHaveTextContent(messages.dashboard.gold.notConfigured);
  });

  it("shows the weather now and for the coming days, with its source", async () => {
    logIn(TEST_USER);
    renderApp("/");

    const weather = await screen.findByRole("region", { name: messages.dashboard.weather.title("Antakya") });
    expect(weather).toHaveTextContent("16°");
    expect(weather).toHaveTextContent(messages.dashboard.weather.kinds.partlyCloudy);
    const days = within(weather).getAllByRole("listitem");
    expect(days).toHaveLength(3);
    expect(days[1]).toHaveTextContent(messages.dashboard.weather.kinds.lightRain);
    expect(days[1]).toHaveTextContent("9°");
    expect(days[1]).toHaveTextContent("17°");
    expect(weather).toHaveTextContent(messages.dashboard.weather.attribution);
  });

  it("says so when a source has not answered yet", async () => {
    backend.dashboard.rates = undefined;
    backend.dashboard.weather = undefined;
    logIn(TEST_USER);
    renderApp("/");

    expect(await screen.findByText(messages.dashboard.rates.unavailable)).toBeInTheDocument();
    expect(screen.getByText(messages.dashboard.weather.unavailable)).toBeInTheDocument();
  });
});
