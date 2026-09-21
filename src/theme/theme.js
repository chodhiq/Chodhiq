export const colors = {
  primary: '#16A34A',
  primaryDark: '#15803D',
  primaryLight: '#E8F5EE',
  turmeric: '#FFB000',
  turmericLight: '#FFF4D8',
  coral: '#E97865',
  plum: '#7257D9',
  ocean: '#3188C8',
  accentHalal: '#E84B5F',
  accentBakery: '#F2A900',
  accentBeauty: '#7257D9',
  background: '#F5F7F9',
  surfaceTint: '#F5F7F9',
  card: '#FFFFFF',
  border: '#E8EBEF',
  textPrimary: '#0F172A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#16A34A',
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
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  lift: {
    shadowColor: '#10B84A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
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
