import { Platform } from 'react-native';

const accents = { primary: '#F4A125', secondary: '#0E6B5C', accent: '#C5392B' };
export const melaColors = {
  dark: {
    ...accents,
    background: '#080A09',
    surface: '#111513',
    textPrimary: '#F3F6F4',
    textSecondary: '#A1ABA5',
    border: '#29312D',
  },
};

export function getMelaPalette() {
  const colors = melaColors.dark;
  return {
    ...colors,
    dark: true,
    bg: colors.background,
    text: colors.textPrimary,
    text2: colors.textSecondary,
    muted: colors.textSecondary,
    surfaceAlt: '#191E1B',
    primarySoft: '#302A18',
    // Marigold requires dark foreground text for readable action labels.
    onPrimary: '#2A2118',
    coral: '#FF9184',
    saffron: colors.primary,
    actionText: colors.primary,
  };
}

export const melaHeadingFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});
