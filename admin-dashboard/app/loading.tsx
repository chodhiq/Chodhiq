'use client';

import { useEffect, useState } from 'react';

export default function Loading() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 300);
    return () => window.clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <main className="route-loading" aria-live="polite" aria-busy="true">
      <span className="loading-pulse" aria-hidden="true" />
      <p>Loading this page</p>
    </main>
  );
}
