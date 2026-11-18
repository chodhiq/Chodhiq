'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export function useMotionScale() {
  useEffect(() => {
    const value = Number(new URLSearchParams(window.location.search).get('slowmo'));
    document.documentElement.style.setProperty('--motion-scale', String(Number.isFinite(value) && value >= 1 && value <= 5 ? value : 1));
  }, []);
}

export function useRouteEntrance(pathname: string) {
  const previous = useRef(pathname);
  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const root = document.querySelector<HTMLElement>('.route-view');
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animations: Array<{ animation: Animation; target: HTMLElement }> = [];
    const duration = (n: number) => n * motionScale();
    const items = [...root.querySelectorAll<HTMLElement>('.metrics > *, .panel, .table, .quick, .dashboard-welcome')]
      .filter(item => !item.closest('.table tbody'))
      .slice(0, 8);
    items.forEach((item, index) => animations.push({ target: item, animation: item.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: duration(320), delay: duration(index * 45), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }) }));
    const heading = root.querySelector<HTMLElement>('.page > .head > div > h2');
    if (heading) animations.push({ target: heading, animation: heading.animate([{ opacity: 0, transform: 'translateY(8px)', clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' }], { duration: duration(280), easing: 'ease-out', fill: 'backwards' }) });
    return () => {
      for (const { animation, target } of animations) {
        if (animation.playState === 'running') {
          try { animation.commitStyles(); } catch { /* The final keyframe is also the visible default. */ }
        }
        animation.cancel();
        if (target instanceof HTMLElement) {
          target.style.opacity = '1';
          target.style.removeProperty('transform');
          target.style.removeProperty('clip-path');
        }
      }
    };
  }, [pathname]);
}

export function CountUpValue({ value }: { value: ReactNode }) {
  const numeric = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));
  const target = numeric ? Number(value) : null;
  const [animation, setAnimation] = useState<{ target: number; text: string } | null>(null);
  const firstNumberSeen = useRef(false);
  const visibleNumberRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (target === null || !Number.isFinite(target)) return;
    if (!firstNumberSeen.current) {
      firstNumberSeen.current = true;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (visibleNumberRef.current) visibleNumberRef.current.textContent = '0';
      return animateCountUp(target, text => setAnimation(text === null ? null : { target, text }), 600 * motionScale(), undefined, undefined, undefined, false);
    }
    return;
  }, [target]);

  const animatedNumber = animation?.text ?? null;
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visibleValue = getCountUpDisplay(value, animatedNumber, animation?.target ?? null, reducedMotion);
  if (!numeric) return value;
  return React.createElement(React.Fragment, null,
    React.createElement('span', { className: 'count-up-value', 'aria-hidden': true, ref: visibleNumberRef }, visibleValue),
    React.createElement('span', { className: 'sr-only' }, String(value)),
  );
}

export function getCountUpDisplay(value: unknown, animatedNumber: string | null, animationTarget: number | null, reducedMotion = false) {
  const numeric = typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));
  return !reducedMotion && numeric && animationTarget === Number(value) && animatedNumber !== null
    ? animatedNumber
    : String(value);
}

export function animateCountUp(
  target: number,
  onNumber: (number: string | null) => void,
  duration: number,
  schedule: (callback: FrameRequestCallback) => number = callback => requestAnimationFrame(callback),
  cancel: (frame: number) => void = frame => cancelAnimationFrame(frame),
  now: () => number = () => performance.now(),
  emitStartingValue = true,
) {
  let cancelled = false;
  let frame = 0;
  const start = now();
  if (emitStartingValue) onNumber('0');
  const tick: FrameRequestCallback = timestamp => {
    if (cancelled) return;
    const progress = Math.min(1, Math.max(0, (timestamp - start) / duration));
    if (progress >= 1) {
      onNumber(null);
      return;
    }
    onNumber(String(Math.round(target * (1 - (1 - progress) ** 3))));
    frame = schedule(tick);
  };
  frame = schedule(tick);
  return () => { cancelled = true; cancel(frame); };
}

export function motionScale() {
  const value = Number(getComputedStyle(document.documentElement).getPropertyValue('--motion-scale'));
  return Number.isFinite(value) && value >= 1 && value <= 5 ? value : 1;
}
