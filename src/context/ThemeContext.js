import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const paletteOptions = [
  { id: 'fresh', name: 'Light', swatches: ['#FFFFFF', '#F1F3F2', '#10B84A'] },
  { id: 'dark', name: 'Dark', swatches: ['#0B0F0D', '#151A18', '#35D65F'] },
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
  overlay: t.id === 'dark' ? 'rgba(11,15,13,.80)' : 'rgba(15,23,42,.48)',
  skeleton: t.surfaceAlt,
});

const palettes = {
  fresh: aliases({
    id: 'fresh',
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceAlt: '#F1F3F2',
    surfaceRaised: '#FFFFFF',
    field: '#F1F3F2',
    border: '#E6EAE8',
    primary: '#10B84A',
    primaryPressed: '#0EA042',
    primaryTint: '#E7F8EE',
    onPrimary: '#FFFFFF',
    accent: '#16A34A',
    accentTint: '#FFF4D8',
    text: '#101817',
    textSecondary: '#5B6866',
    textTertiary: '#9AA5A2',
    star: '#F5A623',
    heart: '#EF4444',
    shadow: 'rgba(15,23,42,0.06)',
    tertiary: '#E07A5F',
    cardRadius: 16,
    chipRadius: 10,
    imageRadius: 12,
    categoryTints: ['#E8F5EE', '#E8F0FA', '#FBE8EC', '#E6F3F1', '#F2ECFA', '#F1EEE8'],
  }),
  dark: aliases({
    id: 'dark',
    bg: '#0B0F0D',
    surface: '#151A18',
    surfaceAlt: '#1E2422',
    surfaceRaised: '#2A312E',
    border: '#262D2A',
    primary: '#16A34A',
    primaryPressed: '#12813B',
    primaryTint: '#14301F',
    onPrimary: '#0B0F0D',
    accent: '#35D65F',
    accentTint: '#3A3420',
    text: '#F2F5F3',
    textSecondary: '#9BA3A0',
    textTertiary: '#6B7370',
    star: '#F5A623',
    heart: '#FF5A5A',
    shadow: 'rgba(0,0,0,0.5)',
    tertiary: '#FF5A5A',
    cardRadius: 16,
    chipRadius: 10,
    imageRadius: 12,
    categoryTints: ['#14301F', '#1E2A2E', '#302122', '#242135', '#1D292F', '#292720'],
  }),
};

const ThemeContext = createContext(null);
export function ChodhiQThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState('system');
  const transition = useRef(new Animated.Value(1)).current;
  const mode = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'fresh') : preference;
  useEffect(() => {
    AsyncStorage.getItem('chodhiq-theme')
      .then((value) => {
        const migrated = {
          primary: 'fresh',
          light: 'fresh',
          midnight: 'dark',
          premium: 'fresh',
          green: 'fresh',
          teal: 'dark',
          coral: 'fresh',
          warm: 'fresh',
        }[value];
        const next = migrated || value;
        if (next === 'system' || paletteOptions.some((option) => option.id === next)) {
          setPreference(next);
        }
      })
      .catch(() => {});
  }, []);
  const setMode = (next) => {
    if (next !== 'system' && !paletteOptions.some((option) => option.id === next)) return;
    transition.stopAnimation();
    Animated.sequence([
      Animated.timing(transition, { toValue: 0.82, duration: 80, useNativeDriver: true }),
      Animated.timing(transition, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setPreference(next);
    AsyncStorage.setItem('chodhiq-theme', next).catch(() => {});
  };
  const cycle = () => {
    const index = paletteOptions.findIndex((option) => option.id === mode);
    setMode(paletteOptions[(index + 1) % paletteOptions.length].id);
  };
  const palette = palettes[mode];
  const value = useMemo(
    () => ({
      mode,
      preference,
      resolvedMode: mode,
      palette,
      isDark: mode === 'dark',
      toggle: cycle,
      setMode,
      options: paletteOptions,
      transition,
    }),
    [mode, preference, transition],
  );
  return (
    <ThemeContext.Provider value={value}>
      <Animated.View style={{ flex: 1, opacity: transition }}>{children}</Animated.View>
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
export const useChodhiQTheme = useTheme;
