import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { setSystemDark } from "../test/match-media.ts";
import { useTheme } from "./theme.ts";

const isDark = () => document.documentElement.classList.contains("dark");

describe("theme", () => {
  it("switches to dark and remembers the choice", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setChoice("dark"));

    expect(isDark()).toBe(true);
    expect(localStorage.getItem("bk.theme")).toBe("dark");
    expect(renderHook(() => useTheme()).result.current.choice).toBe("dark");
  });

  it("follows the device setting by default", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.choice).toBe("system");
    expect(isDark()).toBe(false);

    act(() => setSystemDark(true));
    expect(isDark()).toBe(true);

    act(() => setSystemDark(false));
    expect(isDark()).toBe(false);
  });

  it("ignores the device setting when light is chosen", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setChoice("light"));

    act(() => setSystemDark(true));

    expect(isDark()).toBe(false);
  });
});
