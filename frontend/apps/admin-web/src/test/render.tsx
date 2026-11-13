import { render } from "@testing-library/react";
import { createMemoryRouter } from "react-router";
import { AppProviders } from "../App.tsx";
import { routes } from "../router.tsx";

export function renderApp(path = "/") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { router, ...render(<AppProviders router={router} />) };
}
