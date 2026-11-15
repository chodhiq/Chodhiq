import { memo } from 'react';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import PressableScale from './ui/PressableScale';

type AnimatedPressableProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
};

function AnimatedPressable(props: AnimatedPressableProps) {
  return <PressableScale {...props} />;
}

export default memo(AnimatedPressable);
