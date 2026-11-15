import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { spacing, typography } from '../theme/theme';
import { useChodhiQTheme } from '../context/ThemeContext';
import GlassView from './GlassView';
import GlowIconButton from '../../components/ui/GlowIconButton';

export default function ScreenHeader({ navigation, title, subtitle, right, showBack = true }) {
  const { palette } = useChodhiQTheme();
  const [actionWidth, setActionWidth] = useState(44);
  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { borderBottomColor: palette.border }]}>
      <GlassView
        pointerEvents="none"
        intensity={44}
        style={[StyleSheet.absoluteFill, styles.headerGlass, { borderColor: palette.border }]}
      />
      <View style={styles.row}>
        <View style={[styles.side, { width: actionWidth }]}>
          {showBack ? (
            <GlowIconButton
              accessibilityRole="button"
              accessibilityLabel="Go back"
              size={40}
              variant="secondary"
              icon={<ArrowLeft size={20} color={palette.text} />}
              style={[
                styles.backButton,
                { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
              ]}
              onPress={() => navigation.goBack()}
            />
          ) : null}
        </View>
        <View style={styles.copy}>
          <Text style={[typography.h2, styles.title, { color: palette.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: palette.text2 }]}>{subtitle}</Text>
          ) : null}
        </View>
        <View
          style={[styles.side, { minWidth: 44 }]}
          onLayout={({ nativeEvent }) =>
            setActionWidth(Math.max(44, Math.ceil(nativeEvent.layout.width)))
          }
        >
          {right || <View style={styles.back} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: 'transparent', borderBottomWidth: 1, overflow: 'hidden' },
  headerGlass: { borderWidth: 0 },
  row: {
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: spacing.md,
  },
  side: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: { flex: 1, minWidth: 0, paddingHorizontal: 8, alignItems: 'center' },
  title: { fontSize: 20, textAlign: 'center' },
  subtitle: { fontSize: 11, marginTop: 2, textAlign: 'center' },
});
