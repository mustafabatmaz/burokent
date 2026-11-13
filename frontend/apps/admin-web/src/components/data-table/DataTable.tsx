import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { messages } from "../../messages.ts";
import { Button } from "../ui/button.tsx";
import { Card } from "../ui/card.tsx";

export interface ServerPagination {
  /** Zero-based, as in the API. */
  page: number;
  size: number;
  total: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

export interface DataTableProps<T> {
  caption: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- column value types differ per column
  columns: ColumnDef<T, any>[];
  data: T[] | undefined;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyMessage: string;
  emptyAction?: ReactNode;
  /** The record's own address; the whole row (or card) links there. */
  getRowHref?: (row: T) => string;
  /** How a row looks on phones, where a card list replaces the table. */
  renderCard: (row: T) => ReactNode;
  /** Server-side paging; without it the table sorts on the client. */
  pagination?: ServerPagination;
}

const PAGE_SIZES = [25, 50, 100];

export function DataTable<T>({
  caption,
  columns,
  data,
  isPending,
  isError,
  onRetry,
  emptyMessage,
  emptyAction,
  getRowHref,
  renderCard,
  pagination,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  // TanStack Table returns new functions on each render, which the React Compiler lint cannot memoize
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: Boolean(pagination),
    enableSortingRemoval: true,
  });

  if (isPending) {
    return (
      <div role="status" aria-label={messages.loading} className="flex flex-col gap-2">
        <span className="sr-only">{messages.loading}</span>
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <Card className="flex flex-col items-start gap-3 p-6">
        <p>{messages.common.loadError}</p>
        <Button variant="secondary" onClick={onRetry}>
          {messages.common.retry}
        </Button>
      </Card>
    );
  }
  const rows = table.getRowModel().rows;
  if (rows.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-3 p-6">
        <p className="text-muted-foreground">{emptyMessage}</p>
        {emptyAction}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => {
          const href = getRowHref?.(row.original);
          return (
            <li key={row.id}>
              <Card className="relative p-4">
                {renderCard(row.original)}
                {href && <Link to={href} className="absolute inset-0 rounded-xl" aria-hidden tabIndex={-1} />}
              </Card>
            </li>
          );
        })}
      </ul>

      <Card className="hidden overflow-x-auto md:block">
        <table aria-label={caption} className="w-full text-sm">
          <thead className="border-b text-muted-foreground">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const label = String(header.column.columnDef.header ?? "");
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="h-11 px-4 text-start font-medium"
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    >
                      {header.column.getCanSort() && !pagination ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                          aria-label={messages.common.sortBy(label)}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3.5" aria-hidden />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = getRowHref?.(row.original);
              return (
                <tr key={row.id} className="relative border-b last:border-0 hover:bg-accent/50">
                  {row.getVisibleCells().map((cell, index) => (
                    <td key={cell.id} className="h-14 px-4">
                      {href && index === 0 ? (
                        // The link covers the whole row, so any part of it opens the record
                        <Link to={href} className="font-medium after:absolute after:inset-0">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </Link>
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {pagination && <Pager pagination={pagination} />}
    </div>
  );
}

function Pager({ pagination }: { pagination: ServerPagination }) {
  const pages = Math.max(1, Math.ceil(pagination.total / pagination.size));
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 text-sm">
      <span className="text-muted-foreground">{messages.common.total(pagination.total)}</span>
      <label className="flex items-center gap-2 text-muted-foreground">
        {messages.common.rowsPerPage}
        <select
          className="h-9 rounded-md border bg-card px-2 text-foreground"
          value={pagination.size}
          onChange={(event) => pagination.onSizeChange(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page === 0}
          onClick={() => pagination.onPageChange(pagination.page - 1)}
        >
          {messages.common.previous}
        </Button>
        <span className="whitespace-nowrap">{messages.common.page(pagination.page + 1, pages)}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page + 1 >= pages}
          onClick={() => pagination.onPageChange(pagination.page + 1)}
        >
          {messages.common.next}
        </Button>
      </div>
    </div>
  );
}
