import type { ReactNode } from "react";
import { ForbiddenPage } from "../pages/ForbiddenPage.tsx";
import { Can } from "./Can.tsx";

/** Route guard (Angular: canActivate): shows the page only with the permission. */
export function RequirePermission({ permission, children }: { permission: string; children: ReactNode }) {
  return (
    <Can permission={permission} fallback={<ForbiddenPage />}>
      {children}
    </Can>
  );
}
