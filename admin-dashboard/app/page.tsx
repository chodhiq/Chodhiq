'use client';
import Link from './components/admin-link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AdminShell } from './components/admin-shell';
import { Page, Skeleton, Status } from './components/ui';
const metrics = [
  {
    label: 'Pending applications',
    table: 'business_applications',
    field: 'status',
    value: 'pending',
    href: '/applications',
  },
  {
    label: 'Verified providers',
    table: 'providers',
    field: 'verification_status',
    value: 'verified',
    href: '/providers',
  },
  { label: 'Total bookings', table: 'bookings', href: '/activity' },
  {
    label: 'Community reports',
    table: 'community_post_reports',
    field: 'status',
    value: 'open',
    href: '/moderation/community',
  },
] as const;
type Application = {
  id: string;
  business_name: string;
  status: string;
  city: string;
  review_due_at: string;
};
const shortcuts = [
  [
    '/applications',
    'Review business applications',
    'Inspect trading proof, approve access, or request changes.',
  ],
  ['/community', 'Live community feed', 'Inspect posts and media; remove or restore content.'],
  [
    '/community/privileges',
    'Community privileges',
    'Manage spaces, owners, moderators and participation.',
  ],
  ['/moderation/providers', 'Provider reports', 'Investigate reports and record review decisions.'],
  ['/users', 'Customer accounts', 'Inspect accounts and manage account restrictions.'],
  ['/verification', 'Provider verification', 'Review evidence and manage verification status.'],
  ['/notifications', 'Send notifications', 'Publish operational messages to your users.'],
  ['/audit', 'Audit history', 'Review privileged actions and their recorded reasons.'],
];
export default function Overview() {
  const [counts, setCounts] = useState<Array<number | null>>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationError, setApplicationError] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const load = useCallback(async (quiet = false) => {
    const request = ++requestId.current;
    if (!quiet) setLoading(true);
    try {
      const results = await Promise.all(
        metrics.map((metric) => {
          let query = supabase.from(metric.table).select('*', { count: 'exact', head: true });
          if ('field' in metric) query = query.eq(metric.field, metric.value);
          return query;
        }),
      );
      const queue = await supabase
        .from('business_applications')
        .select('id,business_name,status,city,review_due_at')
        .eq('status', 'pending')
        .order('review_due_at')
        .limit(5);
      if (request !== requestId.current) return;
      setCounts(results.map((result) => (result.error ? null : (result.count ?? 0))));
      setApplicationError(Boolean(queue.error));
      setApplications(queue.data || []);
    } catch {
      if (request === requestId.current) {
        setCounts(metrics.map(() => null));
        setApplicationError(true);
      }
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const start = window.setTimeout(() => void load(), 0);
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      requestId.current += 1;
    };
  }, [load]);
  return (
    <AdminShell title="Dashboard">
      <Page
        title="Operations overview"
        note="Review new businesses, protect the community and manage daily marketplace operations."
      >
        <div className="community-live-toolbar">
          <span>Updates every 30 seconds</span>
          <button onClick={() => void load()} disabled={loading}>
            Refresh overview
          </button>
        </div>
        {loading ? (
          <Skeleton rows={4} />
        ) : (
          <div className="metrics">
            {metrics.map((metric, index) => (
              <Link className="metric metric-link" href={metric.href} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{counts[index] === null ? 'Unavailable' : (counts[index] ?? 0)}</strong>
                <small>{counts[index] === null ? 'Open section to retry' : 'Open records ->'}</small>
              </Link>
            ))}
          </div>
        )}
        <section className="panel application-preview">
          <div className="section-heading">
            <div>
              <h3>Applications awaiting review</h3>
              <p>Applicants appear here before they become approved providers.</p>
            </div>
            <Link href="/applications">View review queue &rarr;</Link>
          </div>
          {applicationError ? (
            <p role="alert">
              Applications could not be loaded. <button onClick={() => void load()}>Retry</button>
            </p>
          ) : !applications.length && !loading ? (
            <p>No pending applications.</p>
          ) : (
            applications.map((row) => (
              <Link className="application-preview-row" key={row.id} href="/applications">
                <div>
                  <b>{row.business_name}</b>
                  <small>
                    {row.city} | Due{' '}
                    {new Date(row.review_due_at).toLocaleString('en-GB', {
                      timeZone: 'Europe/London',
                    })}{' '}
                    UK time
                  </small>
                </div>
                <Status value="pending" />
              </Link>
            ))
          )}
        </section>
        <div className="quick operation-shortcuts">
          {shortcuts.map(([href, title, description]) => (
            <Link href={href} key={href}>
              <b>{title}</b>
              <small>{description}</small>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          ))}
        </div>
      </Page>
    </AdminShell>
  );
}
