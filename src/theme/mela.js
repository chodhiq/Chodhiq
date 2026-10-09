import { Platform } from 'react-native';

const accents = { primary: '#F4A125', secondary: '#0E6B5C', accent: '#C5392B' };
export const melaColors = {
  light: {
    ...accents,
    background: '#FBF4E8',
    surface: '#FFFFFF',
    textPrimary: '#2A2118',
    textSecondary: '#6B5D4F',
    border: '#E8DCC8',
  },
  dark: {
    ...accents,
    background: '#1C1310',
    surface: '#2A1F1A',
    textPrimary: '#F4ECE0',
    textSecondary: '#C2B2A0',
    border: '#3A2B23',
  },
};

export function getMelaPalette(isDark) {
  const colors = melaColors[isDark ? 'dark' : 'light'];
  return {
    ...colors,
    dark: isDark,
    bg: colors.background,
    text: colors.textPrimary,
    text2: colors.textSecondary,
    muted: colors.textSecondary,
    surfaceAlt: isDark ? '#342720' : '#F5EBD9',
    primarySoft: isDark ? '#49301A' : '#FFF0D6',
    // Marigold requires dark foreground text for readable action labels.
    onPrimary: '#2A2118',
    coral: isDark ? '#FF9184' : colors.accent,
    saffron: colors.primary,
    actionText: isDark ? colors.primary : colors.secondary,
  };
}

export const melaHeadingFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});
