import type { ColumnDef } from "@tanstack/react-table";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { messages } from "../../messages.ts";
import { DataTable, type DataTableProps } from "./DataTable.tsx";

interface Row {
  id: number;
  name: string;
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Ad", enableSorting: true },
  { accessorKey: "id", header: "No" },
];

function renderTable(props: Partial<DataTableProps<Row>>) {
  const router = createMemoryRouter([
    {
      path: "*",
      element: (
        <DataTable<Row>
          caption="Örnek"
          columns={columns}
          data={undefined}
          isPending={false}
          isError={false}
          onRetry={() => undefined}
          emptyMessage="Hiç yok"
          renderCard={(row) => <span>{row.name}</span>}
          getRowHref={(row) => `/kayit/${row.id}`}
          {...props}
        />
      ),
    },
  ]);
  render(<RouterProvider router={router} />);
  return router;
}

describe("DataTable", () => {
  it("shows a loading state", () => {
    renderTable({ isPending: true });

    expect(screen.getByRole("status")).toHaveTextContent(messages.loading);
  });

  it("shows an error with a retry button", async () => {
    const retry = vi.fn();
    renderTable({ isError: true, onRetry: retry });

    expect(screen.getByText(messages.common.loadError)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: messages.common.retry }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("shows the empty message and action", () => {
    renderTable({ data: [], emptyAction: <button type="button">Ekle</button> });

    expect(screen.getByText("Hiç yok")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ekle" })).toBeInTheDocument();
  });

  it("links every row to its record and sorts on the client", async () => {
    const router = renderTable({
      data: [
        { id: 1, name: "Zeynep" },
        { id: 2, name: "Ali" },
      ],
    });
    const table = screen.getByRole("table", { name: "Örnek" });

    await userEvent.click(within(table).getByRole("button", { name: messages.common.sortBy("Ad") }));
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent)).toEqual(["Ali", "Zeynep"]);

    await userEvent.click(within(table).getByRole("link", { name: "Zeynep" }));
    expect(router.state.location.pathname).toBe("/kayit/1");
  });

  it("pages on the server", async () => {
    const onPageChange = vi.fn();
    renderTable({
      data: [{ id: 1, name: "Ali" }],
      pagination: { page: 0, size: 25, total: 60, onPageChange, onSizeChange: () => undefined },
    });

    expect(screen.getByText(messages.common.page(1, 3))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: messages.common.previous })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: messages.common.next }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
