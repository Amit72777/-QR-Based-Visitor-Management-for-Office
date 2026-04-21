/**
 * ThemeContext — global dark/light mode toggle.
 *
 * Saves preference in localStorage so it survives page refreshes.
 * Usage: wrap <App> in <ThemeProvider>, then call useTheme() anywhere.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // Read saved preference, default to 'dark' (original design)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vms-theme') || 'dark';
  });

  // Apply the theme class to <body> so CSS variables kick in
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('vms-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const isDark      = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
