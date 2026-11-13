import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { resetMatchMedia } from "./match-media.ts";
import { resetBackend, server } from "./server.ts";

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  document.cookie = "XSRF-TOKEN=test-csrf-token";
  resetMatchMedia();
  resetBackend();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
