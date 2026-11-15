import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { Check } from 'lucide-react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useEffectsLevel from '../../src/hooks/useEffectsLevel';
import useReducedMotion from '../../src/hooks/useMotionPreferences';
import { theme } from '../../theme';
import GlowButton from './GlowButton';
import PressableScale from './PressableScale';

export interface GlowSheetOption {
  id: string;
  label: string;
  selected?: boolean;
  emoji?: string;
  icon?: ReactNode;
}

interface GlowSheetProps {
  visible: boolean;
  title: string;
  subtitle: string;
  options: GlowSheetOption[];
  onSelect: (option: GlowSheetOption) => void;
  onClose: () => void;
  mode?: 'list' | 'grid';
}

function GlowSheet({
  visible,
  title,
  subtitle,
  options,
  onSelect,
  onClose,
  mode = 'list',
}: GlowSheetProps) {
  const modalRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const effectsLevel = useEffectsLevel();
  const reducedMotion = useReducedMotion();
  const animate = effectsLevel === 'full' && !reducedMotion;
  const snapPoints = useMemo(() => (mode === 'grid' ? ['42%'] : ['50%', '78%']), [mode]);

  useEffect(() => {
    if (!visible) {
      modalRef.current?.dismiss();
      return undefined;
    }
    const frame = requestAnimationFrame(() => modalRef.current?.present());
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.68}
        pressBehavior="close"
      />
    ),
    [],
  );
  const renderHandle = useCallback(
    () => (
      <View style={styles.handleArea}>
        <View style={styles.handle} />
      </View>
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enableOverDrag={animate}
      animateOnMount={animate}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
      backgroundStyle={styles.background}
      onDismiss={onClose}
    >
      {visible ? (
        <BottomSheetView style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <BlurView
            pointerEvents="none"
            intensity={effectsLevel === 'full' ? 42 : effectsLevel === 'reduced' ? 24 : 0}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(31,229,160,0.12)', 'rgba(11,18,16,0.96)', 'rgba(5,8,7,0.98)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <BottomSheetScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.options, mode === 'grid' && styles.gridOptions]}
          >
            {options.map((option) => (
              <PressableScale
                key={option.id}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: Boolean(option.selected) }}
                onPress={() => onSelect(option)}
                style={[
                  styles.option,
                  option.selected && styles.selectedOption,
                  mode === 'grid' && styles.gridOption,
                ]}
              >
                {option.emoji ? (
                  <Text style={styles.emoji}>{option.emoji}</Text>
                ) : option.icon ? (
                  <View style={styles.optionIcon}>{option.icon}</View>
                ) : null}
                {mode !== 'grid' && <Text style={styles.optionLabel}>{option.label}</Text>}
                {option.selected ? (
                  <Check
                    accessibilityElementsHidden
                    color={theme.colors.primary}
                    size={20}
                    strokeWidth={2.5}
                  />
                ) : null}
              </PressableScale>
            ))}
          </BottomSheetScrollView>
          <GlowButton
            label="Close"
            variant="ghost"
            size="md"
            stretch
            onPress={onClose}
            buttonStyle={styles.closeButton}
          />
        </BottomSheetView>
      ) : null}
    </BottomSheetModal>
  );
}

export default GlowSheet;

const styles = StyleSheet.create({
  background: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 2,
    borderColor: theme.colors.primary,
  },
  handleArea: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
  sheet: {
    flex: 1,
    overflow: 'hidden',
    paddingHorizontal: 20,
  },
  heading: {
    gap: 5,
    paddingBottom: 16,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  options: {
    gap: 8,
    paddingBottom: 12,
  },
  gridOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 16,
    backgroundColor: 'rgba(11,18,16,0.78)',
  },
  selectedOption: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(31,229,160,0.1)',
  },
  gridOption: {
    width: 56,
    height: 56,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 0,
    borderRadius: 18,
  },
  optionIcon: {
    width: 22,
    alignItems: 'center',
  },
  optionLabel: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  emoji: {
    color: theme.colors.textPrimary,
    fontSize: 26,
  },
  closeButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
