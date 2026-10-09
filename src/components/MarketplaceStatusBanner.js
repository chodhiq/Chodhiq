import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';

export default function MarketplaceStatusBanner({
  offline,
  loading,
  lastUpdatedAt,
  onRetry,
  palette,
}) {
  if (!offline) return null;
  const updated = lastUpdatedAt ? new Date(lastUpdatedAt) : null;
  const lastUpdatedLabel =
    updated && !Number.isNaN(updated.getTime()) ? updated.toLocaleString() : null;

  return (
    <View
      accessibilityRole="summary"
      style={[styles.banner, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={styles.message}>
        <Text style={[styles.title, { color: palette.text }]}>
          {lastUpdatedLabel
            ? 'Offline — showing saved directory data'
            : 'Directory could not be refreshed'}
        </Text>
        <Text style={[styles.detail, { color: palette.text2 }]}>
          {lastUpdatedLabel
            ? `Last updated ${lastUpdatedLabel}`
            : 'No saved directory snapshot is available yet.'}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={loading ? 'Retrying directory refresh' : 'Retry directory refresh'}
        disabled={loading}
        onPress={onRetry}
        style={[styles.retry, { backgroundColor: palette.primary }]}
      >
        <Text style={[styles.retryText, { color: palette.primaryActionText }]}>
          {loading ? 'Retrying' : 'Retry'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  message: { flex: 1, gap: 3 },
  title: { fontSize: 13, fontWeight: '700' },
  detail: { fontSize: 12, lineHeight: 17 },
  retry: { borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9 },
  retryText: { fontSize: 12, fontWeight: '700' },
});
