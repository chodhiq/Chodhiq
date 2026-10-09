'use client';
import { useEffect } from 'react';
import { installKeyboardVisibility } from '../../../packages/web-forms/keyboard-visibility';
export default function KeyboardVisibility() {
  useEffect(() => installKeyboardVisibility(), []);
  return null;
}
