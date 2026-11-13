import type { AdminComponents } from "@burokent/api-client/admin";
import { queryOptions } from "@tanstack/react-query";
import { api } from "../../lib/api.ts";
import { ApiError, asProblem } from "../../lib/problem.ts";

export type UserView = AdminComponents["schemas"]["UserView"];
export type RoleView = AdminComponents["schemas"]["RoleView"];
export type PermissionDefinition = AdminComponents["schemas"]["PermissionDefinition"];

/** Turns an openapi-fetch result into data or a thrown problem body, for TanStack Query. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.data === undefined) {
    throw new ApiError(asProblem(result.error), result.response.status);
  }
  return result.data;
}

export const usersQuery = queryOptions({
  queryKey: ["users"],
  queryFn: async () => unwrap(await api.GET("/api/admin/users")),
});

export const userQuery = (id: number) =>
  queryOptions({
    queryKey: ["users", id],
    queryFn: async () => unwrap(await api.GET("/api/admin/users/{id}", { params: { path: { id } } })),
  });

export const rolesQuery = queryOptions({
  queryKey: ["roles"],
  queryFn: async () => unwrap(await api.GET("/api/admin/roles")),
});

export const roleQuery = (id: number) =>
  queryOptions({
    queryKey: ["roles", id],
    queryFn: async () => unwrap(await api.GET("/api/admin/roles/{id}", { params: { path: { id } } })),
  });

export const permissionsQuery = queryOptions({
  queryKey: ["permissions"],
  queryFn: async () => unwrap(await api.GET("/api/admin/permissions")),
  staleTime: Infinity,
});

export function roleNames(roles: RoleView[] | undefined): Record<number, string> {
  return Object.fromEntries((roles ?? []).map((role) => [role.id, role.name]));
}
