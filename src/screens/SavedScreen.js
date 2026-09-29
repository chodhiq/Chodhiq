import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
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
  const savedProviders = providers.filter((provider) => savedIds.includes(provider.id));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: palette.text }]}>Saved</Text>
        <Text style={[typography.caption, { color: palette.text2 }]}>Your favorite providers</Text>
      </View>
      <ScrollView
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
              style={[styles.tabText, { color: tab === item ? palette.background : palette.text2 }]}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={styles.content}>
        {tab !== 'businesses' && (
          <View style={styles.empty}>
            <HeartOff size={32} color={palette.muted} />
            <Text style={[styles.emptyText, { color: palette.text2 }]}>
              Saved {tab} will appear here as you bookmark them.
            </Text>
          </View>
        )}
        {tab === 'businesses' && (
          <>
            {savedProviders.length === 0 ? (
              <View style={styles.empty}>
                <HeartOff size={32} color={colors.textMuted} />
                <Text style={styles.emptyText}>
                  Nothing saved yet. Tap the heart on any provider to save it here.
                </Text>
              </View>
            ) : (
              savedProviders.map((p) => (
                <ProviderCardRow
                  key={p.id}
                  provider={p}
                  saved
                  onSave={() => toggleSaved(p.id)}
                  onPress={() => navigation.navigate('ProviderDetail', { id: p.id })}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
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
  tabs: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
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
