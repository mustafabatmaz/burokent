import { Outlet, type RouteObject } from "react-router";
import { RequireAuth } from "./auth/RequireAuth.tsx";
import { RequirePermission } from "./auth/RequirePermission.tsx";
import { AppLayout } from "./layout/AppLayout.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";

function guarded(permission: string, children: RouteObject[]): RouteObject {
  return {
    element: (
      <RequirePermission permission={permission}>
        <Outlet />
      </RequirePermission>
    ),
    children,
  };
}

export const routes: RouteObject[] = [
  { path: "/giris", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import("./pages/DashboardPage.tsx")).DashboardPage }),
          },
          {
            path: "kullanicilar",
            lazy: async () => ({ Component: (await import("./pages/users/UsersLayout.tsx")).UsersLayout }),
            children: [
              guarded("identity.read", [
                {
                  index: true,
                  lazy: async () => ({ Component: (await import("./pages/users/UsersListPage.tsx")).UsersListPage }),
                },
                {
                  path: "roller",
                  lazy: async () => ({ Component: (await import("./pages/users/RolesListPage.tsx")).RolesListPage }),
                },
                {
                  path: "roller/:id",
                  lazy: async () => ({ Component: (await import("./pages/users/RoleFormPage.tsx")).RoleEditPage }),
                },
                {
                  path: ":id",
                  lazy: async () => ({ Component: (await import("./pages/users/UserDetailPage.tsx")).UserDetailPage }),
                },
              ]),
              guarded("identity.manage", [
                {
                  path: "yeni",
                  lazy: async () => ({ Component: (await import("./pages/users/UserNewPage.tsx")).UserNewPage }),
                },
                {
                  path: "roller/yeni",
                  lazy: async () => ({ Component: (await import("./pages/users/RoleFormPage.tsx")).RoleNewPage }),
                },
              ]),
            ],
          },
          {
            path: "aktivite",
            ...guarded("audit.read", [
              {
                index: true,
                lazy: async () => ({ Component: (await import("./pages/audit/AuditPage.tsx")).AuditPage }),
              },
            ]),
          },
          {
            path: "medya",
            ...guarded("media.read", [
              {
                index: true,
                lazy: async () => ({ Component: (await import("./pages/media/MediaListPage.tsx")).MediaListPage }),
              },
              {
                path: ":id",
                lazy: async () => ({
                  Component: (await import("./pages/media/MediaDetailPage.tsx")).MediaDetailPage,
                }),
              },
            ]),
          },
          {
            path: "hesap/sifre",
            lazy: async () => ({
              Component: (await import("./pages/account/ChangePasswordPage.tsx")).ChangePasswordPage,
            }),
          },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
