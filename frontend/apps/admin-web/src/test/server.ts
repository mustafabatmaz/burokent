import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export interface FakeUser {
  id: number;
  username: string;
  displayName: string;
  superAdmin: boolean;
  permissions: string[];
}

export const TEST_USER: FakeUser = {
  id: 7,
  username: "test-user",
  displayName: "Test Kullanıcı",
  superAdmin: false,
  permissions: ["audit.read"],
};
export const TEST_PASSWORD = "test-user-password";
export const RATE_LIMITED_USERNAME = "rate-limited";

export const SUPER_ADMIN: FakeUser = {
  id: 1,
  username: "admin",
  displayName: "Süper Yönetici",
  superAdmin: true,
  permissions: ["audit.read", "identity.manage", "identity.read", "media.manage", "media.read"],
};

export const MANAGER: FakeUser = { ...TEST_USER, permissions: ["audit.read", "identity.read"] };

export const MEDIA_VIEWER: FakeUser = { ...TEST_USER, permissions: ["media.read"] };

export interface FakeMedia {
  id: number;
  url: string;
  thumbnailUrl: string;
  previewUrl: string;
  previewThumbnailUrl: string;
  contentType: string;
  width: number;
  height: number;
  byteSize: number;
  originalFileName: string;
  altText: { tr?: string; en?: string; ar?: string };
  archived: boolean;
  createdAt: string;
  version: number;
}

export interface FakeUserRecord {
  id: number;
  username: string;
  displayName: string;
  superAdmin: boolean;
  roleId?: number;
  archived: boolean;
  version: number;
}

export interface FakeRole {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  version: number;
}

export interface FakeAuditEvent {
  id: number;
  occurredAt: string;
  actorUserId?: number;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  changes: { field: string; old?: string; new?: string; masked: boolean }[];
}

const PERMISSIONS = [
  { code: "audit.read", delegable: true },
  { code: "identity.manage", delegable: false },
  { code: "identity.read", delegable: true },
];

function initialUsers(): FakeUserRecord[] {
  return [
    { id: 1, username: "admin", displayName: "Süper Yönetici", superAdmin: true, archived: false, version: 0 },
    {
      id: 7,
      username: "test-user",
      displayName: "Test Kullanıcı",
      superAdmin: false,
      roleId: 1,
      archived: false,
      version: 0,
    },
  ];
}

function initialRoles(): FakeRole[] {
  return [
    { id: 1, name: "Yönetici", description: "Günlük işler", permissions: ["audit.read", "identity.read"], version: 0 },
  ];
}

function fakeMedia(id: number, originalFileName: string, altText: FakeMedia["altText"], createdAt: string): FakeMedia {
  const name = `00000000-0000-0000-0000-${String(id).padStart(12, "0")}`;
  return {
    id,
    url: `/api/public/media/${name}.jpg`,
    thumbnailUrl: `/api/public/media/${name}-400.jpg`,
    previewUrl: `/api/admin/media/files/${name}.jpg`,
    previewThumbnailUrl: `/api/admin/media/files/${name}-400.jpg`,
    contentType: "image/jpeg",
    width: 3000,
    height: 2000,
    byteSize: 1_250_000,
    originalFileName,
    altText,
    archived: false,
    createdAt,
    version: 0,
  };
}

function initialMedia(): FakeMedia[] {
  return [
    fakeMedia(1, "hilal-makam.jpg", { tr: "Hilal makam masası" }, "2026-11-10T09:00:00Z"),
    fakeMedia(2, "atolye.jpg", {}, "2026-11-12T09:00:00Z"),
  ];
}

function initialAudit(): FakeAuditEvent[] {
  return [
    {
      id: 10,
      occurredAt: "2026-11-08T11:30:00Z",
      actorUserId: 1,
      actorName: "Süper Yönetici",
      action: "user.created",
      entityType: "user",
      entityId: "7",
      entityLabel: "test-user",
      changes: [{ field: "displayName", new: "Test Kullanıcı", masked: false }],
    },
    {
      id: 11,
      occurredAt: "2026-11-09T08:00:00Z",
      action: "auth.login_failed",
      entityType: "user",
      entityLabel: "bilinmeyen",
      changes: [],
    },
  ];
}

/** State of the fake backend; tests change it to simulate expired tokens, sessions and concurrent edits. */
export const backend = {
  user: null as FakeUser | null,
  accessTokenValid: true,
  refreshTokenValid: true,
  refreshCalls: 0,
  logoutCalls: 0,
  users: initialUsers(),
  roles: initialRoles(),
  audit: initialAudit(),
  media: initialMedia(),
  calls: [] as { method: string; path: string; body?: unknown; query?: string }[],
};

