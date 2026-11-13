import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { RouterProvider, type RouterProviderProps } from "react-router";
import { meQuery } from "./auth/session.tsx";
import { onSessionExpired } from "./lib/api.ts";
import { ThemeContext, useTheme } from "./theme/theme.ts";

function createQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
  });
  // Without a session every screen falls back to the login page
  onSessionExpired(() => queryClient.setQueryData(meQuery.queryKey, null));
  return queryClient;
}

export function AppProviders({ router }: { router: RouterProviderProps["router"] }) {
  const [queryClient] = useState(createQueryClient);
  const theme = useTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext value={theme}>
        <RouterProvider router={router} />
      </ThemeContext>
    </QueryClientProvider>
  );
}
