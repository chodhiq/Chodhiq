import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import type { PropsWithChildren } from 'react';

export type BackgroundVariant = 'default' | 'subtle' | 'intense';

interface ActiveBackgroundVariant {
  screenId: string;
  variant: BackgroundVariant;
}

interface BackgroundVariantContextValue {
  activeVariant: BackgroundVariant;
  setScreenVariant: (screenId: string, variant: BackgroundVariant | null) => void;
}

const BackgroundVariantContext = createContext<BackgroundVariantContextValue | null>(null);

export function BackgroundVariantProvider({ children }: PropsWithChildren) {
  const [active, setActive] = useState<ActiveBackgroundVariant | null>(null);
  const setScreenVariant = useCallback((screenId: string, variant: BackgroundVariant | null) => {
    setActive((current) => {
      if (variant) {
        if (current?.screenId === screenId && current.variant === variant) return current;
        return { screenId, variant };
      }
      return current?.screenId === screenId ? null : current;
    });
  }, []);
  const value = useMemo(
    () =>
      ({
        activeVariant: active?.variant ?? 'default',
        setScreenVariant,
      }) satisfies BackgroundVariantContextValue,
    [active?.variant, setScreenVariant],
  );

  return (
    <BackgroundVariantContext.Provider value={value}>{children}</BackgroundVariantContext.Provider>
  );
}

export function useBackgroundVariant(): BackgroundVariant {
  return useContext(BackgroundVariantContext)?.activeVariant ?? 'default';
}

export interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  variant?: BackgroundVariant;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'children' | 'style' | 'contentContainerStyle'>;
}

export default function Screen({
  children,
  scroll = false,
  variant = 'default',
  edges = ['top', 'right', 'bottom', 'left'],
  style,
  contentContainerStyle,
  scrollViewProps,
}: ScreenProps) {
  const focused = useIsFocused();
  const screenId = useId();
  const context = useContext(BackgroundVariantContext);
  const setScreenVariant = context?.setScreenVariant;

  useEffect(() => {
    if (!setScreenVariant) return;
    if (focused) setScreenVariant(screenId, variant);
    else setScreenVariant(screenId, null);
  }, [focused, screenId, setScreenVariant, variant]);

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
      {scroll ? (
        <ScrollView
          {...scrollViewProps}
          style={styles.scroll}
          contentContainerStyle={contentContainerStyle}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
