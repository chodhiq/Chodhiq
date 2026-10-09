'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from './admin-link';
import { CommunityComments } from './community-comments';
import { cleanSearch } from '../../lib/admin';
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
  media_error?: boolean;
  author_name?: string;
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
    [live, setLive] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const requestId = useRef(0);
  const loadingRequest = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(cleanSearch(search));
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const load = useCallback(
    async (quiet = false) => {
      if (quiet && loadingRequest.current) return;
      const request = ++requestId.current;
      loadingRequest.current = true;
      if (!quiet) setLoading(true);
      try {
        let queryBuilder = supabase
          .from('community_posts')
          .select('*,providers(business_name)', { count: 'exact' });
        if (filter !== 'all') queryBuilder = queryBuilder.eq('status', filter);
        if (query) queryBuilder = queryBuilder.ilike('body', '%' + query + '%');
        const result = await queryBuilder
          .order('created_at', { ascending: false })
          .range(...range(page));
        if (result.error) throw result.error;
        const feed = (result.data || []) as unknown as Row[];
        const ids = [...new Set(feed.map((row) => row.author_id).filter(Boolean))] as string[];
        const profiles = ids.length
          ? await supabase.from('profiles').select('id,full_name').in('id', ids)
          : { data: [] };
        const resolved = await Promise.all(
          feed.map(async (row) => {
            const resolve = async (
              url: string | null | undefined,
              prefix: string,
              bucket: string,
            ) => {
              if (!url) return null;
              if (url.startsWith(prefix)) {
                const signed = await supabase.storage
                  .from(bucket)
                  .createSignedUrl(url.slice(prefix.length), 3600);
                return signed.data?.signedUrl || null;
              }
              try {
                return new URL(url).protocol === 'https:' ? url : null;
              } catch {
                return null;
              }
            };
            const image = await resolve(row.image_url, 'community-image:', 'community-images');
            return {
              ...row,
              image_url: image,
              media_error: Boolean(row.image_url && !image),
              author_name:
                profiles.data?.find((person) => person.id === row.author_id)?.full_name ||
                undefined,
            };
          }),
        );
        if (request !== requestId.current) return;
        setRows(resolved);
        setTotal(result.count || 0);
        setError('');
      } catch {
        if (request === requestId.current)
          setError('The live community feed could not be loaded. Check your connection and retry.');
      } finally {
        if (request === requestId.current) {
          setLoading(false);
          loadingRequest.current = false;
        }
      }
    },
    [page, filter, query],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      clearTimeout(timer);
      requestId.current += 1;
      loadingRequest.current = false;
    };
  }, [load]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(true);
    };
    const channel = supabase
      .channel('admin-community-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, refresh)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    const fallback = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(fallback);
      window.removeEventListener('focus', refresh);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  async function moderate(row: Row, status: 'published' | 'removed') {
    const note = (reasons[row.id] || '').trim();
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
      setReasons((current) => ({ ...current, [row.id]: '' }));
      await load(true);
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
            {live ? 'Live updates connected' : 'Auto-refresh every 30 seconds'}
          </span>
          <button className="text" onClick={() => void load()} disabled={loading}>
            Refresh now
          </button>
          <b>{`${total} posts`}</b>
        </div>
        <div className="feed-navigation">
          <Link href="/moderation/community">Reported posts & comments</Link>
          <Link href="/community/privileges">Spaces & member privileges</Link>
          <Link href="/audit">Moderation history</Link>
        </div>
        <div className="feed-filters">
          <label className="field">
            Search posts
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search post content"
            />
          </label>
          <label className="field">
            Post status
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(0);
              }}
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="under_review">Under review</option>
              <option value="removed">Removed</option>
            </select>
          </label>
        </div>
        {loading ? (
          <Skeleton rows={6} />
        ) : error ? (
          <LoadError message={error} retry={load} />
        ) : !rows.length ? (
          <EmptyState
            title="No community activity yet"
            detail="New posts will appear here automatically. Try clearing filters if you expected a post."
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="community-media"
                      src={row.image_url}
                      alt="Community post attachment"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                        event.currentTarget.parentElement?.setAttribute('data-media-error', 'true');
                      }}
                    />
                    <span>Open original photo</span>
                  </a>
                )}
                {row.media_error && (
                  <p role="status">
                    An attachment could not be opened. Refresh to renew media access.
                  </p>
                )}
                <p className="post-body">{row.body}</p>
                <small>
                  {row.providers?.business_name ||
                    row.author_name ||
                    `User ${row.author_id?.slice(0, 8) || 'unknown'}`}{' '}
                  ·{' '}
                  {new Date(row.created_at || 0).toLocaleString('en-GB', {
                    timeZone: 'Europe/London',
                  })}
                </small>
                <div className="post-context">
                  <small>Reference: {row.id}</small>
                  {row.author_id && (
                    <Link href={'/users?user=' + row.author_id}>Manage author account</Link>
                  )}
                </div>
                <label className="field moderation-reason" htmlFor={'reason-' + row.id}>
                  Moderation reason
                  <textarea
                    id={'reason-' + row.id}
                    value={reasons[row.id] || ''}
                    maxLength={1000}
                    onChange={(event) =>
                      setReasons((current) => ({ ...current, [row.id]: event.target.value }))
                    }
                    placeholder="Reason for removing this post (minimum 8 characters)"
                  />
                </label>
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
                <CommunityComments postId={row.id} />
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
        <div className="columns activity-grid">
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
