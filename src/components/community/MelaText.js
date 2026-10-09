import React from 'react';
import { StyleSheet } from 'react-native';
import Text from '../AppText';
import Input from '../AppTextInput';

function fontFor(style) {
  const flat = StyleSheet.flatten(style) || {};
  const weight = flat.fontWeight;
  return (
    flat.fontFamily ||
    (weight === 'bold' || Number(weight) >= 600 ? 'Poppins_600SemiBold' : 'Poppins_400Regular')
  );
}

export default function MelaText({ style, ...props }) {
  return <Text {...props} style={[style, { fontFamily: fontFor(style) }]} />;
}

export function MelaInput({ style, ...props }) {
  return <Input {...props} style={[style, { fontFamily: fontFor(style) }]} />;
}
