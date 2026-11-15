import type { TextStyle } from 'react-native';

export const theme = {
  colors: {
    background: '#050807',
    surface: '#0B1210',
    border: 'rgba(46,230,160,0.25)',
    primary: '#1FE5A0',
    primaryDark: '#0F5C41',
    primaryDeep: '#0A3D2B',
    onPrimary: '#081B2C',
    danger: '#B42318',
    overlay: 'rgba(0,0,0,.5)',
    textPrimary: '#FFFFFF',
    textSecondary: '#8A9A94',
  },
  radius: {
    card: 28,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  typography: {
    title: { fontSize: 24, fontWeight: '700' },
    subtitle: { fontSize: 15 },
    cardTitle: { fontSize: 22 },
    username: { fontSize: 20, fontWeight: '700' },
  } satisfies Record<'title' | 'subtitle' | 'cardTitle' | 'username', TextStyle>,
} as const;
