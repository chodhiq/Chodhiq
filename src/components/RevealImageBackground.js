import React, { forwardRef, useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import useReducedMotion from '../hooks/useMotionPreferences';
import { motion } from '../theme/motion';
import { createImageRevealRegistry, imageIdentity } from '../lib/imageRevealRegistry';

const loadedImages = createImageRevealRegistry();

// Same image/background/content geometry as RN ImageBackground. Only the image
// animates, so overlaid text and buttons remain stationary and interactive.
export default forwardRef(function RevealImageBackground(
  {
    source,
    children,
    style,
    imageStyle,
    imageRef,
    onLoad,
    onError,
    importantForAccessibility,
    ...props
  },
  ref,
) {
  const reduced = useReducedMotion();
  const key = imageIdentity(source);
  const ready = reduced || loadedImages.has(key);
  const opacity = useSharedValue(ready ? 1 : 0);
  const scale = useSharedValue(ready ? 1 : motion.image.scale);
  useLayoutEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(scale);
    const shown = reduced || loadedImages.has(key);
    opacity.value = shown ? 1 : 0;
    scale.value = shown ? 1 : motion.image.scale;
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [key, reduced, opacity, scale]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const reveal = () => {
    const alreadyLoaded = loadedImages.has(key);
    loadedImages.mark(key);
    if (reduced || alreadyLoaded) {
      opacity.value = 1;
      scale.value = 1;
      return;
    }
    const config = { duration: motion.image.duration, easing: Easing.out(Easing.cubic) };
    opacity.value = withTiming(1, config);
    scale.value = withTiming(1, config);
  };
  return (
    <View
      ref={ref}
      style={style}
      accessibilityIgnoresInvertColors
      importantForAccessibility={importantForAccessibility}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <Animated.Image
          {...props}
          source={source}
          ref={imageRef}
          importantForAccessibility={importantForAccessibility}
          resizeMethod="resize"
          style={[
            StyleSheet.absoluteFill,
            { width: '100%', height: '100%' },
            imageStyle,
            animatedStyle,
          ]}
          onLoad={(event) => {
            reveal();
            onLoad?.(event);
          }}
          onError={(event) => {
            opacity.value = 1;
            scale.value = 1;
            onError?.(event);
          }}
        />
      </View>
      {children}
    </View>
  );
});
