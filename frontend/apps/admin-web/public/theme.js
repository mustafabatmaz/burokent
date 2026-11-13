// Applies the stored theme before the first paint, so dark mode does not flash white. Loaded as a separate
// file (not inline) so the Content-Security-Policy can stay script-src 'self'.
(() => {
  let choice = "system";
  try {
    choice = localStorage.getItem("bk.theme") || "system";
  } catch {
    // Storage blocked (private mode): follow the device setting
  }
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
})();
