'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from './admin-shell';
import { EmptyState, LoadError, Page, Pager, Skeleton, Status } from './ui';
import { range, useAdmin } from '../../lib/admin';
import { supabase } from '../../lib/supabase';

type Row = {
  id: string;
  status?: string;
  body?: string;
  post_type?: string;
  image_url?: string | null;
  author_id?: string;
  user_id?: string;
  provider_id?: string | null;
  providers?: { business_name?: string } | null;
  created_at?: string;
  requested_date?: string | null;
  requested_time?: string | null;
  plan_code?: string;
  offers_active?: boolean;
  search_tier?: number;
};

export function CommunityPage() {
  const admin = useAdmin();
  const [rows, setRows] = useState<Row[]>([]),
    [page, setPage] = useState(0),
    [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [reason, setReason] = useState(''),
    [live, setLive] = useState(false);
  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      setError('');
      const result = await supabase
        .from('community_posts')
        .select(
          'id,author_id,provider_id,post_type,body,image_url,status,created_at,providers(business_name)',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(...range(page));
      if (result.error) setError('The live community feed could not be loaded.');
      else {
        setRows((result.data || []) as unknown as Row[]);
        setTotal(result.count || 0);
      }
      setLoading(false);
    },
    [page],
  );
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
  useEffect(() => {
    const channel = supabase
      .channel('admin-community-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_posts' },
        () => void load(true),
      )
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    const fallback = window.setInterval(() => void load(true), 30000);
    return () => {
      window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [admin, load]);
  async function moderate(row: Row, status: 'published' | 'removed') {
    const note = reason.trim();
    if (status === 'removed' && note.length < 8) {
      admin.notify('Add a moderation reason of at least 8 characters.', 'error');
      return;
    }
    if (
      status === 'removed' &&
      !(await admin.confirmAction({
        title: 'Remove community post',
        message:
          'This post will immediately disappear from the public feed. The action and reason will be audited.',
        confirmLabel: 'Remove post',
      }))
    )
      return;
    if (
      (
        await admin.act(
          `community_post_${status}`,
          'community_post',
          row.id,
          () =>
            supabase.rpc('admin_transition_community_post', {
              post_id: row.id,
              expected_status: row.status,
              next_status: status,
              reason: note || 'Restored by administrator',
            }),
          { server_audited: true, reason: note || null },
        )
      ).ok
    ) {
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, status } : item)),
      );
      setReason('');
    }
  }
  return (
    <AdminShell title="Community">
      <Page
        title="Live community feed"
        note="Watch community activity as it happens and remove content using audited administrator controls."
      >
        <div className="community-live-toolbar">
          <span className={live ? 'live-indicator on' : 'live-indicator'}>
            <i />
            {live ? 'Live updates connected' : 'Reconnecting…'}
          </span>
          <button className="text" onClick={() => void load()} disabled={loading}>
            Refresh now
          </button>
          <b>{total} posts</b>
        </div>
        <label className="field moderation-reason" htmlFor="community-moderation-reason">
          <span>Moderation reason</span>
          <textarea
            id="community-moderation-reason"
            value={reason}
            minLength={8}
            maxLength={1000}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Required when removing a post (minimum 8 characters)"
          />
          <small>This reason is stored in the administrator audit log.</small>
        </label>
        {loading ? (
          <Skeleton rows={6} />
        ) : error ? (
          <LoadError message={error} retry={load} />
        ) : !rows.length ? (
          <EmptyState
            title="No community activity yet"
            detail="New posts will appear here automatically."
          />
        ) : (
          <section className="panel moderation community-feed-admin">
            {rows.map((row) => (
              <article id={`post-${row.id}`} key={row.id}>
                <div>
                  <span className="tag">{row.post_type}</span>
                  <Status value={row.status || 'unknown'} />
                </div>
                {row.image_url && (
                  <a href={row.image_url} target="_blank" rel="noreferrer">
                    View attached image
                  </a>
                )}
                <p>{row.body}</p>
                <small>
                  {row.providers?.business_name ||
                    `User ${row.author_id?.slice(0, 8) || 'unknown'}`}{' '}
                  ·{' '}
                  {new Date(row.created_at || 0).toLocaleString('en-GB', {
                    timeZone: 'Europe/London',
                  })}
                </small>
                <footer>
                  {row.status !== 'published' && (
                    <button
                      disabled={admin.pending.has(
                        `community_post_published:community_post:${row.id}`,
                      )}
                      onClick={() => moderate(row, 'published')}
                    >
                      Restore to feed
                    </button>
                  )}
                  {row.status !== 'removed' && (
                    <button
                      className="danger"
                      disabled={admin.pending.has(
                        `community_post_removed:community_post:${row.id}`,
                      )}
                      onClick={() => moderate(row, 'removed')}
                    >
                      Remove from feed
                    </button>
                  )}
                </footer>
              </article>
            ))}
            <Pager page={page} total={total} setPage={setPage} />
          </section>
        )}
      </Page>
    </AdminShell>
  );
}

