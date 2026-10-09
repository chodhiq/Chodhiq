import { useCallback, useLayoutEffect, useRef } from 'react';

// Stable event identity for memoized rows, with the latest committed action.
export default function useLiveCallback(callback) {
  const current = useRef(callback);
  useLayoutEffect(() => {
    current.current = callback;
  }, [callback]);
  return useCallback((...args) => current.current(...args), []);
}
