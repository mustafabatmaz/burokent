import { useCallback, useState } from "react";

/** A boolean UI preference remembered in this browser (for example the collapsed menu). */
export function useStoredFlag(key: string, initial: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initial : stored === "true";
    } catch {
      return initial;
    }
  });
  const update = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, String(next));
      } catch {
        // Not remembered when storage is blocked
      }
      setValue(next);
    },
    [key],
  );
  return [value, update];
}
