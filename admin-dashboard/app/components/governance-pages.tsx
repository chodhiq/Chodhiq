'use client';

import { useCallback, useEffect, useState } from 'react';
import { EmptyState, LoadError, Page, Pager, Panel, Search, Select, Skeleton, Status } from './ui';
import { supabase } from '../../lib/supabase';
import { cleanSearch, range, useAdmin } from '../../lib/admin';
import { sendNotification, type Audience } from '../../lib/notify-user';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { useCounts, type CountDef } from '../../lib/use-counts';
const ANALYTICS_COUNTS = [
  { key: 'events', table: 'provider_analytics_events' },
  { key: 'requests', table: 'subscription_requests' },
] as const satisfies readonly CountDef[];
type AdminRow = {
  id: string;
  email?: string;
  user_id?: string;
  title?: string;
  body?: string;
  read_at?: string | null;
  created_at?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  providers?: { business_name?: string } | null;
  requested_plan?: string;
  plan_code?: string;
  status?: string;
  event_type?: string;
  admin_level?: string;
};
type EventCounts = Record<string, number>;

export function AdminsPage() {
  const { notify, confirmAction } = useAdmin(),
    [rows, setRows] = useState<AdminRow[]>([]),
    [email, setEmail] = useState(''), [level, setLevel] = useState('moderator');
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
  async function change(action: string, value: string, nextLevel = level) {
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
      body: { action, email: value, adminLevel: nextLevel },
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

      <Page
        title="Administrator access"
        note="View, grant and revoke server-issued administrator roles. Self-revocation and last-admin removal are blocked."
        stats={[{label:'Administrators',value:rows.length},{label:'Super admins',value:rows.filter(row => (row.admin_level || 'super_admin') === 'super_admin').length,tone:'purple'}]}
      >
        <section className="panel form-grid">
          <input
            type="email"
            placeholder="User email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="field"><span>Administrator level</span><select value={level} onChange={event => setLevel(event.target.value)}><option value="moderator">Moderator</option><option value="support">Support</option><option value="finance">Finance</option><option value="analyst">Analyst</option></select></label>
          <button className="primary" onClick={() => change('grant', email)}>
            Grant admin role
          </button>
        </section>
        <section className="panel table">
          <table>
            <thead><tr><th>Email</th><th>User ID</th><th>Level</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.email}</b>
                  </td>
                  <td>{r.id}</td>
                  <td><span className="field"><select aria-label={`Set level for ${r.email}`} value={r.admin_level || 'super_admin'} onChange={event => { setLevel(event.target.value); void change('set_level', r.email || '', event.target.value); }}><option value="super_admin">Super admin</option><option value="moderator">Moderator</option><option value="support">Support</option><option value="finance">Finance</option><option value="analyst">Analyst</option></select></span></td>
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
        <section className="panel"><h3>What each level can do</h3><table><thead><tr><th>Permission</th><th>Super admin</th><th>Moderator</th><th>Support</th><th>Finance</th><th>Analyst</th></tr></thead><tbody>{['applications.review','providers.suspend','users.suspend','reviews.moderate','categories.manage','community.moderate','community.privileges','reports.resolve','notifications.send','campaigns.manage','payments.view','analytics.view','admins.manage','audit.view'].map(permission => <tr key={permission}><td>{permission}</td>{['super_admin','moderator','support','finance','analyst'].map(role => <td key={role}>{role === 'super_admin' || (role === 'moderator' && !['campaigns.manage','payments.view','analytics.view','admins.manage'].includes(permission)) || (role === 'support' && ['applications.review','reports.resolve','notifications.send','audit.view'].includes(permission)) || (role === 'finance' && ['payments.view','analytics.view','audit.view'].includes(permission)) || (role === 'analyst' && ['analytics.view','audit.view'].includes(permission)) ? '✓' : '—'}</td>)}</tr>)}</tbody></table></section>
      </Page>

  );
}
export function AnalyticsPage() {
  const { notify } = useAdmin(),
    [events, setEvents] = useState<AdminRow[]>([]),
    [requests, setRequests] = useState<AdminRow[]>([]);
  const { show } = useCounts(ANALYTICS_COUNTS);
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

      <Page
        title="Marketplace analytics"
        note="Provider engagement events and subscription demand."
        stats={[{label:'Provider events',value:show('events')},{label:'Subscription requests',value:show('requests'),tone:'purple'}]}
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

  );
}
function NotificationComposer({ onSent }: { onSent: () => void }) {
  const { notify, confirmAction } = useAdmin();
  const [audience, setAudience] = useState<Audience>('all'), [userId, setUserId] = useState('');
  const [title, setTitle] = useState(''), [body, setBody] = useState(''), [sending, setSending] = useState(false);
  useEffect(() => { const timer = window.setTimeout(() => { const target = new URLSearchParams(window.location.search).get('to'); if (target) { setUserId(target); setAudience('user'); } }, 0); return () => window.clearTimeout(timer); }, []);
  async function sendBroadcast() {
    const cleanTitle = title.trim(), cleanBody = body.trim();
    if (cleanTitle.length < 3 || cleanTitle.length > 100 || cleanBody.length < 5 || cleanBody.length > 500) { notify('Use a title of 3–100 characters and a message of 5–500 characters.', 'error'); return; }
    if (audience === 'user' && !/^[0-9a-f-]{36}$/i.test(userId.trim())) { notify('Enter a valid user ID.', 'error'); return; }
    const target = audience === 'all' ? 'every active user' : audience === 'customers' ? 'every active customer' : audience === 'providers' ? 'every active provider' : `user ${userId.trim()}`;
    if (!(await confirmAction({ title: 'Send notification', message: `This will send “${cleanTitle}” to ${target}.`, requiredText: audience === 'user' ? undefined : 'SEND', confirmLabel: 'Send notification' }))) return;
    setSending(true);
    try { const sent = await sendNotification({ audience, userId: audience === 'user' ? userId : undefined, title: cleanTitle, body: cleanBody }); notify(`Notification sent to ${sent} ${sent === 1 ? 'user' : 'users'}.`); setTitle(''); setBody(''); onSent(); }
    catch (sendError) { notify(sendError instanceof Error ? sendError.message : 'Notification could not be sent.', 'error'); }
    finally { setSending(false); }
  }
  return <Panel eyebrow="Compose" title="Send a notification" description="Send an in-app notification and push alert to active users.">
    <div className="form-grid">
      <Select id="notification-audience" label="Send to" value={audience} onChange={event => setAudience(event.target.value as Audience)}><option value="all">All active users</option><option value="customers">Customers only</option><option value="providers">Providers only</option><option value="user">One user</option></Select>
      {audience === 'user' && <label className="field" htmlFor="notification-target"><span>User ID</span><input id="notification-target" value={userId} onChange={event => setUserId(event.target.value)} placeholder="User UUID" /></label>}
      <label className="field" htmlFor="broadcast-title"><span>Title</span><input id="broadcast-title" maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="A short announcement" /><small>{title.trim().length}/100 characters</small></label>
      <label className="field" htmlFor="broadcast-body"><span>Message</span><textarea id="broadcast-body" maxLength={500} rows={4} value={body} onChange={event => setBody(event.target.value)} placeholder="Write the message users will receive" /><small>{body.trim().length}/500 characters</small></label>
      <div className="panel notification-preview" aria-live="polite"><small>PREVIEW</small><b>{title.trim() || 'Your notification title'}</b><p>{body.trim() || 'Your message will appear here.'}</p></div>
      <button className="primary" type="button" onClick={() => void sendBroadcast()} disabled={sending || title.trim().length < 3 || body.trim().length < 5 || (audience === 'user' && !userId)}>{sending ? 'Sending…' : 'Send notification'}</button>
    </div>
  </Panel>;
}

