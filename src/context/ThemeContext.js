import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const paletteOptions = [
  { id: 'dark', name: 'Glossy matte black', swatches: ['#080A09', '#111513', '#45E382'] },
];

const aliases = (t) => ({
  ...t,
  mode: t.id,
  dark: t.id === 'dark',
  background: t.bg,
  elevated: t.surfaceRaised,
  surfaceMuted: t.surfaceAlt,
  field: t.field || t.surfaceAlt,
  scriptInk: t.scriptInk || t.primary,
  primaryAction: t.primary,
  primaryStrong: t.primaryPressed,
  primaryActionSoft: t.primaryTint,
  primarySoft: t.primaryTint,
  primaryActionText: t.onPrimary,
  textPrimary: t.text,
  text2: t.textSecondary,
  muted: t.textTertiary,
  divider: t.border,
  rating: t.star,
  saffron: t.star,
  danger: t.heart,
  coral: t.heart,
  success: t.primary,
  statusPositive: t.primary,
  highlightSoft: t.accentTint,
  goldSoft: t.accentTint,
  dangerSoft: t.primaryTint,
  secondaryAccent: t.accent,
  secondarySoft: t.accentTint,
  indigo: t.accent,
  lavenderSoft: t.accentTint,
  nav: t.surface,
  hero: t.bg,
  overlay: 'rgba(5,7,6,.84)',
  skeleton: t.surfaceAlt,
});

const palettes = {
  dark: aliases({
    id: 'dark',
    bg: '#080A09',
    surface: '#111513',
    surfaceAlt: '#191E1B',
    surfaceRaised: '#232A26',
    field: '#171C19',
    border: '#29312D',
    primary: '#20C767',
    primaryPressed: '#18A653',
    primaryTint: '#143322',
    onPrimary: '#06110A',
    accent: '#45E382',
    accentTint: '#302A18',
    text: '#F3F6F4',
    textSecondary: '#A1ABA5',
    textTertiary: '#747E78',
    star: '#F5A623',
    heart: '#FF5A5A',
    shadow: 'rgba(0,0,0,0.62)',
    tertiary: '#FF5A5A',
    cardRadius: 16,
    chipRadius: 10,
    imageRadius: 12,
    categoryTints: ['#143322', '#1E2A2E', '#302122', '#242135', '#1D292F', '#292720'],
  }),
};

const ThemeContext = createContext(null);
export function ChodhiQThemeProvider({ children }) {
  const mode = 'dark';
  const transition = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    AsyncStorage.setItem('chodhiq-theme', 'dark').catch(() => {});
  }, []);
  const setMode = (next) => {
    if (next === 'dark') AsyncStorage.setItem('chodhiq-theme', 'dark').catch(() => {});
  };
  const cycle = () => setMode('dark');
  const palette = palettes.dark;
  const value = useMemo(
    () => ({
      mode,
      preference: mode,
      resolvedMode: mode,
      palette,
      isDark: mode === 'dark',
      communityPalette: {
        ...palette,
        secondary: palette.primary,
        actionText: palette.dark ? palette.text : palette.primaryStrong,
        textPrimary: palette.text,
        textSecondary: palette.text2,
      },
      toggle: cycle,
      setMode,
      options: paletteOptions,
      transition,
    }),
    [mode, transition],
  );
  return (
    <ThemeContext.Provider value={value}>
      <Animated.View style={{ flex: 1, opacity: transition }}>{children}</Animated.View>
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
export const useChodhiQTheme = useTheme;
