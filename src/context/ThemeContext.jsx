import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('viotrack_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  const isDark = theme === 'dark';

  const applyTheme = (newTheme) => {
    const root = document.documentElement;

    if (newTheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark', 'dark-theme');
    } else {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark', 'dark-theme');
    }

    setThemeState(newTheme);
  };

  const changeTheme = (newTheme, event) => {
    if (newTheme !== 'dark' && newTheme !== 'light') return;
    if (newTheme === theme) return;

    const root = document.documentElement;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const startViewTransition = document.startViewTransition;

    if (typeof startViewTransition !== 'function' || reducedMotion) {
      applyTheme(newTheme);
      return;
    }

    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const hasPointerPosition = event?.detail > 0;
    const x = hasPointerPosition
      ? event.clientX
      : rect
        ? rect.left + rect.width / 2
        : window.innerWidth / 2;
    const y = hasPointerPosition
      ? event.clientY
      : rect
        ? rect.top + rect.height / 2
        : window.innerHeight / 2;
    const radius = Math.max(
      Math.hypot(x, y),
      Math.hypot(window.innerWidth - x, y),
      Math.hypot(x, window.innerHeight - y),
      Math.hypot(window.innerWidth - x, window.innerHeight - y)
    );

    root.style.setProperty('--theme-transition-x', `${x}px`);
    root.style.setProperty('--theme-transition-y', `${y}px`);
    root.style.setProperty('--theme-transition-radius', `${radius}px`);

    startViewTransition.call(document, () => applyTheme(newTheme));
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark', 'dark-theme');
      localStorage.setItem('viotrack_theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark', 'dark-theme');
      localStorage.setItem('viotrack_theme', 'light');
    }
  }, [theme]);

  const toggleTheme = (event) => {
    changeTheme(theme === 'dark' ? 'light' : 'dark', event);
  };

  const setTheme = (newTheme) => {
    changeTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