export function NotificationsPage() {
  const { notify } = useAdmin();
  const [rows, setRows] = useState<AdminRow[]>([]), [page, setPage] = useState(0), [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [counts, setCounts] = useState({ sent: 0, read: 0, unread: 0 });
  const debouncedQuery = useDebouncedValue(q);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    let query = supabase.from('notifications').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(...range(page));
    const search = cleanSearch(debouncedQuery);
    if (search) query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
    const [history, sent, read, unread] = await Promise.all([
      query,
      supabase.from('notifications').select('id', { count: 'exact', head: true }),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).not('read_at', 'is', null),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
    ]);
    if (history.error) setError('Notification history could not be loaded. Refresh and retry.');
    else { setRows((history.data || []) as AdminRow[]); setTotal(history.count || 0); }
    if (sent.error || read.error || unread.error) notify('Notification statistics could not be loaded.', 'error');
    else setCounts({ sent: sent.count || 0, read: read.count || 0, unread: unread.count || 0 });
    setLoading(false);
  }, [debouncedQuery, page, notify]);
  useEffect(() => { let active = true; const run = async () => { if (active) await load(); }; void run(); return () => { active = false; }; }, [load]);
  const refreshAfterSend = useCallback(() => {
    if (page === 0) void load();
    else setPage(0);
  }, [load, page]);
  const readRate = counts.sent ? `${Math.round(counts.read / counts.sent * 100)}%` : '—';
  return <Page title="Notification delivery history" note="Send targeted announcements and inspect notification read state." stats={[
    { label: 'Sent', value: counts.sent, icon: 'S' }, { label: 'Read', value: counts.read, icon: '✓', tone: 'green' },
    { label: 'Unread', value: counts.unread, icon: 'U', tone: 'amber' }, { label: 'Read rate', value: readRate, icon: '%', tone: 'purple' },
  ]}>
    <NotificationComposer onSent={refreshAfterSend} />
    <Panel eyebrow="Delivery" title="Notification history" description="Search titles and messages; recent records appear first.">
      <Search id="notification-search" label="Search notifications" value={q} onChange={value => { setQ(value); setPage(0); }} />
      {loading && !rows.length ? <Skeleton rows={6} /> : error ? <LoadError message={error} retry={load} /> : !rows.length ? <EmptyState title="No notifications found" detail={q ? 'Try another search term.' : 'Sent and generated notifications will appear here.'} /> : <section className="panel audit" aria-busy={loading} style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 120ms' }}>{rows.map(row => <article key={row.id}><i /><div><b>{row.title}</b><p>{row.body}</p><small>{row.user_id?.slice(0, 8)} · <Status value={row.read_at ? 'read' : 'unread'} /></small></div><time>{row.created_at ? new Date(row.created_at).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' }) : '—'}</time></article>)}</section>}
      <Pager page={page} total={total} setPage={setPage} disabled={loading} />
    </Panel>
  </Page>;
}
export function AuditPage() {
  const { notify } = useAdmin(),
    [rows, setRows] = useState<AdminRow[]>([]),
    [page, setPage] = useState(0),
    [total, setTotal] = useState(0),
    [q, setQ] = useState('');
  const debouncedQuery = useDebouncedValue(q);
  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      let x = supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(...range(page));
      if (cleanSearch(debouncedQuery))
        x = x.or(`action.ilike.%${cleanSearch(debouncedQuery)}%,entity_type.ilike.%${cleanSearch(debouncedQuery)}%`);
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
  }, [notify, page, debouncedQuery]);
  return (

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

  );
}
