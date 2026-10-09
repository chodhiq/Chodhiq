import React, { useContext } from 'react';
import { KeyboardFormContext } from '../context/KeyboardFormContext';
import { StyleSheet, TextInput as NativeTextInput } from 'react-native';

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

export default function AppTextInput({ style, onFocus, onBlur, ...props }) {
  const revealInput = useContext(KeyboardFormContext);
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontFamily =
    flatStyle.fontFamily || familyByWeight[flatStyle.fontWeight ?? 400] || fonts.regular;
  return (
    <NativeTextInput
      {...props}
      onBlur={(event) => {
        onBlur?.(event);
        revealInput?.blur();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        revealInput?.focus();
      }}
      style={[
        {
          minWidth: 0,
          includeFontPadding: false,
          textAlignVertical: props.multiline ? 'top' : 'center',
        },
        style,
        { fontFamily, fontWeight: 'normal' },
      ]}
    />
  );
}
