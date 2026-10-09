import { MotionTouchable as TouchableOpacity } from '../components/Motion';
import React, { useMemo, useState } from 'react';
import { View, FlatList, ScrollView, StyleSheet } from 'react-native';
import Text from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeartOff } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '../theme/theme';
import { ProviderCardRow } from '../components/ProviderCard';
import { useAppState } from '../context/AppStateContext';
import { useChodhiQTheme } from '../context/ThemeContext';

export default function SavedScreen({ navigation }) {
  const { providers, savedIds, toggleSaved } = useAppState();
  const { palette } = useChodhiQTheme();
  const [tab, setTab] = useState('businesses');
  const savedProviders = useMemo(() => {
    const saved = new Set(savedIds);
    return providers.filter((provider) => saved.has(provider.id));
  }, [providers, savedIds]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: palette.text }]}>Saved</Text>
        <Text style={[typography.caption, { color: palette.text2 }]}>Your favorite providers</Text>
      </View>
      <View style={styles.tabsFrame}>
        <ScrollView
          style={{ flexGrow: 0, flexShrink: 0 }}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabs, { backgroundColor: palette.surfaceAlt }]}
        >
          {['businesses', 'events', 'offers', 'posts'].map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.tab,
                tab === item && styles.tabActive,
                tab === item && { backgroundColor: palette.primary },
              ]}
              onPress={() => setTab(item)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: tab === item ? palette.background : palette.text2 },
                ]}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={tab === 'businesses' ? savedProviders : []}
        keyExtractor={(provider) => String(provider.id)}
        renderItem={({ item: provider }) => (
          <ProviderCardRow
            provider={provider}
            saved
            onSave={() => toggleSaved(provider.id)}
            onPress={() => navigation.navigate('ProviderDetail', { id: provider.id })}
          />
        )}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={false}
        contentContainerStyle={styles.content}
        ListEmptyComponent={
          <View style={styles.empty}>
            <HeartOff size={32} color={palette.muted} />
            <Text style={[styles.emptyText, { color: palette.text2 }]}>
              {tab === 'businesses'
                ? 'Nothing saved yet. Tap the heart on any provider to save it here.'
                : `Saved ${tab} will appear here as you bookmark them.`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  tabsFrame: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  tabs: {
    borderRadius: radius.pill,
    padding: 4,
  },
  tab: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  tabActive: { ...shadows.soft },
  tabText: { fontSize: 11, fontWeight: '800' },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 14 },
});
