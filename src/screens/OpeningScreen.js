import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import { useChodhiQTheme } from '../context/ThemeContext';

export default function OpeningScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  const goGuest = () => navigation.replace('MainTabs');
  return (
    <SafeAreaView style={[s.page, { backgroundColor: palette.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={s.content}
      >
        <TouchableOpacity accessibilityRole="button" onPress={goGuest} style={s.skip}>
          <Text style={[s.skipText, { color: palette.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
        <View style={s.logoLockup}>
          <Image
            source={require('../../assets/chodhiq-full-logo-transparent.png')}
            style={s.logo}
            resizeMode="contain"
            accessibilityLabel="ChodhiQ"
          />
          <Text style={[s.tagline, { color: palette.textTertiary }]}>ASK · CONNECT · GROW</Text>
        </View>
        <Text style={[s.title, { color: palette.text }]}>
          Discover great{`\n`}places <Text style={{ color: palette.primary }}>near you</Text>
        </Text>
        <Text style={[s.body, { color: palette.textSecondary }]}>
          Find restaurants, shops, services{`\n`}and more — all in one place.
        </Text>
        <Image
          source={require('../../assets/theme/onboarding-illustration.webp')}
          style={s.hero}
          resizeMode="contain"
          accessibilityLabel="Phone map with nearby place categories"
        />
        <View style={s.dots}>
          <View style={[s.dotActive, { backgroundColor: palette.primary }]} />
          <View style={[s.dot, { backgroundColor: palette.border }]} />
          <View style={[s.dot, { backgroundColor: palette.border }]} />
        </View>
        <View style={s.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate('Welcome', { initialMode: 'signup' })}
            activeOpacity={0.86}
            style={[s.primary, { backgroundColor: palette.primary }]}
          >
            <Text style={[s.primaryText, { color: palette.onPrimary }]}>Create account</Text>
            <ArrowRight size={20} strokeWidth={1.75} color={palette.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => navigation.navigate('Welcome', { initialMode: 'signin' })}
            activeOpacity={0.8}
            style={[
              s.secondary,
              { backgroundColor: palette.surface, borderColor: palette.primary },
            ]}
          >
            <Text style={[s.secondaryText, { color: palette.primary }]}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={goGuest}>
            <Text style={[s.guest, { color: palette.text }]}>Continue as guest</Text>
          </TouchableOpacity>
        </View>
        <View style={[s.homeIndicator, { backgroundColor: palette.textTertiary }]} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  skip: { alignSelf: 'flex-end', paddingVertical: 10, paddingHorizontal: 2 },
  skipText: { fontSize: 14 },
  logoLockup: { alignSelf: 'center', alignItems: 'center', marginTop: 10 },
  logo: { width: 164, height: 48 },
  tagline: { fontSize: 10, letterSpacing: 3, fontWeight: '600', marginTop: -5 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700', textAlign: 'center', marginTop: 24 },
  body: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 12 },
  hero: { width: '100%', height: 220, marginTop: 8 },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  dotActive: { width: 24, height: 8, borderRadius: 999 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  actions: { marginTop: 18, gap: 10 },
  primary: {
    height: 54,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { fontSize: 16, fontWeight: '600' },
  secondary: {
    height: 54,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 16, fontWeight: '600' },
  guest: { fontSize: 14, textAlign: 'center', paddingVertical: 6 },
  homeIndicator: {
    width: 120,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginTop: 'auto',
  },
});
