import { useEffect, useRef, useState } from 'react';

export function useFirstLoadRows(ready: boolean) {
  const seen = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!ready || seen.current) return;
    seen.current = true;
    setActive(true);
    timer.current = window.setTimeout(() => setActive(false), 420);
  }, [ready]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return active ? 'first-load-rows' : undefined;
}

export function useFilterListMotion() {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const trigger = () => {
    if (timer.current) clearTimeout(timer.current);
    setActive(false);
    requestAnimationFrame(() => setActive(true));
    timer.current = setTimeout(() => setActive(false), 220);
  };
  return { className: active ? 'filter-list-enter' : undefined, trigger };
}
