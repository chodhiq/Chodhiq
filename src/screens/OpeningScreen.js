/* eslint-disable react-hooks/immutability -- Reanimated shared values are intentionally updated for the slide transition. */
import React, { useEffect, useRef, useState } from 'react';
import { AppState, ImageBackground, PanResponder, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Text from '../components/AppText';
import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import { useChodhiQTheme } from '../context/ThemeContext';
import useEffectsLevel from '../hooks/useEffectsLevel';

const AUTO_ADVANCE_MS = 3500;

const pages = [
  {
    title: 'Your neighbourhood,\nwithin reach.',
    body: 'Find the places, services and little gems around you.',
    image: require('../../assets/theme/onboarding-illustration.webp'),
    label: 'A map pin showing nearby places on a phone',
  },
  {
    title: 'Good local finds\nstart with a question.',
    body: 'Ask your community and get useful answers from people who know.',
    image: require('../../assets/generated/onboarding-london.webp'),
    label: 'People exploring London together',
  },
  {
    title: 'Choose local.\nGrow together.',
    body: 'Discover trusted businesses and share the experiences that help them thrive.',
    image: require('../../assets/generated/restaurant-interior.webp'),
    label: 'A welcoming independent restaurant',
  },
];

// One full-screen image layer. All three are stacked; each one's opacity follows
// the shared `progress` value, so moving between slides is a true crossfade.
function FadeImage({ item, index, progress }) {
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [index - 1, index, index + 1], [0, 1, 0], Extrapolation.CLAMP),
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fadeStyle]}>
      <ImageBackground
        source={item.image}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
        imageStyle={s.backgroundImage}
        accessibilityLabel={item.label}
      />
    </Animated.View>
  );
}

export default function OpeningScreen({ navigation }) {
  const { palette } = useChodhiQTheme();
  const canAnimate = useEffectsLevel() === 'full';
  const isFocused = useIsFocused();
  const [pageIndex, setPageIndex] = useState(0);
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');
  const progress = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const contentTransitionStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const item = pages[pageIndex];

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppIsActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!canAnimate || !appIsActive || !isFocused) return undefined;
    const timer = setTimeout(() => {
      setPageIndex((currentIndex) => (currentIndex + 1) % pages.length);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [appIsActive, canAnimate, isFocused, pageIndex]);

  // Crossfade the background images.
  useEffect(() => {
    progress.value = canAnimate ? withTiming(pageIndex, { duration: 600 }) : pageIndex;
    return () => cancelAnimation(progress);
  }, [canAnimate, pageIndex, progress]);

  // Fade the text and buttons in after each change.
  useEffect(() => {
    contentOpacity.value = canAnimate ? 0 : 1;
    if (canAnimate) contentOpacity.value = withTiming(1, { duration: 220 });
    return () => cancelAnimation(contentOpacity);
  }, [canAnimate, contentOpacity, pageIndex]);

  // Horizontal swipe still changes slides (without scrolling the page).
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) setPageIndex((i) => Math.min(i + 1, pages.length - 1));
        else if (g.dx > 40) setPageIndex((i) => Math.max(i - 1, 0));
      },
    }),
  ).current;

  const goGuest = () => {
    AsyncStorage.setItem('chodhiq-onboarding-complete', 'true').catch((error) =>
      console.warn('Could not save onboarding completion.', error.message),
    );
    navigation.replace('MainTabs');
  };
  const goToPage = (index) => setPageIndex(index);
  const nextPage = () => {
    if (pageIndex < pages.length - 1) {
      goToPage(pageIndex + 1);
      return;
    }
    navigation.navigate('Welcome', { initialMode: 'signup' });
  };

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: 'transparent' }]}>
      <View style={s.slide} {...swipe.panHandlers}>
        {pages.map((page, index) => (
          <FadeImage key={page.label} item={page} index={index} progress={progress} />
        ))}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(8,10,9,0.16)', 'rgba(8,10,9,0.13)', '#080A09']}
          locations={[0, 0.42, 0.83]}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.header}>
          <Text style={[s.brand, { color: palette.text }]}>ChodhiQ</Text>
          <TouchableOpacity
            testID="btn-onboarding-skip"
            accessibilityRole="button"
            onPress={goGuest}
            style={s.skip}
            hitSlop={10}
          >
            <Text style={[s.skipText, { color: palette.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[s.bottomContent, contentTransitionStyle]}>
          <Text style={[s.eyebrow, { color: palette.primary }]}>ASK · CONNECT · GROW</Text>
          <Text style={[s.title, { color: palette.text }]}>{item.title}</Text>
          <Text style={[s.body, { color: palette.textSecondary }]}>{item.body}</Text>

          <View style={s.progress} accessibilityLabel={`Screen ${pageIndex + 1} of 3`}>
            {pages.map((page, dotIndex) => (
              <TouchableOpacity
                key={page.label}
                accessibilityRole="button"
                accessibilityLabel={`Go to intro screen ${dotIndex + 1}`}
                onPress={() => goToPage(dotIndex)}
                style={s.progressTouch}
              >
                <View
                  style={[
                    s.progressLine,
                    {
                      backgroundColor:
                        dotIndex === pageIndex ? palette.primary : 'rgba(255,255,255,0.3)',
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            testID="btn-onboarding-continue"
            accessibilityRole="button"
            onPress={nextPage}
            activeOpacity={0.86}
            style={[s.primary, { backgroundColor: palette.primary }]}
          >
            <Text style={[s.primaryText, { color: palette.onPrimary }]}>
              {pageIndex === pages.length - 1 ? 'Create account' : 'Continue'}
            </Text>
            <ArrowRight size={20} strokeWidth={1.75} color={palette.onPrimary} />
          </TouchableOpacity>
          <View style={s.footerLinks}>
            <TouchableOpacity
              testID="btn-sign-in"
              accessibilityRole="button"
              onPress={() => navigation.navigate('Welcome', { initialMode: 'signin' })}
              hitSlop={8}
            >
              <Text style={[s.footerLink, { color: palette.textSecondary }]}>Sign in</Text>
            </TouchableOpacity>
            <View style={[s.footerDivider, { backgroundColor: palette.border }]} />
            <TouchableOpacity
              testID="btn-continue-as-guest"
              accessibilityRole="button"
              onPress={goGuest}
              hitSlop={8}
            >
              <Text style={[s.footerLink, { color: palette.textSecondary }]}>
                Continue as guest
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1 },
  slide: { flex: 1, justifyContent: 'space-between', overflow: 'hidden' },
  backgroundImage: { opacity: 0.94 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
    paddingTop: 14,
  },
  brand: { fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
  skip: { paddingVertical: 8, paddingHorizontal: 4 },
  skipText: { fontSize: 14, fontWeight: '500' },
  bottomContent: { paddingHorizontal: 28, paddingBottom: 16 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 13 },
  title: { fontSize: 38, lineHeight: 44, fontWeight: '700', letterSpacing: -0.8 },
  body: { fontSize: 16, lineHeight: 24, marginTop: 12, maxWidth: 340 },
  progress: { flexDirection: 'row', gap: 8, marginTop: 25, marginBottom: 23 },
  progressTouch: { flex: 1, paddingVertical: 8 },
  progressLine: { height: 3, borderRadius: 999 },
  primary: {
    height: 54,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { fontSize: 16, fontWeight: '700' },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 18,
  },
  footerLink: { fontSize: 13, fontWeight: '500' },
  footerDivider: { width: 1, height: 14 },
});
