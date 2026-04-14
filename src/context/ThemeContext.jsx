import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';

const STORAGE_KEY = 'dy3-theme';

function readStoredTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'dark' || raw === 'light') return raw;
    if (raw != null) {
      try {
        localStorage.setItem(STORAGE_KEY, 'light');
      } catch (_) {
        /* ignore */
      }
    }
  } catch (_) {
    /* ignore */
  }
  return 'light';
}

const ThemeContext = createContext(null);

/** Tells the UA which scheme *this page* uses — avoids mixing OS dark/light with app toggle. */
function syncColorSchemeMeta(isDark) {
  if (typeof document === 'undefined') return;
  const content = isDark ? 'only dark' : 'only light';
  let meta = document.querySelector('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'color-scheme');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

export function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark = theme === 'dark';

  root.classList.add('dy3-no-transitions');
  void root.offsetWidth;

  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  root.classList.toggle('dark', isDark);
  syncColorSchemeMeta(isDark);

  void root.offsetWidth;

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (_) {
    /* ignore */
  }

  setTimeout(() => {
    root.classList.remove('dy3-no-transitions');
  }, 80);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => readStoredTheme());

  useLayoutEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  /** Align <html> if storage drifted from inline script (cached HTML, etc.) */
  useLayoutEffect(() => {
    const stored = readStoredTheme();
    const attr = document.documentElement.getAttribute('data-theme');
    const expected = stored === 'dark' ? 'dark' : 'light';
    if (attr !== expected) applyThemeToDocument(stored);
  }, []);

  /**
   * Other tabs / incognito windows share `localStorage` but not React state.
   * Without this, one tab can stay light while another toggles to dark.
   */
  useEffect(() => {
    const normalizeFromStorageValue = (raw) => {
      if (raw === 'dark' || raw === 'light') return raw;
      return readStoredTheme();
    };

    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || e.storageArea !== localStorage) return;
      const next = normalizeFromStorageValue(e.newValue);
      flushSync(() => {
        applyThemeToDocument(next);
        setThemeState(next);
      });
    };

    const syncFromStorageIfDrifted = () => {
      const stored = readStoredTheme();
      flushSync(() => {
        setThemeState((current) => {
          if (stored === current) return current;
          applyThemeToDocument(stored);
          return stored;
        });
      });
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') syncFromStorageIfDrifted();
    };

    const onPageShow = (e) => {
      if (e.persisted) syncFromStorageIfDrifted();
    };

    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  const setTheme = useCallback((next) => {
    const normalized = next === 'dark' ? 'dark' : 'light';
    flushSync(() => {
      applyThemeToDocument(normalized);
      setThemeState(normalized);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    flushSync(() => {
      setThemeState((t) => {
        const next = t === 'dark' ? 'light' : 'dark';
        applyThemeToDocument(next);
        return next;
      });
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
