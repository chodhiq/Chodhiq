import { memo, useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../../theme';
import GlowIconButton from '../ui/GlowIconButton';
import PressableScale from '../ui/PressableScale';
import PostButton from './PostButton';
import PostSuccess from './PostSuccess';
import useComposerFlow, { type Post } from './useComposerFlow';
import useEffectsLevel from '../../src/hooks/useEffectsLevel';
import { AppAlert as Alert } from '../../src/components/AppDialog';

const emojiOptions = ['😀', '❤️', '🙌', '🎉', '🙏'];

export interface PostComposerProps {
  onSubmit: (text: string, imageUri?: string) => Promise<Post>;
  onPosted: (post: Post) => void;
  onRequireAuth?: () => void;
  onAuthRequired?: () => void;
  focusComposer?: boolean;
}

function PostComposer({
  onSubmit,
  onPosted,
  onRequireAuth,
  onAuthRequired,
  focusComposer = false,
}: PostComposerProps) {
  const { fontScale, width } = useWindowDimensions();
  const canAnimate = useEffectsLevel() === 'full';
  const compact = width < 420 || fontScale > 1.25;
  const [text, setText] = useState('');
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const handlePosted = useCallback(
    (post: Post) => {
      setText('');
      setImageUri(undefined);
      onPosted(post);
    },
    [onPosted],
  );
  const { state, errorMessage, pressIn, pressOut, submit, shake } = useComposerFlow({
    onSubmit,
    onPosted: handlePosted,
    onAuthRequired,
  });
  const successProgress = useSharedValue(0);
  const errorProgress = useSharedValue(0);
  const cardSuccessStyle = useAnimatedStyle(() => ({
    borderColor:
      errorProgress.value > 0
        ? interpolateColor(
            errorProgress.value,
            [0, 1],
            [
              interpolateColor(
                successProgress.value,
                [0, 1],
                ['rgba(255,255,255,0.08)', 'rgba(31,229,160,0.65)'],
              ),
              'rgba(255,82,82,0.95)',
            ],
          )
        : interpolateColor(
            successProgress.value,
            [0, 1],
            ['rgba(255,255,255,0.08)', 'rgba(31,229,160,0.65)'],
          ),
    shadowColor: interpolateColor(errorProgress.value, [0, 1], [theme.colors.primary, '#FF5252']),
    shadowOpacity:
      errorProgress.value > 0
        ? interpolate(errorProgress.value, [0, 1], [0.2, 0.7])
        : interpolate(successProgress.value, [0, 1], [0, 0.45]),
    shadowRadius:
      errorProgress.value > 0
        ? interpolate(errorProgress.value, [0, 1], [8, 16])
        : interpolate(successProgress.value, [0, 1], [0, 18]),
  }));
  const controlsStyle = useAnimatedStyle(() => ({
    opacity: 1 - successProgress.value,
    transform: [{ scale: 1 - successProgress.value * 0.04 }],
  }));
  const successStyle = useAnimatedStyle(() => ({
    opacity: successProgress.value,
    transform: [{ scale: interpolate(successProgress.value, [0, 1], [0.8, 1]) }],
  }));
  const handleSubmit = useCallback(() => {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }
    void submit(text, imageUri);
  }, [imageUri, onRequireAuth, submit, text]);
  const handlePressIn = useCallback(() => {
    pressIn();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((error: unknown) => {
      console.warn('Unable to trigger post button haptic feedback.', error);
    });
  }, [pressIn]);
  const pickAttachment = useCallback(async (title: string) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(title, 'Allow photo library access to choose an attachment.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled) setImageUri(result.assets[0]?.uri);
    } catch (error) {
      console.warn('Unable to choose a community post attachment.', error);
      Alert.alert(title, 'The attachment could not be opened. Please try again.');
    }
  }, []);
  const chooseEmoji = useCallback(() => {
    setEmojiPickerVisible(true);
  }, []);
  const uploading = state === 'uploading';
  const showingSuccess = state === 'success';

  useEffect(() => {
    successProgress.value = !canAnimate
      ? Number(showingSuccess)
      : showingSuccess
        ? withSpring(1, { damping: 18, stiffness: 160 })
        : withTiming(0, { duration: 200 });
  }, [canAnimate, showingSuccess, successProgress]);

  useEffect(() => {
    if (!focusComposer) return undefined;
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [focusComposer]);

  useEffect(() => {
    if (!canAnimate) {
      errorProgress.value = Number(state === 'error');
      return;
    }
    errorProgress.value =
      state === 'error'
        ? withTiming(1, { duration: 100 }, () => {
            errorProgress.value = withTiming(0, { duration: 1000 });
          })
        : withTiming(0, { duration: 180 });
  }, [canAnimate, errorProgress, state]);

  return (
    <>
      <Animated.View style={[styles.card, compact && styles.compactCard, cardSuccessStyle]}>
        <View style={[styles.stage, compact && styles.compactStage]}>
          <Animated.View
            pointerEvents={showingSuccess ? 'none' : 'auto'}
            style={[styles.normalContent, controlsStyle]}
          >
            <View
              pointerEvents={uploading ? 'none' : 'auto'}
              style={[styles.inputRow, uploading && styles.uploadingControls]}
            >
              <View style={styles.accentLine} />
              <TextInput
                ref={inputRef}
                accessibilityLabel="Write a community post"
                multiline
                value={text}
                onChangeText={setText}
                placeholder="Share something with your community..."
                placeholderTextColor={theme.colors.textSecondary}
                editable={!uploading}
                textAlignVertical="top"
                style={styles.input}
              />
              {imageUri && (
                <View style={styles.attachmentPreview}>
                  <Image source={{ uri: imageUri }} style={styles.attachmentImage} />
                  <GlowIconButton
                    accessibilityRole="button"
                    accessibilityLabel="Remove attachment"
                    onPress={() => setImageUri(undefined)}
                    size={48}
                    variant="danger"
                    style={styles.removeAttachment}
                    icon={<Feather color={theme.colors.textPrimary} name="x" size={14} />}
                  />
                </View>
              )}
            </View>

            {state === 'error' && (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {errorMessage}
              </Text>
            )}

            <View style={[styles.footer, compact && styles.compactFooter]}>
              <View
                pointerEvents={uploading ? 'none' : 'auto'}
                style={[
                  styles.tools,
                  compact && styles.compactTools,
                  uploading && styles.uploadingControls,
                ]}
              >
                <GlowIconButton
                  accessibilityLabel="Add image"
                  onPress={() => void pickAttachment('Choose an image')}
                  size={48}
                  variant="secondary"
                  haptic
                  style={styles.toolButton}
                  icon={<Feather color={theme.colors.textSecondary} name="image" size={19} />}
                />
                <GlowIconButton
                  accessibilityLabel="Add emoji"
                  onPress={chooseEmoji}
                  size={48}
                  variant="secondary"
                  haptic
                  style={styles.toolButton}
                  icon={<Feather color={theme.colors.textSecondary} name="smile" size={19} />}
                />
              </View>
              <PostButton
                disabled={!text.trim()}
                state={state}
                onPress={handleSubmit}
                onPressIn={handlePressIn}
                onPressOut={pressOut}
                compact={compact}
                shake={shake}
              />
            </View>
          </Animated.View>

          <Animated.View pointerEvents="none" style={[styles.successContent, successStyle]}>
            {showingSuccess && <PostSuccess />}
          </Animated.View>
        </View>
      </Animated.View>
      <Modal
        visible={emojiPickerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setEmojiPickerVisible(false)}
      >
        <View style={styles.emojiBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close emoji picker"
            onPress={() => setEmojiPickerVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.emojiPanel}>
            <Text accessibilityRole="header" style={styles.emojiTitle}>
              Add an emoji
            </Text>
            <Text style={styles.emojiSubtitle}>Choose an emoji to add to your post.</Text>
            <View style={styles.emojiGrid}>
              {emojiOptions.map((emoji) => (
                <PressableScale
                  key={emoji}
                  accessibilityRole="button"
                  accessibilityLabel={`Add emoji ${emoji}`}
                  onPress={() => {
                    setText((current) => `${current}${emoji}`);
                    setEmojiPickerVisible(false);
                  }}
                  style={styles.emojiOption}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </PressableScale>
              ))}
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Close emoji picker"
              onPress={() => setEmojiPickerVisible(false)}
              style={styles.emojiClose}
            >
              <Text style={styles.emojiCloseText}>Close</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default memo(PostComposer);

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(11,18,16,0.85)',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
  },
  uploadingControls: {
    opacity: 0.4,
  },
  compactCard: {
    padding: 12,
  },
  stage: {
    height: 184,
    position: 'relative',
  },
  compactStage: {
    height: 180,
  },
  normalContent: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'space-between',
  },
  successContent: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  inputRow: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  accentLine: {
    width: 2,
    marginVertical: 5,
    borderRadius: 1,
    backgroundColor: 'rgba(31,229,160,0.65)',
  },
  input: {
    flex: 1,
    minHeight: 112,
    padding: 0,
    color: theme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
  },
  attachmentPreview: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 52,
    height: 52,
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removeAttachment: {
    position: 'absolute',
    top: -12,
    right: -12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  compactFooter: {
    gap: 5,
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactTools: {
    gap: 4,
  },
  toolButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(5,8,7,0.8)',
  },
  gifLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  error: {
    color: '#FF8A8A',
    fontSize: 13,
  },
  emojiBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  emojiPanel: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
  },
  emojiTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  emojiSubtitle: {
    marginTop: 5,
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  emojiOption: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    backgroundColor: 'rgba(11,18,16,0.78)',
  },
  emojiText: {
    color: theme.colors.textPrimary,
    fontSize: 26,
  },
  emojiClose: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
  },
  emojiCloseText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