export function ActivityPage() {
  const admin = useAdmin();
  const [quotes, setQuotes] = useState<Row[]>([]),
    [bookings, setBookings] = useState<Row[]>([]),
    [quotePage, setQuotePage] = useState(0),
    [bookingPage, setBookingPage] = useState(0),
    [counts, setCounts] = useState([0, 0]);
  useEffect(() => {
    Promise.all([
      supabase
        .from('quote_requests')
        .select('id,user_id,provider_id,status,created_at,providers(business_name)', {
          count: 'exact',
        })
        .order('created_at', { ascending: false })
        .range(...range(quotePage)),
      supabase
        .from('bookings')
        .select(
          'id,user_id,provider_id,status,created_at,requested_date,requested_time,providers(business_name)',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(...range(bookingPage)),
    ]).then(([quotesResult, bookingsResult]) => {
      if (quotesResult.error) admin.notify(quotesResult.error.message, 'error');
      else setQuotes((quotesResult.data || []) as unknown as Row[]);
      if (bookingsResult.error) admin.notify(bookingsResult.error.message, 'error');
      else setBookings((bookingsResult.data || []) as unknown as Row[]);
      setCounts([quotesResult.count || 0, bookingsResult.count || 0]);
    });
  }, [admin, bookingPage, quotePage]);
  const table = (rows: Row[], booking = false) => (
    <table>
      <thead>
        <tr>
          <th>Provider</th>
          <th>Customer</th>
          <th>Status</th>
          <th>{booking ? 'Requested' : 'Created'}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.providers?.business_name || row.provider_id}</td>
            <td>{row.user_id?.slice(0, 8)}</td>
            <td>
              <Status value={row.status || 'unknown'} />
            </td>
            <td>
              {booking && row.requested_date
                ? row.requested_date
                : new Date(row.created_at || 0).toLocaleDateString('en-GB')}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <AdminShell title="Activity">
      <Page
        title="Marketplace activity"
        note="Read-only quote request and booking demand visibility."
      >
        <div className="columns">
          <section className="panel table">
            <h3>Quote requests ({counts[0]})</h3>
            {table(quotes)}
            <Pager page={quotePage} total={counts[0]} setPage={setQuotePage} />
          </section>
          <section className="panel table">
            <h3>Bookings ({counts[1]})</h3>
            {table(bookings, true)}
            <Pager page={bookingPage} total={counts[1]} setPage={setBookingPage} />
          </section>
        </div>
      </Page>
    </AdminShell>
  );
}

export function SubscriptionsPage() {
  const admin = useAdmin();
  const [entitlements, setEntitlements] = useState<Row[]>([]),
    [requests, setRequests] = useState<Row[]>([]);
  useEffect(() => {
    Promise.all([
      supabase
        .from('provider_entitlements')
        .select(
          'provider_id,plan_code,offers_active,search_tier,expires_at,updated_at,providers(business_name)',
        )
        .order('updated_at', { ascending: false })
        .range(0, 99),
      supabase
        .from('subscription_requests')
        .select('id,provider_id,plan_code,status,created_at,providers(business_name)')
        .order('created_at', { ascending: false })
        .range(0, 99),
    ]).then(([e, r]) => {
      if (e.error) admin.notify(e.error.message, 'error');
      else setEntitlements((e.data || []) as unknown as Row[]);
      if (r.error) admin.notify(r.error.message, 'error');
      else setRequests((r.data || []) as unknown as Row[]);
    });
  }, [admin]);
  return (
    <AdminShell title="Subscriptions">
      <Page title="Subscriptions" note="Read-only entitlement state and provider upgrade requests.">
        <div className="columns">
          <section className="panel table">
            <h3>Entitlements</h3>
            <table>
              <tbody>
                {entitlements.map((row) => (
                  <tr key={row.provider_id}>
                    <td>{row.providers?.business_name}</td>
                    <td>{row.plan_code}</td>
                    <td>
                      <Status value={row.offers_active ? 'active' : 'inactive'} />
                    </td>
                    <td>Tier {row.search_tier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel table">
            <h3>Requests</h3>
            <table>
              <tbody>
                {requests.map((row) => (
                  <tr key={row.id}>
                    <td>{row.providers?.business_name}</td>
                    <td>{row.plan_code}</td>
                    <td>
                      <Status value={row.status || 'unknown'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </Page>
    </AdminShell>
  );
}
