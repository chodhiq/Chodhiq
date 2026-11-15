import { memo } from 'react';
import type { ReactNode } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import GlowButton, { type GlowButtonStatus, type GlowButtonVariant } from './GlowButton';

export interface GlowIconButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  icon: ReactNode;
  size?: 40 | 48 | 56;
  variant?: GlowButtonVariant;
  status?: GlowButtonStatus;
  haptic?: boolean;
  actionFeedback?: boolean;
  style?: StyleProp<ViewStyle>;
}

function GlowIconButton({
  icon,
  size = 48,
  variant = 'secondary',
  status = 'idle',
  haptic = true,
  actionFeedback = true,
  style,
  ...props
}: GlowIconButtonProps) {
  return (
    <GlowButton
      {...props}
      variant={variant}
      size={size === 40 ? 'sm' : size === 48 ? 'md' : 'lg'}
      status={status}
      haptic={haptic}
      actionFeedback={actionFeedback}
      width={size}
      height={size}
      iconOnly
      leftIcon={icon}
      buttonStyle={style}
    />
  );
}

export default memo(GlowIconButton);
