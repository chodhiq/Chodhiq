import { useMemo } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { useMotionPreferences } from './useMotionPreferences';

export type EffectsLevel = 'full' | 'reduced' | 'off';

const GIGABYTE = 1024 ** 3;

export function getEffectsLevel(
  platform: string,
  totalMemory: number | null | undefined,
  reducedMotion: boolean,
): EffectsLevel {
  if (reducedMotion) return 'reduced';
  if (!Number.isFinite(totalMemory) || !totalMemory || platform === 'web') return 'full';

  if (platform === 'android') {
    if (totalMemory <= 2 * GIGABYTE) return 'off';
    if (totalMemory <= 4 * GIGABYTE) return 'reduced';
  } else if (platform === 'ios' && totalMemory <= 2 * GIGABYTE) {
    return 'reduced';
  }

  return 'full';
}

export default function useEffectsLevel(): EffectsLevel {
  const { reducedMotion, visualEffectsLevel, visualEffectsLoaded } = useMotionPreferences();
  return useMemo(
    () =>
      visualEffectsLevel ||
      (visualEffectsLoaded ? getEffectsLevel(Platform.OS, Device.totalMemory, reducedMotion) : 'reduced'),
    [reducedMotion, visualEffectsLevel, visualEffectsLoaded],
  );
}
