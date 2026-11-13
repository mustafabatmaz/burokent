import { act, renderHook } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { messages } from "../../messages.ts";
import { applyServerErrors } from "./serverErrors.ts";

describe("applyServerErrors", () => {
  it("puts field errors from the server on the matching fields", () => {
    const { result } = renderHook(() => useForm({ defaultValues: { username: "", password: "" } }));

    let applied = false;
    act(() => {
      applied = applyServerErrors(result.current, {
        status: 400,
        code: "validation_failed",
        errors: [{ field: "password", code: "password_too_short" }],
      });
    });

    expect(applied).toBe(true);
    expect(result.current.getFieldState("password").error?.message).toBe(messages.errors.password_too_short);
  });

  it("maps a known general error code to a field", () => {
    const { result } = renderHook(() => useForm({ defaultValues: { username: "" } }));

    act(() => {
      applyServerErrors(result.current, { status: 409, code: "username_taken" }, { username_taken: "username" });
    });

    expect(result.current.getFieldState("username").error?.message).toBe(messages.errors.username_taken);
  });

  it("reports errors it cannot place", () => {
    const { result } = renderHook(() => useForm({ defaultValues: { username: "" } }));

    let applied = true;
    act(() => {
      applied = applyServerErrors(result.current, { status: 500 });
    });

    expect(applied).toBe(false);
  });
});
