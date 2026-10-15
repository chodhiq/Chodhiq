import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import { useChodhiQTheme } from '../context/ThemeContext';

export default function OpeningScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const pages = [
    {
      title: (
        <>
          Discover great{`\n`}places <Text style={{ color: palette.primary }}>near you</Text>
        </>
      ),
      body: <>Find restaurants, shops, services{`\n`}and more — all in one place.</>,
      image: require('../../assets/theme/onboarding-illustration.webp'),
      label: 'Phone map with nearby place categories',
    },
    {
      title: (
        <>
          Connect with{`\n`}local <Text style={{ color: palette.primary }}>businesses</Text>
        </>
      ),
      body: <>Ask questions, compare services{`\n`}and find the right people nearby.</>,
      image: require('../../assets/generated/onboarding-london.webp'),
      label: 'Local people and businesses connected through ChodhiQ',
    },
    {
      title: (
        <>
          Help local businesses{`\n`}
          <Text style={{ color: palette.primary }}>grow</Text>
        </>
      ),
      body: <>Discover trusted places and share{`\n`}your experiences with the community.</>,
      image: require('../../assets/generated/restaurant-interior.webp'),
      label: 'Local business growth and customer reviews',
    },
  ];
  const current = pages[pageIndex];
  const goGuest = () => navigation.replace('MainTabs');
  const nextPage = () => setPageIndex((index) => Math.min(index + 1, pages.length - 1));
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
            source={
              palette.dark
                ? require('../../assets/chodhiq-logo-white.png')
                : require('../../assets/chodhiq-logo-black.png')
            }
            style={s.logo}
            resizeMode="contain"
            accessibilityLabel="ChodhiQ"
          />
          <Text style={[s.tagline, { color: palette.textTertiary }]}>ASK · CONNECT · GROW</Text>
        </View>
        <TouchableOpacity activeOpacity={1} onPress={nextPage} style={s.slide}>
          <Text style={[s.title, { color: palette.text }]}>{current.title}</Text>
          <Text style={[s.body, { color: palette.textSecondary }]}>{current.body}</Text>
          <Image
            source={current.image}
            style={s.hero}
            resizeMode="contain"
            accessibilityLabel={current.label}
          />
        </TouchableOpacity>
        <View style={s.dots}>
          {pages.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={`Intro page ${index + 1}`}
              onPress={() => setPageIndex(index)}
            >
              <View
                style={
                  index === pageIndex
                    ? [s.dotActive, { backgroundColor: palette.primary }]
                    : [s.dot, { backgroundColor: palette.border }]
                }
              />
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.actions}>
          {pageIndex < pages.length - 1 ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setPageIndex((index) => index + 1)}
              activeOpacity={0.86}
              style={[s.primary, { backgroundColor: palette.primary }]}
            >
              <Text style={[s.primaryText, { color: palette.onPrimary }]}>Next</Text>
              <ArrowRight size={20} strokeWidth={1.75} color={palette.onPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => navigation.navigate('Welcome', { initialMode: 'signup' })}
              activeOpacity={0.86}
              style={[s.primary, { backgroundColor: palette.primary }]}
            >
              <Text style={[s.primaryText, { color: palette.onPrimary }]}>Create account</Text>
              <ArrowRight size={20} strokeWidth={1.75} color={palette.onPrimary} />
            </TouchableOpacity>
          )}
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
  slide: { alignItems: 'center' },
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
