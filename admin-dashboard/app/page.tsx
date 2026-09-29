"use client";

import Link from "./components/admin-link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { AdminShell } from "./components/admin-shell";
import { Page, Skeleton } from "./components/ui";

const metrics = [
  ["Total bookings", "bookings"],
  ["Active providers", "providers"],
  ["Customers", "profiles"],
  ["Open issues", "provider_reports"],
] as const;
type MetricState = { value: number | null; error: boolean };

export default function Overview() {
  const [counts, setCounts] = useState<Record<string, MetricState>>({});
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const load = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setLoading(true);
    const results = await Promise.all(metrics.map(([, table]) => supabase.from(table).select("*", { count: "exact", head: true })));
    if (activeRequest !== requestId.current) return;
    setCounts(Object.fromEntries(metrics.map(([label], index) => [label, { value: results[index].error ? null : results[index].count, error: Boolean(results[index].error) }])));
    setLoading(false);
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => { clearTimeout(timer); requestId.current += 1; }; }, [load]);
  return <AdminShell title="Dashboard"><Page title="Admin Overview" note={"Here's what's happening on your marketplace today."}>
    {loading ? <Skeleton rows={4} /> : <div className="metrics">{Object.entries(counts).map(([label, metric]) => <article className={`metric ${metric.error ? "metric-error" : ""}`} key={label}><span>{label}</span><strong>{metric.error ? "Unavailable" : metric.value ?? 0}</strong>{metric.error ? <button onClick={() => void load()}>Retry</button> : <small>Live rows</small>}</article>)}</div>}
    <div className="quick">{[["/moderation/providers", "Triage provider reports"], ["/moderation/community", "Moderate reported posts"], ["/providers", "Inspect providers"], ["/demand", "Review demand"], ["/admins", "Manage administrators"], ["/analytics", "View recent analytics events"]].map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</div>
  </Page></AdminShell>;
}
