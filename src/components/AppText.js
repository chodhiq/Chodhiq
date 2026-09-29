import React from 'react';
import { StyleSheet, Text as NativeText } from 'react-native';
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

export default function AppText({ style, ...props }) {
  const flatStyle = StyleSheet.flatten(style) || {};
  const fontFamily =
    flatStyle.fontFamily || familyByWeight[flatStyle.fontWeight ?? 400] || fonts.regular;
  return <NativeText {...props} style={[style, { fontFamily, fontWeight: 'normal' }]} />;
}
