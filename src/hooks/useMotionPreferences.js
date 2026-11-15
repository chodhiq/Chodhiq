import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMotionPreferencesStore } from '../lib/motionPreferencesStore';
// One native subscription pair for all animated controls.
const store = createMotionPreferencesStore(AccessibilityInfo, AppState, AsyncStorage);
const getReducedMotion = () => store.getSnapshot().reducedMotion;
export function useMotionPreferences() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
export default function useReducedMotion() {
  return useSyncExternalStore(store.subscribe, getReducedMotion, getReducedMotion);
}
export function setVisualEffectsLevel(level) {
  return store.setVisualEffectsLevel(level);
}
