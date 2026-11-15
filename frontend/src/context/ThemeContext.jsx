import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem("fincore_theme");
      if (saved === "light" || saved === "dark") {
        return saved;
      }
    } catch {
      // fallback
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.remove("theme-dark", "theme-light");
    document.documentElement.classList.add(theme === "dark" ? "theme-dark" : "theme-light");
    try {
      localStorage.setItem("fincore_theme", theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (newTheme) => {
    if (newTheme === "light" || newTheme === "dark") {
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

export default ThemeContext;
