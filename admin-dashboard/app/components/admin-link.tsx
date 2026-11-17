'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, type ComponentPropsWithoutRef, type MouseEvent } from 'react';

type AdminLinkProps = ComponentPropsWithoutRef<typeof Link>;

export default function AdminLink({ onClick, ...props }: AdminLinkProps) {
  const pathname = usePathname();
  const router = useRouter();
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearPendingNavigation() {
    if (fallback.current) clearTimeout(fallback.current);
    if (poll.current) clearInterval(poll.current);
    fallback.current = null;
    poll.current = null;
  }

  useEffect(() => {
    clearPendingNavigation();
    return () => {
      clearPendingNavigation();
    };
  }, [pathname]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target === '_blank' ||
      (props.target !== undefined && props.target !== '_self') ||
      props.download
    ) return;

    const target = new URL(event.currentTarget.href, window.location.href);
    if (target.origin !== window.location.origin || target.href === window.location.href) return;
    clearPendingNavigation();
    const from = window.location.href;
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('admin:navigation-start'));
    poll.current = setInterval(() => {
      if (window.location.href !== from) {
        clearPendingNavigation();
        window.dispatchEvent(new CustomEvent('admin:navigation-cancel'));
      }
    }, 100);
    fallback.current = setTimeout(() => {
      clearPendingNavigation();
      if (window.location.href === from) window.location.assign(target.href);
      else window.dispatchEvent(new CustomEvent('admin:navigation-cancel'));
    }, 5000);
    try {
      router.push(`${target.pathname}${target.search}${target.hash}`);
    } catch {
      window.location.assign(target.href);
    }
  }

  return <Link {...props} onClick={handleClick} prefetch={props.prefetch ?? true} />;
}
