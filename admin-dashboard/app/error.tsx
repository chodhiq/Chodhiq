'use client';

import { ErrorState } from './components/ui';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <main className="route-error"><ErrorState message="This page could not load. Your session and the other dashboard pages are still available." retry={reset} /></main>;
}
