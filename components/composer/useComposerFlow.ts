import { useCallback, useEffect, useRef, useState } from 'react';
import { cancelAnimation, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import useEffectsLevel from '../../src/hooks/useEffectsLevel';
import { isAuthSessionError } from '../../src/data/syncPolicy';

export type FlowState = 'idle' | 'pressed' | 'uploading' | 'success' | 'done' | 'error';

export interface Post {
  id: string;
  username: string;
  timeAgo: string;
  text: string;
  category: string;
  likes: number;
  comments: number;
  commentItems?: string[];
  online: boolean;
  imageUri?: string;
}

export interface UseComposerFlowOptions {
  onSubmit: (text: string, imageUri?: string) => Promise<Post>;
  onPosted: (post: Post) => void;
  onAuthRequired?: () => void;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

export default function useComposerFlow({ onSubmit, onPosted, onAuthRequired }: UseComposerFlowOptions) {
  const [state, setState] = useState<FlowState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const effectsLevel = useEffectsLevel();
  const inFlight = useRef(false);
  const completionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shake = useSharedValue(0);

  useEffect(
    () => () => {
      if (completionTimer.current) clearTimeout(completionTimer.current);
      if (errorTimer.current) clearTimeout(errorTimer.current);
      if (doneTimer.current) clearTimeout(doneTimer.current);
      cancelAnimation(shake);
    },
    [shake],
  );

  const pressIn = useCallback(() => {
    if (!inFlight.current) {
      if (errorTimer.current) {
        clearTimeout(errorTimer.current);
        errorTimer.current = null;
      }
      setState('pressed');
    }
  }, []);
  const pressOut = useCallback(() => {
    setState((current) => (current === 'pressed' ? 'idle' : current));
  }, []);

  const submit = useCallback(
    async (text: string, imageUri?: string) => {
      const cleanText = text.trim();
      if (!cleanText || inFlight.current) return;

      if (errorTimer.current) {
        clearTimeout(errorTimer.current);
        errorTimer.current = null;
      }
      inFlight.current = true;
      setState('uploading');
      try {
        const post = await onSubmit(cleanText, imageUri);
        setErrorMessage('');
        setState('success');
        completionTimer.current = setTimeout(() => {
          completionTimer.current = null;
          setState('done');
          onPosted(post);
          inFlight.current = false;
          doneTimer.current = setTimeout(() => {
            doneTimer.current = null;
            setState('idle');
          }, 250);
        }, 1400);
      } catch (error) {
        console.warn('Unable to submit community post.', error);
        setErrorMessage(
          hasErrorCode(error, 'QUEUED_OFFLINE')
            ? "Saved offline. We'll send when connected."
            : 'Could not post. Your draft is saved; tap to retry.',
        );
        if (
          isAuthSessionError(error) ||
          (typeof error === 'object' && error !== null && 'authRequired' in error)
        )
          onAuthRequired?.();
        setState('error');
        if (effectsLevel === 'full') {
          shake.value = withSequence(
            withTiming(-6, { duration: 45 }),
            withTiming(6, { duration: 45 }),
            withTiming(-4, { duration: 45 }),
            withTiming(4, { duration: 45 }),
            withTiming(0, { duration: 45 }),
          );
        }
        inFlight.current = false;
        errorTimer.current = setTimeout(() => {
          errorTimer.current = null;
          setState('idle');
        }, 1800);
      }
    },
    [effectsLevel, onAuthRequired, onPosted, onSubmit, shake],
  );

  return { state, errorMessage, pressIn, pressOut, submit, shake };
}
