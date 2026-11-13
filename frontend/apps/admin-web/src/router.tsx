import type { RouteObject } from "react-router";
import { RequireAuth } from "./auth/RequireAuth.tsx";
import { AppLayout } from "./layout/AppLayout.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { NotFoundPage } from "./pages/NotFoundPage.tsx";

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
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
