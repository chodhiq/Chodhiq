'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from './admin-shell';
import { Page, Pager, Search, Status } from './ui';
import { supabase } from '../../lib/supabase';
import { cleanSearch, range, useAdmin } from '../../lib/admin';
type AdminRow = {
  id: string;
  email?: string;
  user_id?: string;
  title?: string;
  body?: string;
  read_at?: string;
  created_at?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  providers?: { business_name?: string } | null;
  requested_plan?: string;
  plan_code?: string;
  status?: string;
  event_type?: string;
};
type EventCounts = Record<string, number>;

export function AdminsPage() {
  const { notify, confirmAction } = useAdmin(),
    [rows, setRows] = useState<AdminRow[]>([]),
    [email, setEmail] = useState('');
  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('admin-role-control', {
      body: { action: 'list' },
    });
    if (error || data?.error) notify(data?.error || error?.message, 'error');
    else setRows((data?.users || []) as AdminRow[]);
  }, [notify]);
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      await load();
    };
    void run();
    return () => {
      active = false;
    };
  }, [load]);
  async function change(action: string, value: string) {
    if (
      !(await confirmAction({
        title: `${action} administrator access`,
        message: `This changes privileged access for ${value}.`,
        requiredText: action === 'revoke' ? value : undefined,
        confirmLabel: `${action} admin role`,
      }))
    )
      return;
    const { data, error } = await supabase.functions.invoke('admin-role-control', {
      body: { action, email: value },
    });
    if (error || data?.error) notify(data?.error || error?.message, 'error');
    else {
      notify('Administrator roles updated and audited');
      setEmail('');
      if (action === 'revoke') setRows((current) => current.filter((row) => row.email !== value));
      else void load();
    }
  }
  return (
    <AdminShell title="Admin roles">
      <Page
        title="Administrator access"
        note="View, grant and revoke server-issued administrator roles. Self-revocation and last-admin removal are blocked."
      >
        <section className="panel form-grid">
          <input
            type="email"
            placeholder="User email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="primary" onClick={() => change('grant', email)}>
            Grant admin role
          </button>
        </section>
        <section className="panel table">
          <table>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.email}</b>
                  </td>
                  <td>{r.id}</td>
                  <td>
                    <button className="danger" onClick={() => change('revoke', r.email || '')}>
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </Page>
    </AdminShell>
  );
}
export function AnalyticsPage() {
  const { notify } = useAdmin(),
    [events, setEvents] = useState<AdminRow[]>([]),
    [requests, setRequests] = useState<AdminRow[]>([]);
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      const [e, r] = await Promise.all([
        supabase
          .from('provider_analytics_events')
          .select('event_type,provider_id,created_at,providers(business_name)')
          .order('created_at', { ascending: false })
          .range(0, 99),
        supabase
          .from('subscription_requests')
          .select('*,providers(business_name)')
          .order('created_at', { ascending: false })
          .range(0, 99),
      ]);
      if (!active) return;
      if (e.error) notify(e.error.message, 'error');
      else setEvents((e.data || []) as unknown as AdminRow[]);
      if (r.error) notify(r.error.message, 'error');
      else setRequests(r.data || []);
    };
    void run();
    return () => {
      active = false;
    };
  }, [notify]);
  const counts = Object.entries(
    events.reduce(
      (m: EventCounts, e: AdminRow) => ({
        ...m,
        [String(e.event_type || 'unknown')]: (m[String(e.event_type || 'unknown')] || 0) + 1,
      }),
      {},
    ),
  );
  return (
    <AdminShell title="Analytics">
      <Page
        title="Marketplace analytics"
        note="Provider engagement events and subscription demand."
      >
        <div className="metrics">
          {counts.map(([k, v]) => (
            <article className="metric" key={k}>
              <span>{k}</span>
              <strong>{String(v)}</strong>
              <small>Latest events</small>
            </article>
          ))}
        </div>
        <section className="panel table">
          <h3>Subscription requests</h3>
          <table>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.providers?.business_name}</td>
                  <td>{r.requested_plan || r.plan_code}</td>
                  <td>
                    <Status value={r.status || 'unknown'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </Page>
    </AdminShell>
  );
}
export function NotificationsPage() {
  const { notify } = useAdmin(),
    [rows, setRows] = useState<AdminRow[]>([]),
    [page, setPage] = useState(0),
    [total, setTotal] = useState(0),
    [q, setQ] = useState('');
  const load = useCallback(async () => {
    let x = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(...range(page));
    if (cleanSearch(q)) x = x.or(`title.ilike.%${cleanSearch(q)}%,body.ilike.%${cleanSearch(q)}%`);
    const { data, count, error } = await x;
    if (error) notify(error.message, 'error');
    else {
      setRows((data || []) as AdminRow[]);
      setTotal(count || 0);
    }
  }, [notify, page, q]);
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      await load();
    };
    void run();
    return () => {
      active = false;
    };
  }, [load]);
  return (
    <AdminShell title="Notifications">
      <Page
        title="Notification delivery history"
        note="Inspect generated customer and provider notifications and their read state."
      >
        <Search
          id="notification-search"
          label="Search notifications"
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(0);
          }}
        />
        <section className="panel audit">
          {rows.map((r) => (
            <article key={r.id}>
              <i />
              <div>
                <b>{r.title}</b>
                <p>{r.body}</p>
                <small>
                  {r.user_id?.slice(0, 8)} · {r.read_at ? 'Read' : 'Unread'}
                </small>
              </div>
              <time>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</time>
            </article>
          ))}
          <Pager page={page} total={total} setPage={setPage} />
        </section>
      </Page>
    </AdminShell>
  );
}
export function AuditPage() {
  const { notify } = useAdmin(),
    [rows, setRows] = useState<AdminRow[]>([]),
    [page, setPage] = useState(0),
    [total, setTotal] = useState(0),
    [q, setQ] = useState('');
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      let x = supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(...range(page));
      if (cleanSearch(q))
        x = x.or(`action.ilike.%${cleanSearch(q)}%,entity_type.ilike.%${cleanSearch(q)}%`);
      const { data, count, error } = await x;
      if (!active) return;
      if (error) notify(error.message, 'error');
      else {
        setRows((data || []) as AdminRow[]);
        setTotal(count || 0);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [notify, page, q]);
  return (
    <AdminShell title="Audit log">
      <Page title="Privileged action history" note="Immutable history of administrator mutations.">
        <Search
          id="audit-search"
          label="Search audit log"
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(0);
          }}
        />
        <section className="panel audit">
          {rows.map((r) => (
            <article key={r.id}>
              <i />
              <div>
                <b>{r.action?.replaceAll('_', ' ')}</b>
                <p>
                  {r.entity_type} · {r.entity_id}
                </p>
              </div>
              <time>{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</time>
            </article>
          ))}
          <Pager page={page} total={total} setPage={setPage} />
        </section>
      </Page>
    </AdminShell>
  );
}
