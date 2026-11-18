'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export function useMotionScale() {
  useEffect(() => {
    const value = Number(new URLSearchParams(window.location.search).get('slowmo'));
    document.documentElement.style.setProperty('--motion-scale', String(Number.isFinite(value) && value >= 1 && value <= 5 ? value : 1));
  }, []);
}

export function useRouteEntrance() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (previous.current !== pathname) {
      previous.current = pathname;
      setActive(true);
      const timer = window.setTimeout(() => setActive(false), 900 * motionScale());
      return () => window.clearTimeout(timer);
    }
  }, [pathname]);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.route-view');
    if (!root || !active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = [...root.querySelectorAll<HTMLElement>('.metrics > *, .panel, .table, .quick, .dashboard-welcome')].slice(0, 8);
    const rows = [...root.querySelectorAll<HTMLElement>('.table tbody tr')].slice(0, 10);
    const animations: Animation[] = [];
    const duration = (n: number) => n * motionScale();
    items.forEach((item, index) => animations.push(item.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: duration(320), delay: duration(index * 45), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' })));
    const heading = root.querySelector<HTMLElement>('.head h2');
    if (heading) animations.push(heading.animate([{ opacity: 0, transform: 'translateY(8px)', clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' }], { duration: duration(280), easing: 'ease-out', fill: 'both' }));
    rows.forEach((row, index) => animations.push(row.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration(240), delay: duration(index * 25), easing: 'ease-out', fill: 'both' })));
    return () => animations.forEach(animation => animation.cancel());
  }, [pathname, active]);
  return active ? 'route-entering' : '';
}

export function CountUpValue({ value }: { value: ReactNode }) {
  const numeric = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));
  const target = numeric ? Number(value) : null;
  const [shown, setShown] = useState<string | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (target === null || started.current) return;
    started.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !Number.isFinite(target)) return;
    const start = performance.now();
    const duration = 600 * motionScale();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const current = Math.round(target * (1 - (1 - progress) ** 3));
      setShown(String(current));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setShown(String(value));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, value]);
  if (!numeric) return value;
  return React.createElement(React.Fragment, null,
    React.createElement('span', { className: 'count-up-value' }, shown ?? '0'),
    React.createElement('span', { className: 'sr-only' }, value),
  );
}

export function motionScale() {
  const value = Number(getComputedStyle(document.documentElement).getPropertyValue('--motion-scale'));
  return Number.isFinite(value) && value >= 1 && value <= 5 ? value : 1;
}
