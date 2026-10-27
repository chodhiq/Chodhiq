export const colors = {
  primary: '#20C767',
  primaryDark: '#18A653',
  primaryLight: '#143322',
  turmeric: '#FFB000',
  turmericLight: '#302A18',
  coral: '#FF8277',
  plum: '#A491FF',
  ocean: '#68B9F2',
  accentHalal: '#E84B5F',
  accentBakery: '#F2A900',
  accentBeauty: '#A491FF',
  background: '#080A09',
  surfaceTint: '#191E1B',
  card: '#111513',
  border: '#29312D',
  textPrimary: '#F3F6F4',
  textSecondary: '#A1ABA5',
  textMuted: '#747E78',
  success: '#20C767',
  star: '#F5A623',
  danger: '#EF4444',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 16, lg: 16, xl: 24, pill: 999 };

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
};

export const shadows = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 3,
  },
  lift: {
    shadowColor: '#20C767',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
};

export const typography = {
  h1: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: fonts.bold,
    letterSpacing: -0.9,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fonts.semibold,
    letterSpacing: -0.4,
    color: colors.textPrimary,
  },
  body: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: colors.textPrimary },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular, color: colors.textSecondary },
  label: { fontSize: 14, fontFamily: fonts.semibold, color: colors.textPrimary },
};
