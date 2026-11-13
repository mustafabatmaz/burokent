import { NavLink } from "react-router";
import { cn } from "../lib/cn.ts";
import type { NavGroup } from "./navigation.ts";

/** Menu groups and links; labelClassName lets the sidebar hide labels in icon mode. */
export function NavLinks({
  groups,
  labelClassName,
  onNavigate,
}: {
  groups: NavGroup[];
  labelClassName?: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-1">
          {group.label && (
            <p className={cn("px-3 text-xs font-medium text-muted-foreground uppercase", labelClassName)}>
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              title={item.label}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-sidebar-accent/60",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                )
              }
            >
              <item.icon className="size-5 shrink-0" aria-hidden />
              <span className={labelClassName}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </div>
  );
}
