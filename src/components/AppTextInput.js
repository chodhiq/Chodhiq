import React, { useContext, useEffect } from 'react';
import { KeyboardFormContext } from '../context/KeyboardFormContext';
import { Platform, StyleSheet, TextInput as NativeTextInput } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import useEffectsLevel from '../hooks/useEffectsLevel';

import { fonts } from '../theme/theme';

const familyByWeight = {
  normal: fonts.regular,
  400: fonts.regular,
  500: fonts.medium,
  600: fonts.semibold,
  bold: fonts.bold,
  700: fonts.bold,
  800: fonts.extraBold,
  900: fonts.extraBold,
};

const AnimatedTextInput = Animated.createAnimatedComponent(NativeTextInput);

export default function AppTextInput({ style, showChrome = true, onFocus, onBlur, ...props }) {
  const revealInput = useContext(KeyboardFormContext);
  const effectsLevel = useEffectsLevel();
  const canAnimate = effectsLevel === 'full';
  const focusProgress = useSharedValue(0);
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontFamily =
    flatStyle.fontFamily || familyByWeight[flatStyle.fontWeight ?? 400] || fonts.regular;
  const focusStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      ['rgba(255,255,255,0.12)', 'rgba(31,229,160,0.78)'],
    ),
    shadowColor: '#1FE5A0',
    shadowOpacity: Platform.OS === 'android' ? 0 : focusProgress.value * 0.28,
    shadowRadius: interpolate(focusProgress.value, [0, 1], [0, 12]),
    elevation: Platform.OS === 'android' ? focusProgress.value * 3 : 0,
  }));
  useEffect(() => {
    focusProgress.value = canAnimate ? withTiming(0, { duration: 160 }) : 0;
  }, [canAnimate, focusProgress]);
  return (
    <AnimatedTextInput
      {...props}
      underlineColorAndroid={props.underlineColorAndroid || 'transparent'}
      onBlur={(event) => {
        onBlur?.(event);
        revealInput?.blur();
        focusProgress.value = canAnimate ? withTiming(0, { duration: 160 }) : 0;
      }}
      onFocus={(event) => {
        onFocus?.(event);
        revealInput?.focus();
        focusProgress.value = canAnimate ? withTiming(1, { duration: 160 }) : 1;
      }}
      style={[
        {
          minWidth: 0,
          includeFontPadding: false,
          textAlignVertical: props.multiline ? 'top' : 'center',
        },
        style,
        showChrome
          ? {
              borderWidth: flatStyle.borderWidth ?? 1,
              borderRadius: flatStyle.borderRadius ?? 14,
              borderColor: 'rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(11,18,16,0.84)',
              paddingHorizontal: flatStyle.paddingHorizontal ?? 12,
            }
          : {
              borderWidth: 0,
              borderRadius: 0,
              borderColor: 'transparent',
              backgroundColor: 'transparent',
              paddingHorizontal: 0,
            },
        showChrome ? focusStyle : null,
        { fontFamily, fontWeight: 'normal' },
      ]}
    />
  );
}
