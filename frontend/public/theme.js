// Same rule as src/hooks/use-theme.js: the saved choice, otherwise the device setting.
// Kept in its own file so the page needs no inline script.
(function () {
  var saved;

  try {
    saved = localStorage.getItem("theme");
  } catch {
    saved = null; // storage blocked: fall back to the device setting
  }

  var dark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", dark);
})();
