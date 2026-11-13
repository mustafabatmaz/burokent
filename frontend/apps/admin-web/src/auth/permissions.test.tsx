import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { visibleNavigation, type NavGroup } from "../layout/navigation.ts";
import { messages } from "../messages.ts";
import { TEST_USER } from "../test/server.ts";
import { Can } from "./Can.tsx";
import { RequirePermission } from "./RequirePermission.tsx";
import { SessionContext } from "./session.tsx";

describe("permissions", () => {
  it("renders guarded content only with the permission", () => {
    render(
      <SessionContext value={{ ...TEST_USER, permissions: ["audit.read"] }}>
        <Can permission="audit.read">görünür</Can>
        <Can permission="identity.manage">gizli</Can>
      </SessionContext>,
    );

    expect(screen.getByText("görünür")).toBeInTheDocument();
    expect(screen.queryByText("gizli")).not.toBeInTheDocument();
  });

  it("hides navigation items and empty groups the user may not open", () => {
    const groups: NavGroup[] = [
      { id: "main", items: [{ to: "/", label: "Panel", icon: () => null, tab: true }] },
      {
        id: "sales",
        label: "Satış",
        items: [{ to: "/talepler", label: "Talepler", icon: () => null, permission: "lead.read" }],
      },
      {
        id: "system",
        label: "Sistem",
        items: [
          { to: "/aktivite", label: "Aktivite", icon: () => null, permission: "audit.read" },
          { to: "/kullanicilar", label: "Kullanıcılar", icon: () => null, permission: "identity.read" },
        ],
      },
    ];

    const visible = visibleNavigation(groups, ["audit.read"]);

    expect(visible.map((group) => group.id)).toEqual(["main", "system"]);
    expect(visible[1]?.items.map((item) => item.to)).toEqual(["/aktivite"]);
  });

  it("shows a forbidden page on a route the user may not open", () => {
    render(
      <SessionContext value={{ ...TEST_USER, permissions: [] }}>
        <RequirePermission permission="identity.read">
          <p>yönetim ekranı</p>
        </RequirePermission>
      </SessionContext>,
    );

    expect(screen.getByRole("heading", { name: messages.forbidden.title })).toBeInTheDocument();
    expect(screen.queryByText("yönetim ekranı")).not.toBeInTheDocument();
  });
});
