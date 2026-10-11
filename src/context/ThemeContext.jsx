import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  const themeMessageTimer = useRef(null);
  const themeOverlayCloseTimer = useRef(null);
  const [isChangingTheme, setIsChangingTheme] = useState(false);
  const [isClosingThemeOverlay, setIsClosingThemeOverlay] = useState(false);
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
    root.classList.remove('theme-transitioning');
    applyTheme(newTheme);
    setIsChangingTheme(true);
    setIsClosingThemeOverlay(false);
    window.clearTimeout(themeMessageTimer.current);
    window.clearTimeout(themeOverlayCloseTimer.current);
    themeMessageTimer.current = window.setTimeout(() => {
      setIsClosingThemeOverlay(true);
      themeOverlayCloseTimer.current = window.setTimeout(() => {
        setIsChangingTheme(false);
        setIsClosingThemeOverlay(false);
        themeOverlayCloseTimer.current = null;
      }, 320);
      themeMessageTimer.current = null;
    }, 3000);
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

  useEffect(() => () => {
    window.clearTimeout(themeMessageTimer.current);
    window.clearTimeout(themeOverlayCloseTimer.current);
  }, []);

  const toggleTheme = (event) => {
    changeTheme(theme === 'dark' ? 'light' : 'dark', event);
  };

  const setTheme = (newTheme) => {
    changeTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
      {isChangingTheme && (
        <div
          className={`theme-change-overlay ${isDark ? 'theme-change-overlay-dark' : 'theme-change-overlay-light'} ${isClosingThemeOverlay ? 'theme-change-overlay-closing' : ''}`}
          role="status"
          aria-live="polite"
        >
          <div className="theme-change-orbit theme-change-orbit-one" />
          <div className="theme-change-orbit theme-change-orbit-two" />
          <div className="theme-change-card">
            <div className="theme-change-icon" aria-hidden="true">
              {isDark ? (
                <span className="theme-change-moon" />
              ) : (
                <>
                  <span className="theme-change-sun-core" />
                  <span className="theme-change-sun-ray theme-change-sun-ray-one" />
                  <span className="theme-change-sun-ray theme-change-sun-ray-two" />
                  <span className="theme-change-sun-ray theme-change-sun-ray-three" />
                  <span className="theme-change-sun-ray theme-change-sun-ray-four" />
                  <span className="theme-change-sun-ray theme-change-sun-ray-five" />
                  <span className="theme-change-sun-ray theme-change-sun-ray-six" />
                  <span className="theme-change-sun-ray theme-change-sun-ray-seven" />
                  <span className="theme-change-sun-ray theme-change-sun-ray-eight" />
                </>
              )}
            </div>
            <div className="theme-change-copy">
              <strong>Changing theme</strong>
              <span>Preparing your workspace</span>
            </div>
            <div className="theme-change-progress" aria-hidden="true">
              <span />
            </div>
          </div>
        </div>
      )}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
