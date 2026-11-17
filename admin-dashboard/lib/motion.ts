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

export function useFilterListMotion(ready = true) {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(false);
  const readyRef = useRef(ready);
  const activate = () => {
    if (timer.current) clearTimeout(timer.current);
    setActive(true);
    timer.current = setTimeout(() => setActive(false), 200);
  };
  useEffect(() => {
    readyRef.current = ready;
    if (ready && pending.current) {
      pending.current = false;
      activate();
    }
  }, [ready]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const trigger = () => {
    pending.current = true;
    window.requestAnimationFrame(() => {
      if (readyRef.current && pending.current) {
        pending.current = false;
        activate();
      }
    });
  };
  return { className: active ? 'filter-list-enter' : undefined, trigger };
}
