import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'linkvault_theme';
const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} });

function readStoredTheme() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // storage unavailable (e.g. Safari private mode)
  }
  return null;
}

function initialTheme() {
  if (typeof window === 'undefined') return 'dark';
  const current = document.documentElement.dataset.theme;
  if (current === 'light' || current === 'dark') return current;
  return readStoredTheme() ?? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (readStoredTheme()) return undefined;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e) => {
      if (!readStoredTheme()) setTheme(e.matches ? 'light' : 'dark');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore — theme still applies for this session
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
