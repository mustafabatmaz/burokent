import { History, LayoutDashboard, Users, type LucideIcon } from "lucide-react";
import { messages } from "../messages.ts";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon | (() => null);
  /** Hidden for users without this permission. */
  permission?: string;
  /** Shown in the phone's bottom tab bar. */
  tab?: boolean;
  /** Shorter label for the bottom tab bar. */
  tabLabel?: string;
}

export interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
}

/**
 * The whole menu. Only screens that exist are listed; module screens are added here as they are built, in the group
 * order of the design guide (Satış, Ürün ve Üretim, Finans ve Operasyon, Raporlar, Site İçeriği, Sistem).
 */
export const NAVIGATION: NavGroup[] = [
  {
    id: "main",
    items: [
      {
        to: "/",
        label: messages.dashboard.title,
        icon: LayoutDashboard,
        tab: true,
        tabLabel: messages.layout.dashboardTab,
      },
    ],
  },
  {
    id: "system",
    label: messages.layout.groups.system,
    items: [
      { to: "/kullanicilar", label: messages.users.title, icon: Users, permission: "identity.read" },
      { to: "/aktivite", label: messages.audit.title, icon: History, permission: "audit.read" },
    ],
  },
];

export function visibleNavigation(groups: NavGroup[], permissions: readonly string[]): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || permissions.includes(item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}
