import { CSRF_COOKIE, readCookie, type AdminComponents } from "@burokent/api-client/admin";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api.ts";

export type Me = AdminComponents["schemas"]["MeResponse"];

let csrfRequest: Promise<void> | null = null;

/**
 * Makes sure the XSRF-TOKEN cookie exists before a state-changing request. Checks the cookie itself instead of
 * remembering an earlier call, so a failed attempt (backend not up yet, network error) is simply retried.
 */
export function ensureCsrfCookie(): Promise<void> {
  if (readCookie(document.cookie, CSRF_COOKIE)) {
    return Promise.resolve();
  }
  csrfRequest ??= api
    .GET("/api/admin/auth/csrf")
    .then(({ response }) => {
      if (!response.ok) {
        throw new Error(`Could not get the CSRF cookie (${response.status})`);
      }
    })
    .finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}

/** The logged-in user with permissions, or null when nobody is logged in. */
export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    await ensureCsrfCookie();
    const { data, response } = await api.GET("/api/admin/me");
    if (response.status === 401) {
      return null;
    }
    if (!data) {
      throw new Error(`Could not load the session (${response.status})`);
    }
    return data;
  },
  staleTime: 5 * 60_000,
  retry: false,
});

export function useMe() {
  return useQuery(meQuery);
}

/** Set by RequireAuth for everything inside the logged-in area. */
export const SessionContext = createContext<Me | null>(null);

export function useSession(): Me {
  const me = useContext(SessionContext);
  if (!me) {
    throw new Error("useSession is only available inside RequireAuth");
  }
  return me;
}

export function hasPermission(me: Me | null, permission: string): boolean {
  return me?.permissions.includes(permission) ?? false;
}

export function useLogout(): () => Promise<void> {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useCallback(async () => {
    try {
      await api.POST("/api/admin/auth/logout");
    } finally {
      queryClient.clear();
      queryClient.setQueryData(meQuery.queryKey, null);
      await navigate("/giris", { replace: true });
    }
  }, [queryClient, navigate]);
}
