import { Navigate, Outlet, useLocation } from "react-router";
import { messages } from "../messages.ts";
import { SessionContext, useMe } from "./session.tsx";

/** Sends visitors without a session to the login page, remembering where they wanted to go. */
export function RequireAuth() {
  const { data: me, isPending } = useMe();
  const location = useLocation();

  if (isPending) {
    return (
      <p role="status" className="p-6 text-muted-foreground">
        {messages.loading}
      </p>
    );
  }
  if (!me) {
    const target = location.pathname + location.search;
    const search = target === "/" ? "" : `?sonra=${encodeURIComponent(target)}`;
    return <Navigate to={`/giris${search}`} replace />;
  }
  return (
    <SessionContext value={me}>
      <Outlet />
    </SessionContext>
  );
}
