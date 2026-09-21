import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme/theme';
import { useChodhiQTheme } from '../context/ThemeContext';

export default function ScreenHeader({ navigation, title, subtitle, right, showBack = true }) {
  const { palette } = useChodhiQTheme();
  return (
    <View
      style={[styles.safe, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}
    >
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[
              styles.backButton,
              { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
            ]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={20} color={palette.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.back} />
        )}
        <View style={styles.copy}>
          <Text style={[typography.h2, styles.title, { color: palette.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: palette.text2 }]}>{subtitle}</Text>
          ) : null}
        </View>
        {right || <View style={styles.back} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, borderBottomWidth: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: { flex: 1, alignItems: 'center' },
  title: { fontSize: 20 },
  subtitle: { fontSize: 11, marginTop: 2 },
});
