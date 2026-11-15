import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PressableScale as Pressable } from './Motion';
import Text from './AppText';
import { formatDateTime } from '../lib/dateTime';

export default function MarketplaceStatusBanner({
  offline,
  refreshError,
  loading,
  lastUpdatedAt,
  onRetry,
  palette,
}) {
  if ((!offline && !refreshError) || loading) return null;
  const lastUpdatedLabel = lastUpdatedAt ? formatDateTime(lastUpdatedAt) : null;

  return (
    <View
      accessibilityRole="summary"
      style={[styles.banner, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={styles.message}>
        <Text style={[styles.title, { color: palette.text }]}>
          {offline
            ? 'Offline — showing saved directory data'
            : refreshError?.startsWith('Pending changes could not sync')
              ? 'Pending changes could not be synced'
              : 'Directory could not be refreshed'}
        </Text>
        <Text style={[styles.detail, { color: palette.text2 }]}>
          {lastUpdatedLabel
            ? `Last updated ${lastUpdatedLabel}`
            : refreshError || 'No saved directory snapshot is available yet.'}
        </Text>
      </View>
      <Pressable
        testID="btn-retry-directory"
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
