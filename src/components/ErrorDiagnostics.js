import React from 'react';
import { Text } from 'react-native';

export function getDiagnosticComponentStack(componentStack) {
  return String(componentStack || '')
    .split(/\r?\n/)
    .slice(0, 10)
    .join('\n');
}

export default function ErrorDiagnostics({ error, componentStack, style }) {
  if (process.env.EXPO_PUBLIC_DIAGNOSTICS !== 'true') return null;
  const stack = getDiagnosticComponentStack(componentStack);
  return (
    <Text selectable testID="error-diagnostics" style={style}>
      {`Name: ${error?.name || 'Error'}\nMessage: ${error?.message || ''}${stack ? `\n${stack}` : ''}`}
    </Text>
  );
}