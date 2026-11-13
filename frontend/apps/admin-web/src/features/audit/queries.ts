import type { AdminComponents } from "@burokent/api-client/admin";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "../../lib/api.ts";
import { unwrap } from "../identity/queries.ts";

export type AuditEventView = AdminComponents["schemas"]["AuditEventView"];

export interface AuditFilter {
  actorUserId?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
}

export const auditEventsQuery = (filter: AuditFilter) =>
  queryOptions({
    queryKey: ["audit-events", filter],
    queryFn: async () => unwrap(await api.GET("/api/admin/audit-events", { params: { query: filter } })),
    // Keeps the current page on screen while the next one loads
    placeholderData: keepPreviousData,
  });
