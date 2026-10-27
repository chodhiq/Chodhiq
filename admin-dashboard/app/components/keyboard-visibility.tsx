'use client';
import { useEffect } from 'react';
import { installKeyboardVisibility } from '../../lib/keyboard-visibility';
export default function KeyboardVisibility() {
  useEffect(() => installKeyboardVisibility(), []);
  return null;
}
