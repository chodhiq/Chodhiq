"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const THEME_KEY = "chodhiq-dashboard-theme";

function savedTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeControls() {
  const [theme, setTheme] = useState<Theme>(savedTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const dark = theme === "dark";

  return (
    <button className="theme-toggle" type="button" role="switch" aria-checked={dark}
      aria-label={`Use ${dark ? "light" : "dark"} appearance`}
      title={`Switch to ${dark ? "light" : "dark"} mode`}
      onClick={() => setTheme(dark ? "light" : "dark")}>
      <span aria-hidden="true">{dark ? "☾" : "☀"}</span>
      <span>{dark ? "Dark" : "Light"}</span>
      <i aria-hidden="true" />
    </button>
  );
}

