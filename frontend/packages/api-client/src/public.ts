import createClient, { type Client } from "openapi-fetch";
import type { paths } from "./generated/public.ts";

export type { components as PublicComponents, paths as PublicPaths } from "./generated/public.ts";

export interface PublicClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
}

export type PublicClient = Client<paths>;

/** Client for the anonymous public API; it never sends cookies. */
export function createPublicClient(options: PublicClientOptions): PublicClient {
  return createClient<paths>({
    baseUrl: options.baseUrl,
    credentials: "omit",
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
}
