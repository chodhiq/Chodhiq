import { memo } from 'react';
import type { GestureResponderEvent } from 'react-native';
import GlowButton, { type GlowButtonProps, type GlowButtonStatus } from './GlowButton';

type AsyncGlowButtonProps = Omit<GlowButtonProps, 'onPress' | 'status'> & {
  onPress: (event: GestureResponderEvent) => void | Promise<unknown>;
  status?: GlowButtonStatus;
};

function AsyncGlowButton({ onPress, status, ...props }: AsyncGlowButtonProps) {
  return <GlowButton {...props} status={status} onPress={onPress} />;
}

export default memo(AsyncGlowButton);
