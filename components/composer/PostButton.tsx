import { memo, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { Send } from 'lucide-react-native';
import type { SharedValue } from 'react-native-reanimated';
import { theme } from '../../theme';
import GlowButton from '../ui/GlowButton';
import type { FlowState } from './useComposerFlow';

export interface PostButtonProps {
  disabled: boolean;
  state: FlowState;
  compact?: boolean;
  shake: SharedValue<number>;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
}

function PostButton({
  disabled,
  state,
  compact = false,
  shake,
  onPress,
  onPressIn,
  onPressOut,
}: PostButtonProps) {
  const { fontScale } = useWindowDimensions();
  const labelWidth = Math.max(48, 36 * fontScale);
  const buttonWidth = Math.max(compact ? 92 : 112, labelWidth + 56);
  const loading = state === 'uploading';
  const status = useMemo(() => {
    if (loading) return 'loading';
    if (state === 'success') return 'success';
    if (state === 'error') return 'error';
    return 'idle';
  }, [loading, state]);

  return (
    <GlowButton
      testID="btn-post"
      accessibilityLabel={loading ? 'Posting' : 'Post'}
      variant="primary"
      size="md"
      disabledColors={{
        background: '#13251E',
        border: 'rgba(31,229,160,0.28)',
        text: theme.colors.textSecondary,
      }}
      width={buttonWidth}
      height={52}
      label="Post"
      rightIcon={
        <Send
          color={disabled || loading ? theme.colors.textSecondary : theme.colors.textPrimary}
          size={17}
          strokeWidth={2.2}
        />
      }
      status={status}
      disabled={disabled}
      haptic={false}
      externalShake={shake}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    />
  );
}

export default memo(PostButton);
