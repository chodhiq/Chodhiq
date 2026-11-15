import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from './AppText';
import { useChodhiQTheme } from '../context/ThemeContext';
import { dismissButtonToast, subscribeToButtonToasts } from '../lib/buttonToast';

export default function ButtonToastHost() {
  const { palette } = useChodhiQTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(
    () =>
      subscribeToButtonToasts((nextToast) => {
        setToast(nextToast);
        if (timer.current) clearTimeout(timer.current);
        timer.current = nextToast
          ? setTimeout(
              () => {
                timer.current = null;
                setToast(null);
              },
              nextToast.onRetry ? 8000 : 3200,
            )
          : null;
      }),
    [],
  );

  if (!toast?.message) return null;
  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { bottom: Math.max(insets.bottom, 8) + 88 }]}
    >
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={[styles.toast, { backgroundColor: palette.surface, borderColor: palette.border }]}
      >
        <Text style={{ color: palette.text, fontSize: 14, lineHeight: 20 }}>{toast.message}</Text>
        {toast.onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry"
            hitSlop={8}
            onPress={() => {
              dismissButtonToast();
              toast.onRetry();
            }}
            style={styles.retry}
          >
            <Text style={{ color: palette.primary, fontSize: 14, fontWeight: '700' }}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10000,
    alignItems: 'center',
  },
  toast: {
    maxWidth: 480,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
    gap: 8,
  },
  retry: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});
