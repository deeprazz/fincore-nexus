import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export function ThemeToggle({ className = "", showLabel = false }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
      aria-label={`Switch to ${isDark ? "Light" : "Dark"} mode`}
    >
      <span className="theme-toggle-icon">
        {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-indigo-600" />}
      </span>
      {showLabel && (
        <span className="theme-toggle-label">{isDark ? "Light mode" : "Dark mode"}</span>
      )}
    </button>
  );
}

export default ThemeToggle;
