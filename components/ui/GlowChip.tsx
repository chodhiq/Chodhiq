import { memo, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '../../theme';
import PressableScale from './PressableScale';

export interface GlowChipProps {
  label: string;
  testID?: string;
  selected?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: 'button' | 'tab';
}

function GlowChip({
  label,
  testID,
  selected = false,
  disabled = false,
  icon,
  onPress,
  style,
  accessibilityRole = 'button',
}: GlowChipProps) {
  return (
    <PressableScale
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        selected && styles.selected,
        disabled && styles.disabled,
        style,
        selected && styles.selectedGlow,
      ]}
    >
      {icon}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.label, selected && styles.selectedLabel]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

export default memo(GlowChip);

const styles = StyleSheet.create({
  chip: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(11,18,16,0.82)',
  },
  selected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  selectedGlow: {
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.38,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedLabel: { color: theme.colors.onPrimary },
});
