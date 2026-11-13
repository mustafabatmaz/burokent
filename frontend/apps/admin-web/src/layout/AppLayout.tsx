import { Menu as MenuIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useSession } from "../auth/session.tsx";
import { CrownMark } from "../components/BrandMark.tsx";
import { Button } from "../components/ui/button.tsx";
import { cn } from "../lib/cn.ts";
import { messages } from "../messages.ts";
import { MobileMenu } from "./MobileMenu.tsx";
import { NAVIGATION, visibleNavigation } from "./navigation.ts";
import { NavLinks } from "./NavLinks.tsx";
import { ThemeMenu } from "./ThemeMenu.tsx";
import { UserMenu } from "./UserMenu.tsx";
import { useStoredFlag } from "./useStoredFlag.ts";

/**
 * Desktop (≥1024 px): sidebar that can be collapsed to icons, remembered. Tablet (768–1023 px): icons, expanded on
 * demand. Phone (<768 px): bottom tabs plus a full-screen menu.
 */
export function AppLayout() {
  const me = useSession();
  const groups = visibleNavigation(NAVIGATION, me.permissions);
  const tabs = groups.flatMap((group) => group.items).filter((item) => item.tab);
  const [expanded, setExpanded] = useStoredFlag("bk.sidebar.expanded", true);
  const [tabletOpen, setTabletOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const title = groups
    .flatMap((group) => group.items)
    .find((item) =>
      item.to === "/"
        ? location.pathname === "/"
        : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
    )?.label;

  // Labels are hidden in icon mode but stay readable for screen readers
  const labelClassName = cn(!tabletOpen && "md:max-lg:sr-only", !expanded && "lg:sr-only");

  return (
    <div className="min-h-dvh md:flex">
      {tabletOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" aria-hidden onClick={() => setTabletOpen(false)} />
      )}
      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-dvh shrink-0 flex-col gap-4 border-e bg-sidebar p-3 text-sidebar-foreground md:flex md:w-18",
          expanded && "lg:w-64",
          tabletOpen && "max-lg:fixed max-lg:inset-y-0 max-lg:start-0 max-lg:w-64 max-lg:shadow-xl",
        )}
      >
        <div className="flex items-center gap-2 px-1">
          <CrownMark className="h-9 w-auto" />
          <span className={cn("font-semibold", labelClassName)}>{messages.appName}</span>
        </div>
        <nav aria-label={messages.layout.navigation} className="flex-1 overflow-y-auto">
          <NavLinks groups={groups} labelClassName={labelClassName} onNavigate={() => setTabletOpen(false)} />
        </nav>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex lg:hidden"
          aria-label={tabletOpen ? messages.layout.collapse : messages.layout.expand}
          onClick={() => setTabletOpen(!tabletOpen)}
        >
          {tabletOpen ? (
            <PanelLeftClose aria-hidden className="rtl:-scale-x-100" />
          ) : (
            <PanelLeftOpen aria-hidden className="rtl:-scale-x-100" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          aria-label={expanded ? messages.layout.collapse : messages.layout.expand}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <PanelLeftClose aria-hidden className="rtl:-scale-x-100" />
          ) : (
            <PanelLeftOpen aria-hidden className="rtl:-scale-x-100" />
          )}
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur md:px-6">
          <span className="md:hidden">
            <CrownMark className="h-8 w-auto" />
          </span>
          <p className="flex-1 truncate text-sm text-muted-foreground">{title}</p>
          <ThemeMenu />
          <UserMenu />
        </header>
        <main className="flex-1 px-4 py-6 pb-28 md:px-6 md:pb-8 lg:px-8">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label={messages.layout.tabs}
        className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {tabs.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <item.icon className="size-5" aria-hidden />
            {item.tabLabel ?? item.label}
          </NavLink>
        ))}
        <button
          type="button"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
          onClick={() => setMobileMenuOpen(true)}
        >
          <MenuIcon className="size-5" aria-hidden />
          {messages.layout.menu}
        </button>
      </nav>
      <MobileMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} groups={groups} />
    </div>
  );
}