export function resetBackend(): void {
  backend.user = null;
  backend.accessTokenValid = true;
  backend.refreshTokenValid = true;
  backend.refreshCalls = 0;
  backend.logoutCalls = 0;
  backend.users = initialUsers();
  backend.roles = initialRoles();
  backend.audit = initialAudit();
  backend.media = initialMedia();
  backend.calls = [];
}

function userView(user: FakeUserRecord) {
  return user;
}

export function logIn(user: FakeUser = TEST_USER): void {
  backend.user = user;
  backend.accessTokenValid = true;
}

function problem(status: number, code: string, headers: Record<string, string> = {}) {
  return HttpResponse.json(
    { type: "about:blank", status, code },
    { status, headers: { "Content-Type": "application/problem+json", ...headers } },
  );
}

export const server = setupServer(
  http.get("*/api/admin/auth/csrf", () => new HttpResponse(null, { status: 204 })),
  http.post("*/api/admin/auth/login", async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string };
    if (body.username === RATE_LIMITED_USERNAME) {
      return problem(429, "too_many_attempts", { "Retry-After": "120" });
    }
    if (body.username === TEST_USER.username && body.password === TEST_PASSWORD) {
      logIn();
      return new HttpResponse(null, { status: 204 });
    }
    return problem(401, "invalid_credentials");
  }),
  http.post("*/api/admin/auth/refresh", () => {
    backend.refreshCalls++;
    if (backend.user && backend.refreshTokenValid) {
      backend.accessTokenValid = true;
      return new HttpResponse(null, { status: 204 });
    }
    return problem(401, "unauthorized");
  }),
  http.post("*/api/admin/auth/logout", () => {
    backend.logoutCalls++;
    backend.user = null;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("*/api/admin/me", () => {
    if (!backend.user || !backend.accessTokenValid) {
      return problem(401, "unauthorized");
    }
    return HttpResponse.json(backend.user);
  }),
  http.post("*/api/admin/me/password", async ({ request }) => {
    const body = (await request.json()) as { currentPassword: string; newPassword: string };
    record("POST", request, body);
    if (body.currentPassword !== TEST_PASSWORD) {
      return validation("currentPassword", "invalid");
    }
    if (body.newPassword.length < 12) {
      return validation("newPassword", "password_too_short");
    }
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("*/api/admin/permissions", () => HttpResponse.json(PERMISSIONS)),
  http.get("*/api/admin/users", () => HttpResponse.json(backend.users.map(userView))),
  http.get("*/api/admin/users/:id", ({ params }) => {
    const user = backend.users.find((candidate) => candidate.id === Number(params.id));
    return user ? HttpResponse.json(userView(user)) : problem(404, "not_found");
  }),
  http.post("*/api/admin/users", async ({ request }) => {
    const body = (await request.json()) as { username: string; displayName: string; password: string; roleId?: number };
    record("POST", request, body);
    if (body.password.length < 12) {
      return validation("password", "password_too_short");
    }
    if (backend.users.some((user) => user.username === body.username.toLowerCase())) {
      return problem(409, "username_taken");
    }
    const user: FakeUserRecord = {
      id: 100 + backend.users.length,
      username: body.username.toLowerCase(),
      displayName: body.displayName,
      superAdmin: false,
      ...(body.roleId ? { roleId: body.roleId } : {}),
      archived: false,
      version: 0,
    };
    backend.users.push(user);
    return HttpResponse.json(userView(user), { status: 201 });
  }),
  http.put("*/api/admin/users/:id", async ({ params, request }) => {
    const body = (await request.json()) as { displayName: string; roleId?: number; version: number };
    record("PUT", request, body);
    const user = backend.users.find((candidate) => candidate.id === Number(params.id));
    if (!user) {
      return problem(404, "not_found");
    }
    if (user.version !== body.version) {
      return problem(409, "conflict");
    }
    user.displayName = body.displayName;
    if (body.roleId) {
      user.roleId = body.roleId;
    } else {
      delete user.roleId;
    }
    user.version++;
    return HttpResponse.json(userView(user));
  }),
  http.post("*/api/admin/users/:id/:action", async ({ params, request }) => {
    const user = backend.users.find((candidate) => candidate.id === Number(params.id));
    const body = params.action === "password" ? ((await request.json()) as { password: string }) : undefined;
    record("POST", request, body);
    if (!user) {
      return problem(404, "not_found");
    }
    if (body && body.password.length < 12) {
      return validation("password", "password_too_short");
    }
    if (params.action === "archive") {
      user.archived = true;
    }
    if (params.action === "unarchive") {
      user.archived = false;
    }
    return new HttpResponse(null, { status: 204 });
  }),
  http.post("*/api/admin/users/:id/sessions/revoke", ({ request }) => {
    record("POST", request);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("*/api/admin/roles", () => HttpResponse.json(backend.roles)),
  http.get("*/api/admin/roles/:id", ({ params }) => {
    const role = backend.roles.find((candidate) => candidate.id === Number(params.id));
    return role ? HttpResponse.json(role) : problem(404, "not_found");
  }),
  http.post("*/api/admin/roles", async ({ request }) => {
    const body = (await request.json()) as { name: string; description?: string; permissions: string[] };
    record("POST", request, body);
    if (backend.roles.some((role) => role.name === body.name)) {
      return problem(409, "role_name_taken");
    }
    const role: FakeRole = { id: 50 + backend.roles.length, ...body, version: 0 };
    backend.roles.push(role);
    return HttpResponse.json(role, { status: 201 });
  }),
  http.put("*/api/admin/roles/:id", async ({ params, request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      permissions: string[];
      version: number;
    };
    record("PUT", request, body);
    const role = backend.roles.find((candidate) => candidate.id === Number(params.id));
    if (!role) {
      return problem(404, "not_found");
    }
    if (role.version !== body.version) {
      return problem(409, "conflict");
    }
    Object.assign(role, { name: body.name, description: body.description, permissions: body.permissions });
    role.version++;
    return HttpResponse.json(role);
  }),
  http.get("*/api/admin/media", ({ request }) => {
    const url = new URL(request.url);
    record("GET", request);
    const archived = url.searchParams.get("archived") === "true";
    const page = Number(url.searchParams.get("page") ?? "0");
    const size = Number(url.searchParams.get("size") ?? "48");
    const matching = backend.media
      .filter((media) => media.archived === archived)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json({
      content: matching.slice(page * size, (page + 1) * size),
      page: { size, number: page, totalElements: matching.length, totalPages: Math.ceil(matching.length / size) },
    });
  }),
  http.get("*/api/admin/media/:id", ({ params }) => {
    const media = backend.media.find((candidate) => candidate.id === Number(params.id));
    return media ? HttpResponse.json(media) : problem(404, "not_found");
  }),
  http.post("*/api/admin/media", async ({ request }) => {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) {
      return problem(400, "bad_request");
    }
    record("POST", request, { fileName: file.name, size: file.size });
    if (file.name.startsWith("bad")) {
      return problem(400, "media_type_unsupported");
    }
    const id = 100 + backend.media.length;
    const media = fakeMedia(id, file.name, {}, new Date(Date.UTC(2026, 10, 14, 10, id)).toISOString());
    backend.media.push(media);
    return HttpResponse.json(media, { status: 201 });
  }),
  http.put("*/api/admin/media/:id", async ({ params, request }) => {
    const body = (await request.json()) as { altText: FakeMedia["altText"]; version: number };
    record("PUT", request, body);
    const media = backend.media.find((candidate) => candidate.id === Number(params.id));
    if (!media) {
      return problem(404, "not_found");
    }
    if (media.version !== body.version) {
      return problem(409, "conflict");
    }
    media.altText = Object.fromEntries(
      Object.entries(body.altText).filter((entry): entry is [string, string] => Boolean(entry[1]?.trim())),
    );
    media.version++;
    return HttpResponse.json(media);
  }),
  http.post("*/api/admin/media/:id/:action", ({ params, request }) => {
    record("POST", request);
    const media = backend.media.find((candidate) => candidate.id === Number(params.id));
    if (!media) {
      return problem(404, "not_found");
    }
    media.archived = params.action === "archive";
    return new HttpResponse(null, { status: 204 });
  }),
  http.get("*/api/admin/audit-events", ({ request }) => {
    const url = new URL(request.url);
    record("GET", request);
    const filters = ["action", "entityType", "entityId"] as const;
    const page = Number(url.searchParams.get("page") ?? "0");
    const size = Number(url.searchParams.get("size") ?? "50");
    const actor = url.searchParams.get("actorUserId");
    const matching = backend.audit.filter(
      (event) =>
        filters.every((name) => !url.searchParams.get(name) || event[name] === url.searchParams.get(name)) &&
        (!actor || String(event.actorUserId) === actor),
    );
    return HttpResponse.json({
      content: matching.slice(page * size, (page + 1) * size),
      page: { size, number: page, totalElements: matching.length, totalPages: Math.ceil(matching.length / size) },
    });
  }),
);

function record(method: string, request: Request, body?: unknown): void {
  const url = new URL(request.url);
  backend.calls.push({ method, path: url.pathname, body, query: url.search });
}

function validation(field: string, code: string) {
  return HttpResponse.json(
    { type: "about:blank", status: 400, code: "validation_failed", errors: [{ field, code }] },
    { status: 400, headers: { "Content-Type": "application/problem+json" } },
  );
}
