import { useContext, type ReactNode } from "react";
import { hasPermission, SessionContext } from "./session.tsx";

/**
 * Renders its children only when the user has the permission (like a structural directive in Angular). This only
 * shapes the screen; the backend checks every request itself.
 */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return hasPermission(useContext(SessionContext), permission) ? children : fallback;
}
