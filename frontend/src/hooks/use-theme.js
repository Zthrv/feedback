import { useSyncExternalStore } from "react"

const STORAGE_KEY = "theme"

const listeners = new Set()

function subscribe(onChange) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

// index.html picks the starting theme before the page paints (the saved choice, otherwise the
// device setting), so here the <html> class is the single source of truth.
function setTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")

  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // The theme still applies for this visit
  }

  listeners.forEach((listener) => listener())
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light"
  )

  return {
    theme,
    toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
  }
}
