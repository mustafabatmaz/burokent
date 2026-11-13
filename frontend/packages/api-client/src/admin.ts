import createClient, { type Client, type Middleware } from "openapi-fetch";
import type { paths } from "./generated/admin.ts";

export type { components as AdminComponents, paths as AdminPaths } from "./generated/admin.ts";

export const CSRF_COOKIE = "XSRF-TOKEN";
export const CSRF_HEADER = "X-XSRF-TOKEN";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

export function readCookie(cookies: string, name: string): string | undefined {
  for (const part of cookies.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(value.join("="));
    }
  }
  return undefined;
}

/** Copies the CSRF token from its cookie into the header the backend checks, on every state-changing request. */
export function csrfMiddleware(getCookies: () => string): Middleware {
  return {
    onRequest({ request }) {
      if (SAFE_METHODS.has(request.method)) {
        return undefined;
      }
      const token = readCookie(getCookies(), CSRF_COOKIE);
      if (token) {
        request.headers.set(CSRF_HEADER, token);
      }
      return request;
    },
  };
}

export interface AdminClientOptions {
  /** Defaults to the current origin; the admin app talks to the API through the same host. */
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  getCookies?: () => string;
}

export type AdminClient = Client<paths>;

export function createAdminClient(options: AdminClientOptions = {}): AdminClient {
  const client = createClient<paths>({
    baseUrl: options.baseUrl ?? "",
    credentials: "same-origin",
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  client.use(csrfMiddleware(options.getCookies ?? (() => document.cookie)));
  return client;
}
