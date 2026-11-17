'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from './supabase';
import { useAdminAuth } from './admin';

export type CountFilter = string | boolean | number | readonly (string | boolean | number)[];
export type CountDef = { key: string; table: string; select?: string; distinctBy?: string; filters?: Record<string, CountFilter> };

type FilterBuilder = {
  eq: (column: string, value: unknown) => FilterBuilder;
  in: (column: string, values: readonly unknown[]) => FilterBuilder;
};
function applyFilters<T>(query: T, filters: Record<string, CountFilter>): T {
  let filtered = query as unknown as FilterBuilder;
  for (const [column, value] of Object.entries(filters)) {
    filtered = Array.isArray(value) ? filtered.in(column, value) : filtered.eq(column, value);
  }
  return filtered as unknown as T;
}

async function fetchCount(
  { table, select = 'id', distinctBy, filters = {} }: CountDef,
  session: { access_token?: string; user?: { id?: string } } | null,
): Promise<number | null> {
  if (!isSupabaseConfigured || !session?.access_token || !session.user?.id) return null;
  try {
    if (!distinctBy) {
      const query = applyFilters(supabase.from(table).select(select, { count: 'exact', head: true }), filters);
      const { count, error } = await query;
      return error ? null : (count ?? 0);
    }
    const values = new Set<unknown>();
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const query = applyFilters(supabase.from(table).select(distinctBy), filters);
      const { data, error } = await query.range(offset, offset + pageSize - 1);
      if (error || !data) return null;
      for (const row of data as unknown as Array<Record<string, unknown>>) values.add(row[distinctBy]);
      if (data.length < pageSize) break;
    }
    return values.size;
  } catch { return null; }
}

export function useCounts(defs: readonly CountDef[]) {
  const { session, loading: authLoading, configurationReady, configured, isAdmin } = useAdminAuth();
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const inFlight = useRef<Promise<Record<string, number | null>> | null>(null);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (!configurationReady || !configured || !isSupabaseConfigured || authLoading || !isAdmin || !session?.access_token || !session.user.id) {
      if (configurationReady && !authLoading) setLoading(false);
      if (!session || !isAdmin) setCounts({});
      return;
    }
    if (!inFlight.current) {
      inFlight.current = Promise.all(defs.map(async def => [def.key, await fetchCount(def, session)] as const))
        .then(entries => Object.fromEntries(entries))
        .finally(() => { inFlight.current = null; });
    }
    const next = await inFlight.current;
    if (mounted.current) { setCounts(next); setLoading(false); }
  }, [defs, configurationReady, configured, authLoading, isAdmin, session]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => { mounted.current = false; };
  }, [refresh]);
  const show = (key: string) => loading ? '…' : counts[key] ?? '—';
  return { counts, loading, show, refresh };
}
