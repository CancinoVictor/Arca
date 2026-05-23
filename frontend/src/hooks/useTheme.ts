import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

export function getSystemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
}

export function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // ignore
  }
  return getSystemTheme();
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;

  const themeColor = theme === 'dark' ? '#000000' : '#F2F2F7';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', themeColor);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;

    const onChange = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return; // user explicitly chose a theme
      } catch {
        // ignore
      }
      setThemeState(getSystemTheme());
    };

    // Safari < 14 uses addListener/removeListener
    type LegacyMQ = { addListener(fn: () => void): void; removeListener(fn: () => void): void };
    if ('addEventListener' in mq) mq.addEventListener('change', onChange);
    else (mq as unknown as LegacyMQ).addListener(onChange);

    return () => {
      if ('removeEventListener' in mq) mq.removeEventListener('change', onChange);
      else (mq as unknown as LegacyMQ).removeListener(onChange);
    };
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, setTheme, toggleTheme };
}
