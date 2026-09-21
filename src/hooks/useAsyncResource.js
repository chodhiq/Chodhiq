import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsyncResource(loader, dependencies = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    if (!enabled) return null;
    const currentRequest = ++requestId.current;
    setState((current) => ({ ...current, error: null, loading: true }));
    try {
      const data = await loader();
      if (currentRequest === requestId.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (currentRequest === requestId.current) setState({ data: null, error, loading: false });
      return null;
    }
  }, [enabled, ...dependencies]);

  useEffect(() => {
    if (enabled) reload();
    else setState({ data: null, error: null, loading: false });
    return () => {
      requestId.current += 1;
    };
  }, [enabled, reload]);
  return { ...state, reload };
}
