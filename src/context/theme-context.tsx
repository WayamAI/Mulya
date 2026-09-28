"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";

export { THEME_STORAGE_KEY, type ThemeMode };

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/*
 * The theme lives on <html data-theme>, set before first paint by the inline
 * script in the root layout (cookie, then localStorage). React reads it from
 * there with useSyncExternalStore: the server snapshot is the light default,
 * and the client snapshot takes over right after hydration without a mismatch.
 * The layout no longer reads cookies, so pages can be prerendered.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readTheme(): ThemeMode {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function persist(theme: ThemeMode) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  document.cookie = `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`;
  listeners.forEach((listener) => listener());
}

export function ThemeProvider({
  children,
  initialTheme = "light",
}: {
  children: ReactNode;
  /** Theme assumed while prerendering and hydrating. */
  initialTheme?: ThemeMode;
}) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => initialTheme);

  const setTheme = useCallback((next: ThemeMode) => persist(next), []);

  const toggleTheme = useCallback(() => persist(readTheme() === "light" ? "dark" : "light"), []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === "dark",
    }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
