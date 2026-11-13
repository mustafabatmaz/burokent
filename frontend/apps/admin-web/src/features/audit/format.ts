import type { AdminComponents } from "@burokent/api-client/admin";
import { messages } from "../../messages.ts";

type AuditEvent = Pick<
  AdminComponents["schemas"]["AuditEventView"],
  "action" | "actorName" | "entityLabel" | "entityId"
>;
type Change = AdminComponents["schemas"]["ChangeView"];

interface Context {
  actor: string;
  label: string;
}

const SENTENCES: Record<string, (context: Context) => string> = {
  "auth.login_succeeded": ({ actor }) => `${actor} giriş yaptı`,
  "auth.login_failed": ({ label }) => `“${label}” kullanıcı adıyla başarısız giriş denemesi`,
  "auth.logout": ({ actor }) => `${actor} çıkış yaptı`,
  "auth.refresh_token_reused": ({ actor }) =>
    `${actor} kullanıcısının oturumu güvenlik nedeniyle kapatıldı (yenileme anahtarı ikinci kez kullanıldı)`,
  "user.created": ({ actor, label }) => `${actor}, ${label} kullanıcısını oluşturdu`,
  "user.updated": ({ actor, label }) => `${actor}, ${label} kullanıcısının bilgilerini güncelledi`,
  "user.password_reset": ({ actor, label }) => `${actor}, ${label} kullanıcısının şifresini sıfırladı`,
  "user.password_changed": ({ actor }) => `${actor} şifresini değiştirdi`,
  "user.archived": ({ actor, label }) => `${actor}, ${label} kullanıcısını arşivledi`,
  "user.unarchived": ({ actor, label }) => `${actor}, ${label} kullanıcısını arşivden çıkardı`,
  "user.sessions_ended": ({ actor, label }) => `${actor}, ${label} kullanıcısının tüm oturumlarını kapattı`,
  "role.created": ({ actor, label }) => `${actor}, “${label}” rolünü oluşturdu`,
  "role.updated": ({ actor, label }) => `${actor}, “${label}” rolünü güncelledi`,
};

/** A readable Turkish sentence for an activity entry; unknown actions fall back to the action code. */
export function formatAuditEvent(event: AuditEvent): string {
  const context = {
    actor: event.actorName ?? messages.audit.unknownActor,
    label: event.entityLabel ?? event.entityId ?? "",
  };
  return SENTENCES[event.action]?.(context) ?? `${context.actor}: ${event.action}`;
}

function permissionList(value: string): string {
  return value
    .split(",")
    .filter(Boolean)
    .map((code) => messages.permissions[code]?.label ?? code)
    .join(", ");
}

function readable(field: string, value: string | undefined, lookup: { roleNames?: Record<number, string> }): string {
  if (value === undefined || value === "") {
    return messages.audit.empty_value;
  }
  if (field === "permissions") {
    return permissionList(value);
  }
  if (field === "roleId") {
    return lookup.roleNames?.[Number(value)] ?? value;
  }
  return value;
}

/** "Field: old → new" with Turkish field names; masked values stay hidden. */
export function describeChange(change: Change, lookup: { roleNames?: Record<number, string> }): string {
  const field = messages.audit.fields[change.field] ?? change.field;
  if (change.masked) {
    return `${field}: ${messages.audit.masked}`;
  }
  return `${field}: ${readable(change.field, change.old, lookup)} → ${readable(change.field, change.new, lookup)}`;
}

const DATE_TIME = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}
