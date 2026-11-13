// jsdom has no matchMedia; tests switch the system colour scheme with setSystemDark
let systemDark = false;
const listeners = new Set<(event: MediaQueryListEvent) => void>();

export function resetMatchMedia(): void {
  systemDark = false;
  listeners.clear();
  window.matchMedia = (query: string) =>
    ({
      get matches() {
        return query.includes("dark") && systemDark;
      },
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.delete(listener),
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true,
    }) as unknown as MediaQueryList;
}

export function setSystemDark(dark: boolean): void {
  systemDark = dark;
  for (const listener of listeners) {
    listener({ matches: dark } as MediaQueryListEvent);
  }
}
