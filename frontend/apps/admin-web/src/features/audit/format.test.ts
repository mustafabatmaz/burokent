import { describe, expect, it } from "vitest";
import { describeChange, formatAuditEvent } from "./format.ts";

const base = {
  id: 1,
  occurredAt: "2026-11-08T11:30:00Z",
  actorUserId: 1,
  actorName: "Yönetici Kişi",
  entityType: "user",
  entityId: "5",
  entityLabel: "depo-sorumlusu",
  changes: [],
};

describe("formatAuditEvent", () => {
  it("builds a Turkish sentence", () => {
    expect(formatAuditEvent({ ...base, action: "user.archived" })).toBe(
      "Yönetici Kişi, depo-sorumlusu kullanıcısının hesabını kapattı",
    );
    const anonymous = { action: "auth.login_failed", entityLabel: "depo-sorumlusu" };
    expect(formatAuditEvent(anonymous)).toBe("“depo-sorumlusu” kullanıcı adıyla başarısız giriş denemesi");
  });

  it("names images by the file they were uploaded from", () => {
    const image = { ...base, entityType: "media", entityLabel: "hilal-makam.jpg" };
    expect(formatAuditEvent({ ...image, action: "media.uploaded" })).toBe(
      "Yönetici Kişi, “hilal-makam.jpg” görselini yükledi",
    );
    expect(formatAuditEvent({ ...image, action: "media.updated" })).toBe(
      "Yönetici Kişi, “hilal-makam.jpg” görselinin alt metinlerini güncelledi",
    );
    expect(formatAuditEvent({ ...image, action: "media.archived" })).toBe(
      "Yönetici Kişi, “hilal-makam.jpg” görselini sitede gizledi",
    );
    expect(formatAuditEvent({ ...image, action: "media.unarchived" })).toBe(
      "Yönetici Kişi, “hilal-makam.jpg” görselini tekrar sitede gösterdi",
    );
    expect(formatAuditEvent({ ...image, action: "media.deleted" })).toBe(
      "Yönetici Kişi, “hilal-makam.jpg” görselini kalıcı olarak sildi",
    );
  });

  it("falls back to the action code for unknown actions", () => {
    expect(formatAuditEvent({ ...base, action: "stock.adjusted" })).toBe("Yönetici Kişi: stock.adjusted");
  });

  it("describes changes with Turkish field names and readable values", () => {
    expect(describeChange({ field: "permissions", old: "", new: "audit.read,identity.read", masked: false }, {})).toBe(
      "İzinler: boş → Aktivite geçmişini görme, Kullanıcıları ve rolleri görme",
    );
    expect(
      describeChange({ field: "roleId", old: "3", new: "4", masked: false }, { roleNames: { 3: "A", 4: "B" } }),
    ).toBe("Rol: A → B");
    expect(describeChange({ field: "cost", masked: true }, {})).toBe("cost: gizli");
  });
});
