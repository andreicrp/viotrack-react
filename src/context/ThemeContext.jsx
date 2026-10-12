import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Moon, Sun, Sparkles } from 'lucide-react';

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

    // Fast, responsive 750ms transition + 240ms exit fade
    themeMessageTimer.current = window.setTimeout(() => {
      setIsClosingThemeOverlay(true);
      themeOverlayCloseTimer.current = window.setTimeout(() => {
        setIsChangingTheme(false);
        setIsClosingThemeOverlay(false);
        themeOverlayCloseTimer.current = null;
      }, 240);
      themeMessageTimer.current = null;
    }, 750);
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
          <div className="theme-change-backdrop" />
          <div className="theme-change-orbit theme-change-orbit-one" />
          <div className="theme-change-orbit theme-change-orbit-two" />
          <div className="theme-change-card">
            <div className={`theme-change-badge ${isDark ? 'badge-dark' : 'badge-light'}`} aria-hidden="true">
              <div className="theme-change-badge-glow" />
              {isDark ? (
                <>
                  <Moon className="theme-change-badge-icon icon-moon" size={28} />
                  <Sparkles className="theme-change-badge-sparkle" size={14} />
                </>
              ) : (
                <>
                  <Sun className="theme-change-badge-icon icon-sun" size={30} />
                  <Sparkles className="theme-change-badge-sparkle" size={14} />
                </>
              )}
            </div>
            <div className="theme-change-copy">
              <div className="theme-change-tag">
                <span className="theme-change-tag-dot" />
                <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
              </div>
              <strong className="theme-change-title">
                {isDark ? 'Switching to Dark' : 'Switching to Light'}
              </strong>
              <span className="theme-change-desc">
                {isDark ? 'Applying OLED contrast & comfort' : 'Brightening your workspace'}
              </span>
            </div>
            <div className="theme-change-progress" aria-hidden="true">
              <span className="theme-change-progress-bar" />
            </div>
          </div>
        </div>
      )}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
