import { Link, Outlet, useLocation } from "react-router";
import { cn } from "../../lib/cn.ts";
import { messages } from "../../messages.ts";

const ROLES_PATH = "/kullanicilar/roller";

const TABS = [
  { to: "/kullanicilar", label: messages.users.tabUsers, isActive: (path: string) => !path.startsWith(ROLES_PATH) },
  { to: ROLES_PATH, label: messages.users.tabRoles, isActive: (path: string) => path.startsWith(ROLES_PATH) },
];

export function UsersLayout() {
  const { pathname } = useLocation();
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{messages.users.title}</h1>
      <nav aria-label={messages.users.title} className="flex gap-1 border-b">
        {TABS.map((tab) => {
          // A record page keeps its list's tab selected
          const active = tab.isActive(pathname);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px flex min-h-11 items-center border-b-2 px-4 text-sm font-medium",
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </section>
  );
}
