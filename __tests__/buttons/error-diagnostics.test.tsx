import React from 'react';
import { render } from '@testing-library/react-native';
import ErrorDiagnostics from '../../src/components/ErrorDiagnostics';

describe('error diagnostics visibility', () => {
  const originalDiagnostics = process.env.EXPO_PUBLIC_DIAGNOSTICS;

  afterEach(() => {
    if (originalDiagnostics === undefined) delete process.env.EXPO_PUBLIC_DIAGNOSTICS;
    else process.env.EXPO_PUBLIC_DIAGNOSTICS = originalDiagnostics;
  });

  test('production configuration shows no error details or component stack', async () => {
    process.env.EXPO_PUBLIC_DIAGNOSTICS = 'false';
    const view = await render(
      <ErrorDiagnostics
        error={Object.assign(new Error('private failure text'), { name: 'PrivateFailure' })}
        componentStack={'at First\n' + Array.from({ length: 11 }, (_, i) => `at Stack${i + 1}`).join('\n')}
      />,
    );
    expect(view.queryByTestId('error-diagnostics')).toBeNull();
    expect(view.queryByText(/PrivateFailure|private failure text|Stack1/)).toBeNull();
  });

  test('preview diagnostics include the error and only the first ten stack lines', async () => {
    process.env.EXPO_PUBLIC_DIAGNOSTICS = 'true';
    const componentStack = Array.from({ length: 12 }, (_, i) => `at Stack${i + 1}`).join('\n');
    const view = await render(
      <ErrorDiagnostics
        error={Object.assign(new Error('preview failure'), { name: 'PreviewFailure' })}
        componentStack={componentStack}
      />,
    );
    const details = view.getByTestId('error-diagnostics').props.children;
    expect(details).toContain('Name: PreviewFailure');
    expect(details).toContain('Message: preview failure');
    expect(details).toContain('at Stack10');
    expect(details).not.toContain('at Stack11');
  });
});