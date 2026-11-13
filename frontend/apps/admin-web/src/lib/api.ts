import { createAdminClient } from "@burokent/api-client/admin";

const AUTH_PATH = "/api/admin/auth/";

let sessionExpired: () => void = () => undefined;
let refreshing: Promise<boolean> | null = null;
// Increases after every successful refresh; a request that started before it can simply be retried
let generation = 0;

/** Called when the session cannot be renewed any more; the app then shows the login page. */
export function onSessionExpired(handler: () => void): void {
  sessionExpired = handler;
}

function refreshSession(): Promise<boolean> {
  refreshing ??= api
    .POST("/api/admin/auth/refresh")
    .then(
      ({ response }) => {
        if (response.ok) {
          generation++;
        }
        return response.ok;
      },
      () => false,
    )
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * On 401 renews the session once and repeats the request. Requests failing at the same time wait for the same
 * refresh, because a refresh token may be used only once.
 */
async function sessionFetch(request: Request): Promise<Response> {
  const startedIn = generation;
  const retry = request.clone();
  const response = await globalThis.fetch(request);
  if (response.status !== 401 || new URL(request.url).pathname.startsWith(AUTH_PATH)) {
    return response;
  }
  if (generation !== startedIn || (await refreshSession())) {
    return globalThis.fetch(retry);
  }
  sessionExpired();
  return response;
}

export const api = createAdminClient({
  baseUrl: window.location.origin,
  fetch: sessionFetch as typeof globalThis.fetch,
});
