'use client';

import { useEffect, useState } from 'react';

type ThemeChoice = 'system' | 'light' | 'dark';
const THEME_KEY = 'chodhiq-dashboard-theme';

function storedChoice(): ThemeChoice {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // Keep the screenshot-aligned dark palette when browser storage is disabled.
  }
  return 'dark';
}

function applyTheme(choice: ThemeChoice) {
  const dark = choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

export default function ThemeControls() {
  const [choice, setChoice] = useState<ThemeChoice>(storedChoice);

  useEffect(() => {
    const sync = (event: Event) => {
      const next = (event as CustomEvent<ThemeChoice>).detail;
      if (next === 'system' || next === 'light' || next === 'dark') setChoice(next);
    };
    window.addEventListener('chodhiq:theme-choice', sync);
    return () => window.removeEventListener('chodhiq:theme-choice', sync);
  }, []);

  useEffect(() => {
    applyTheme(choice);
    try {
      window.localStorage.setItem(THEME_KEY, choice);
    } catch {
      // Theme selection still applies for this session.
    }
  }, [choice]);

  useEffect(() => {
    if (choice !== 'system') return;
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => applyTheme('system');
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, [choice]);

  return (
    <label className="theme-choice">
      <span>Appearance</span>
      <select aria-label="Appearance" value={choice} onChange={(event) => {
        const next = event.target.value as ThemeChoice;
        setChoice(next);
        window.dispatchEvent(new CustomEvent('chodhiq:theme-choice', { detail: next }));
      }}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
