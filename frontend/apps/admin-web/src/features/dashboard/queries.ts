import type { AdminComponents } from "@burokent/api-client/admin";
import { queryOptions } from "@tanstack/react-query";
import { api } from "../../lib/api.ts";
import { unwrap } from "../identity/queries.ts";

export type DashboardView = AdminComponents["schemas"]["DashboardView"];

export const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: async () => unwrap(await api.GET("/api/admin/dashboard")),
  // The backend refreshes its sources every 30–60 minutes; checking every 10 minutes keeps an open page current
  refetchInterval: 10 * 60_000,
});
