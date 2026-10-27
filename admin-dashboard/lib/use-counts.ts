'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';

export type CountDef = { key: string; table: string; filters?: Record<string, string | boolean | number> };

async function fetchCount({ table, filters = {} }: CountDef): Promise<number | null> {
  try {
    let query = supabase.from(table).select('id', { count: 'exact', head: true });
    for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
    const { count, error } = await query;
    return error ? null : (count ?? 0);
  } catch { return null; }
}

export function useCounts(defs: readonly CountDef[]) {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const inFlight = useRef<Promise<Record<string, number | null>> | null>(null);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (!inFlight.current) {
      inFlight.current = Promise.all(defs.map(async def => [def.key, await fetchCount(def)] as const))
        .then(entries => Object.fromEntries(entries))
        .finally(() => { inFlight.current = null; });
    }
    const next = await inFlight.current;
    if (mounted.current) { setCounts(next); setLoading(false); }
  }, [defs]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; };
  }, [refresh]);
  const show = (key: string) => loading ? '…' : counts[key] ?? '—';
  return { counts, loading, show, refresh };
}
