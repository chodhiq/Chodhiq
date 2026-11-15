import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import GlowCard from '../../components/GlowCard';

const mockUseEffectsLevel = jest.fn();
const mockWithRepeat = jest.fn((animation) => animation);

jest.mock('../../src/hooks/useEffectsLevel', () => ({
  __esModule: true,
  default: () => mockUseEffectsLevel(),
}));
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return { ...mock, withRepeat: (...args) => mockWithRepeat(...args) };
});

describe('visual effects motion policy', () => {
  beforeEach(() => {
    mockUseEffectsLevel.mockReturnValue('off');
    mockWithRepeat.mockClear();
  });

  test('does not start the GlowCard loop when effects are Off', async () => {
    await render(
      <GlowCard>
        <View />
      </GlowCard>,
    );
    expect(mockWithRepeat).not.toHaveBeenCalled();
  });
});