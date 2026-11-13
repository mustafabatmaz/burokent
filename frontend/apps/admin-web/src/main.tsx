import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { AppProviders } from "./App.tsx";
import "./index.css";
import { routes } from "./router.tsx";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <AppProviders router={createBrowserRouter(routes)} />
  </StrictMode>,
);
