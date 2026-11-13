import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

// Same key as the inline script in index.html, which applies the theme before the first paint
const STORAGE_KEY = "bk.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function apply(choice: ThemeChoice): void {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme(): { choice: ThemeChoice; setChoice: (choice: ThemeChoice) => void } {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);

  useEffect(() => {
    apply(choice);
    if (choice !== "system") {
      return undefined;
    }
    const media = window.matchMedia(DARK_QUERY);
    const follow = () => apply("system");
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, [choice]);

  const setChoice = useCallback((next: ThemeChoice) => {
    try {
      if (next === "system") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Storage can be blocked (private mode); the choice then lasts for this visit only
    }
    setChoiceState(next);
  }, []);

  return { choice, setChoice };
}

export type Theme = ReturnType<typeof useTheme>;

/** One theme state for the whole app, provided at the root. */
export const ThemeContext = createContext<Theme | null>(null);

export function useThemeContext(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error("useThemeContext needs ThemeContext");
  }
  return theme;
}
