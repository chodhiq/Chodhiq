'use client';
import Link from './components/admin-link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button, HeroBanner, Page, Panel, Skeleton, StatCard, Status } from './components/ui';
import { cachedQuery, readCachedQuery } from '../lib/query-cache';
const metrics = [
  {
    label: 'Pending applications',
    table: 'business_applications',
    field: 'status',
    value: 'pending',
    href: '/applications?status=pending',
  },
  {
    label: 'Verified providers',
    table: 'providers',
    field: 'verification_status',
    value: 'verified',
    href: '/providers',
  },
  { label: 'Total bookings', table: 'bookings', href: '/activity?section=bookings' },
  {
    label: 'Community reports',
    table: 'community_post_reports',
    field: 'status',
    value: 'open',
    href: '/moderation/community?status=open',
  },
] as const;
type Application = {
  id: string;
  business_name: string;
  status: string;
  city: string;
  review_due_at: string;
};
type DashboardSnapshot = {
  counts: Array<number | null>;
  applications: Application[];
  applicationError: boolean;
};
const DASHBOARD_CACHE_KEY = 'admin:dashboard';

async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
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
  if (results.some((result) => result.error) || queue.error)
    throw new Error('Dashboard data unavailable');
  return {
    counts: results.map((result) => result.count ?? 0),
    applications: queue.data || [],
    applicationError: false,
  };
}
const shortcuts = [
  [
    '/applications?status=pending',
    'Review business applications',
    'Inspect trading proof, approve access, or request changes.',
  ],
  ['/community?status=all', 'Live community feed', 'Inspect posts and media; remove or restore content.'],
  [
    '/community/privileges',
    'Community privileges',
    'Manage spaces, owners, moderators and participation.',
  ],
  ['/moderation/providers?status=open', 'Provider reports', 'Investigate reports and record review decisions.'],
  ['/users', 'Customer accounts', 'Inspect accounts and manage account restrictions.'],
  ['/verification?status=pending', 'Provider verification', 'Review evidence and manage verification status.'],
  ['/notifications', 'Send notifications', 'Publish operational messages to your users.'],
  ['/audit', 'Audit history', 'Review privileged actions and their recorded reasons.'],
];
export default function Overview() {
  const cached = readCachedQuery<DashboardSnapshot>(DASHBOARD_CACHE_KEY);
  const [counts, setCounts] = useState<Array<number | null>>(cached?.counts ?? []);
  const [applications, setApplications] = useState<Application[]>(cached?.applications ?? []);
  const [applicationError, setApplicationError] = useState(cached?.applicationError ?? false);
  const [loading, setLoading] = useState(!cached);
  const requestId = useRef(0);
  const load = useCallback(async (force = false, quiet = false) => {
    const request = ++requestId.current;
    if (!quiet && !readCachedQuery(DASHBOARD_CACHE_KEY)) setLoading(true);
    try {
      const snapshot = await cachedQuery(DASHBOARD_CACHE_KEY, loadDashboardSnapshot, {
        force,
        staleTime: 30_000,
      });
      if (request !== requestId.current) return;
      setCounts(snapshot.counts);
      setApplicationError(snapshot.applicationError);
      setApplications(snapshot.applications);
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
    const start = window.setTimeout(() => void load(false, false), 0);
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(true, true);
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
      <Page
        className="dashboard-page"
        title="Admin control center"
        note="A clear view of marketplace health, reviews and the work that needs attention."
      >
        <HeroBanner
          eyebrow="Admin control center"
          title="Everything important, in one place."
          description="Review new businesses, support providers and keep the community safe."
          action={<><span className="dashboard-sync"><i aria-hidden="true" /><span><small>DATA SYNC</small><b>Refreshes every 30 seconds</b></span></span><Button variant="outline" className="dashboard-refresh" onClick={() => void load(true, !readCachedQuery(DASHBOARD_CACHE_KEY))} disabled={loading}><span aria-hidden="true">↻</span> {loading ? 'Refreshing…' : 'Refresh now'}</Button></>}
        />
        {loading ? (
          <Skeleton rows={1} />
        ) : (
          <div className="metrics dashboard-metrics">
            {metrics.map((metric, index) => (
              <StatCard key={metric.label} icon={['A', '✓', 'B', '!'][index]} label={metric.label} value={counts[index] === null ? 'Unavailable' : (counts[index] ?? 0)} href={metric.href} tone={(['teal', 'green', 'purple', 'amber'] as const)[index]} />
            ))}
          </div>
        )}
        <Panel className="application-preview dashboard-review" eyebrow="Priority queue" title="Applications awaiting review" description="Applicants appear here before they become approved providers." action={<Link className="dashboard-view-all" href="/applications?status=pending">View application queue <span aria-hidden="true">→</span></Link>}>
          {applicationError ? (
            <p role="alert">
              Applications could not be loaded. <button onClick={() => void load()}>Retry</button>
            </p>
          ) : !applications.length && !loading ? (
            <div className="dashboard-empty">
              <span aria-hidden="true">✓</span>
              <div><b>You’re all caught up</b><p>There are no pending applications right now.</p></div>
            </div>
          ) : (
            applications.map((row) => (
              <Link className="application-preview-row dashboard-application-row" key={row.id} href="/applications?status=pending">
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
        </Panel>
        <div className="quick operation-shortcuts">
          <div className="dashboard-shortcuts-heading"><div><span className="dashboard-section-label">QUICK ACCESS</span><h3>Go to a workspace</h3></div><p>Common admin tasks, one click away</p></div>
          {shortcuts.map(([href, title, description], index) => (
            <Link className="dashboard-shortcut" href={href} key={href}>
              <i aria-hidden="true">{['01', '02', '03', '04', '05', '06', '07', '08'][index]}</i>
              <b>{title}</b>
              <small>{description}</small>
              <span className="dashboard-shortcut-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </Page>
  );
}
