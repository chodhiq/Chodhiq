'use client';
/* eslint-disable react-hooks/set-state-in-effect */



import { useCallback, useEffect, useState } from 'react';
import { cleanSearch, range, useAdmin } from '../../lib/admin';
import { can } from '../../lib/permissions';
import { supabase } from '../../lib/supabase';
import { EmptyState, LoadError, Page, Pager, Search, Skeleton, Status } from './ui';
import { useCounts, type CountDef } from '../../lib/use-counts';
import { useDebouncedValue } from '../../lib/use-debounced-value';
import { useUrlFilter, useUrlParameter } from '../../lib/url-filter';
import Link from './admin-link';
const REVIEW_COUNTS = [
  { key: 'total', table: 'reviews' },
  { key: 'published', table: 'reviews', filters: { moderation_status: 'published' } },
  { key: 'removed', table: 'reviews', filters: { moderation_status: 'removed' } },
] as const satisfies readonly CountDef[];
const LEAD_COUNTS = [
  { key: 'total', table: 'quote_requests', select: 'id' },
  { key: 'awaiting', table: 'quote_requests', select: 'id', filters: { status: ['opened', 'sent', 'viewed'] } },
  { key: 'responded', table: 'quote_requests', select: 'id', filters: { status: 'responded' } },
  { key: 'deliveryProblems', table: 'provider_lead_deliveries', distinctBy: 'quote_request_id', filters: { status: 'failed' } },
] as const satisfies readonly CountDef[];


interface ReviewReplyRow {
  id: string;
  body: string;
}
interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  moderation_status: string;
  providers: { business_name: string; category_id?: string | null; categories?: { name: string } | null } | null;
  review_replies: ReviewReplyRow[] | null;
}
interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}
interface DemandRow {
  id: string;
  user_id: string | null;
  provider_id: string | null;
  message: string | null;
  preferred_contact: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
  response_message: string | null;
  providers: { business_name: string; category_id?: string | null; categories?: { name: string } | null } | null;
  provider_lead_deliveries?: Array<{ id: string; status: string; channel: string; attempts: number; last_error: string | null; delivered_at: string | null; created_at: string }>;
}

export function ReviewsPage() {
  const admin = useAdmin();
  const canModerateReviews = can(admin.adminLevel, 'reviews.moderate');
  const { show } = useCounts(REVIEW_COUNTS);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [page, setPage] = useState(0),
    [total, setTotal] = useState(0);
  const [query, setQuery] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const debouncedQuery = useDebouncedValue(query);
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    let request = supabase
      .from('reviews')
      .select(
        'id,rating,comment,moderation_status,providers(business_name),review_replies(id,body)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(...range(page));
    const search = cleanSearch(debouncedQuery);
    if (search) request = request.ilike('comment', `%${search}%`);
    const result = await request;
    if (result.error) setError('Reviews are unavailable.');
    else {
      setRows((result.data ?? []) as unknown as ReviewRow[]);
      setTotal(result.count ?? 0);
    }
    setLoading(false);
  }, [page, debouncedQuery]);
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
  async function moderate(row: ReviewRow) {
    if (!canModerateReviews) return;
    const next = row.moderation_status === 'removed' ? 'published' : 'removed';
    if (
      next === 'removed' &&
      !(await admin.confirmAction({
        title: 'Remove abusive review',
        message: 'Hide this review from customer and provider surfaces?',
        confirmLabel: 'Remove review',
      }))
    )
      return;
    const result = await admin.act(
      `review_${next}`,
      'review',
      row.id,
      () => supabase.from('reviews').update({ moderation_status: next }).eq('id', row.id),
      { previous_status: row.moderation_status, new_status: next },
    );
    if (result.ok)
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, moderation_status: next } : item)),
      );
  }
  async function removeReply(review: ReviewRow, reply: ReviewReplyRow) {
    if (!canModerateReviews) return;
    if (
      !(await admin.confirmAction({
        title: 'Remove abusive owner reply',
        message: 'Permanently remove this reply while preserving the customer review?',
        confirmLabel: 'Remove reply',
      }))
    )
      return;
    const result = await admin.act(
      'review_reply_removed',
      'review_reply',
      reply.id,
      () => supabase.from('review_replies').delete().eq('id', reply.id),
      { review_id: review.id },
    );
    if (result.ok)
      setRows((current) =>
        current.map((item) =>
          item.id === review.id
            ? {
                ...item,
                review_replies: item.review_replies?.filter((value) => value.id !== reply.id) ?? [],
              }
            : item,
        ),
      );
  }
  return (

      <Page
        title="Customer reviews"
        note="Search reviews, inspect owner replies, and moderate abusive content."
        stats={[{label:'Total reviews',value:show('total')},{label:'Published',value:show('published'),tone:'green'},{label:'Removed',value:show('removed'),tone:'amber'}]}
      >
        <Search
          id="review-search"
          label="Search reviews"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(0);
          }}
        />
        {loading ? (
          <Skeleton />
        ) : error ? (
          <LoadError message={error} retry={load} />
        ) : !rows.length ? (
          <EmptyState
            title={query ? 'No reviews match your search.' : 'No reviews are available.'}
          />
        ) : (
          <section className="panel moderation">
            {rows.map((row) => (
              <article key={row.id}>
                <div>
                  <span className="tag">
                    {row.rating} stars · {row.providers?.business_name}
                  </span>
                  <Status value={row.moderation_status} />
                </div>
                <p>{row.comment || 'No comment'}</p>
                {row.review_replies?.map((reply) => (
                  <blockquote key={reply.id}>
                    Owner reply: {reply.body}
                    {canModerateReviews && <button className="danger" onClick={() => void removeReply(row, reply)}>
                      Remove reply
                    </button>}
                  </blockquote>
                ))}
                <footer>
                  {canModerateReviews && <button
                    className={row.moderation_status === 'removed' ? '' : 'danger'}
                    disabled={admin.pending.has(
                      `review_${row.moderation_status === 'removed' ? 'published' : 'removed'}:review:${row.id}`,
                    )}
                    onClick={() => void moderate(row)}
                  >
                    {row.moderation_status === 'removed' ? 'Restore' : 'Remove review'}
                  </button>}
                </footer>
              </article>
            ))}
            <Pager page={page} total={total} setPage={setPage} />
          </section>
        )}
      </Page>

  );
}

export function CategoriesPage() {
  const admin = useAdmin();
  const canManageCategories = can(admin.adminLevel, 'categories.manage');
  const [rows, setRows] = useState<CategoryRow[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [draft, setDraft] = useState<Omit<CategoryRow, 'id'>>({
    name: '',
    slug: '',
    icon: 'Store',
    color: '#08724f',
    sort_order: 0,
    is_active: true,
  });
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await supabase
      .from('categories')
      .select('id,name,slug,icon,color,sort_order,is_active')
      .order('sort_order');
    if (result.error) setError('Categories are unavailable.');
    else setRows((result.data ?? []) as CategoryRow[]);
    setLoading(false);
  }, []);
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
  function edit(index: number, values: Partial<CategoryRow>) {
    setRows((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...values } : item)),
    );
  }
  async function save(row: CategoryRow | Omit<CategoryRow, 'id'>) {
    if (!canManageCategories) return;
    if (!row.name.trim() || !row.slug.trim()) {
      admin.notify('Name and slug are required.', 'error');
      return;
    }
    const existing = 'id' in row;
    const result = await admin.act(
      existing ? 'category_updated' : 'category_created',
      'category',
      existing ? row.id : row.slug,
      () =>
        existing
          ? supabase
              .from('categories')
              .update({
                name: row.name,
                slug: row.slug,
                icon: row.icon,
                color: row.color,
                sort_order: Number(row.sort_order),
                is_active: row.is_active,
              })
              .eq('id', row.id)
          : supabase.from('categories').insert(row),
    );
    if (result.ok) {
      if (existing) setRows((current) => [...current].sort((a, b) => a.sort_order - b.sort_order));
      else {
        await load();
        setDraft({
          name: '',
          slug: '',
          icon: 'Store',
          color: '#08724f',
          sort_order: 0,
          is_active: true,
        });
      }
    }
  }
  async function remove(row: CategoryRow) {
    if (!canManageCategories) return;
    if (
      !(await admin.confirmAction({
        title: 'Delete category',
        message: `Deleting ${row.name} may affect provider search and onboarding.`,
        requiredText: row.name,
        confirmLabel: 'Delete category',
      }))
    )
      return;
    if (
      (
        await admin.act('category_deleted', 'category', row.id, () =>
          supabase.from('categories').delete().eq('id', row.id),
        )
      ).ok
    )
      setRows((current) => current.filter((item) => item.id !== row.id));
  }
  return (

      <Page title="Category management" note="Create, edit, and order marketplace categories." stats={[{label:'Total categories',value:rows.length},{label:'Active',value:rows.filter(row => row.is_active).length,tone:'green'}]}>
        {loading ? (
          <Skeleton />
        ) : error ? (
          <LoadError message={error} retry={load} />
        ) : (
          <>
            {canManageCategories && <section className="panel form-grid">
              <label htmlFor="new-category-name">
                Name
                <input
                  id="new-category-name"
                  required
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      name: event.target.value,
                      slug: event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    })
                  }
                />
              </label>
              <label htmlFor="new-category-slug">
                Slug
                <input
                  id="new-category-slug"
                  required
                  value={draft.slug}
                  onChange={(event) => setDraft({ ...draft, slug: event.target.value })}
                />
              </label>
              <label htmlFor="new-category-icon">
                Icon name
                <input
                  id="new-category-icon"
                  value={draft.icon}
                  onChange={(event) => setDraft({ ...draft, icon: event.target.value })}
                />
              </label>
              <label htmlFor="new-category-color">
                Colour
                <input
                  id="new-category-color"
                  type="color"
                  value={draft.color}
                  onChange={(event) => setDraft({ ...draft, color: event.target.value })}
                />
              </label>
              <label htmlFor="new-category-order">
                Sort order
                <input
                  id="new-category-order"
                  type="number"
                  min="0"
                  value={draft.sort_order}
                  onChange={(event) =>
                    setDraft({ ...draft, sort_order: Number(event.target.value) })
                  }
                />
              </label>
              <button className="primary" onClick={() => void save(draft)}>
                Create category
              </button>
            </section>}
            {!rows.length ? (
              <EmptyState title="No categories are configured." />
            ) : canManageCategories ? (
              <section className="panel table">
                <table>
                  <thead>
                    <tr>
                      <th>Name / slug</th>
                      <th>Icon</th>
                      <th>Colour</th>
                      <th>Order</th>
                      <th>Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={row.id}>
                        <td>
                          <input
                            aria-label={`Name for ${row.name}`}
                            value={row.name}
                            onChange={(event) => edit(index, { name: event.target.value })}
                          />
                          <input
                            aria-label={`Slug for ${row.name}`}
                            value={row.slug}
                            onChange={(event) => edit(index, { slug: event.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Icon for ${row.name}`}
                            value={row.icon}
                            onChange={(event) => edit(index, { icon: event.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Colour for ${row.name}`}
                            type="color"
                            value={row.color}
                            onChange={(event) => edit(index, { color: event.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Order for ${row.name}`}
                            type="number"
                            min="0"
                            value={row.sort_order}
                            onChange={(event) =>
                              edit(index, { sort_order: Number(event.target.value) })
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Active status for ${row.name}`}
                            type="checkbox"
                            checked={row.is_active}
                            onChange={(event) => edit(index, { is_active: event.target.checked })}
                          />
                        </td>
                        <td>
                          {canManageCategories && <div className="table-actions"><button onClick={() => void save(row)}>Save</button>
                          <button className="danger" onClick={() => void remove(row)}>
                            Delete
                          </button></div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : <EmptyState title="You can view categories but do not have permission to edit them." />}
          </>
        )}
      </Page>

  );
}

export function DemandPage() {
  const { show } = useCounts(LEAD_COUNTS);
  const filterValues = ['all', 'awaiting-response', 'responded', 'delivery-problems', 'opened', 'sent', 'viewed', 'closed'] as const;
  type DemandFilter = typeof filterValues[number];
  const [filter, setFilter] = useUrlFilter<DemandFilter>('filter', filterValues, 'all', 'demand-results');
  const [query, setQuery] = useUrlParameter('q');
  const debouncedQuery = useDebouncedValue(query);
  const [rows, setRows] = useState<DemandRow[]>([]);
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<DemandRow | null>(null);
  const [page, setPage] = useState(0);
  const [now] = useState(() => Date.now());
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const deliveryJoin = filter === 'delivery-problems'
      ? 'provider_lead_deliveries!inner(id,status,channel,attempts,last_error,delivered_at,created_at)'
      : 'provider_lead_deliveries(id,status,channel,attempts,last_error,delivered_at,created_at)';
    let request = supabase.from('quote_requests').select(
      `id,user_id,provider_id,message,preferred_contact,status,created_at,responded_at,response_message,providers(business_name,category_id,categories(name)),${deliveryJoin}`,
      { count: 'exact' },
    );
    if (filter === 'awaiting-response') request = request.in('status', ['opened', 'sent', 'viewed']);
    else if (filter === 'responded') request = request.eq('status', 'responded');
    else if (filter === 'delivery-problems') request = request.eq('provider_lead_deliveries.status', 'failed');
    else if (filter !== 'all') request = request.eq('status', filter);
    const search = cleanSearch(debouncedQuery);
    if (search) {
      if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(search)) request = request.or(`message.ilike.%${search}%,id.eq.${search}`);
      else request = request.ilike('message', `%${search}%`);
    }
    const result = await request.order('created_at', { ascending: false }).range(...range(page));
    if (result.error) setError('Demand records are unavailable. Refresh and retry.');
    const nextRows = (result.data ?? []) as unknown as DemandRow[];
    const customerIds = [...new Set(nextRows.map(row => row.user_id).filter((id): id is string => Boolean(id)))];
    if (customerIds.length) {
      const customers = await supabase.from('profiles').select('id,full_name').in('id', customerIds);
      setCustomerNames(Object.fromEntries((customers.data ?? []).map(customer => [customer.id, customer.full_name || customer.id.slice(0, 8)])));
    } else setCustomerNames({});
    setRows(nextRows);
    setTotal(result.count ?? 0);
    setSelected(current => current && nextRows.some(row => row.id === current.id) ? current : nextRows[0] ?? null);
    setLoading(false);
  }, [filter, debouncedQuery, page]);

  useEffect(() => { void load(); }, [load]);

  return <Page title="Marketplace demand" note="Search and inspect quote requests and delivery history; review bookings on the Activity page." stats={[
    { label: 'Total leads', value: show('total'), href: '/demand?filter=all', onClick: () => { setFilter('all'); setPage(0); }, tone: 'teal' },
    { label: 'Awaiting response', value: show('awaiting'), href: '/demand?filter=awaiting-response', onClick: () => { setFilter('awaiting-response'); setPage(0); }, tone: 'amber' },
    { label: 'Responded', value: show('responded'), href: '/demand?filter=responded', onClick: () => { setFilter('responded'); setPage(0); }, tone: 'green' },
    { label: 'Delivery problems', value: show('deliveryProblems'), href: '/demand?filter=delivery-problems', onClick: () => { setFilter('delivery-problems'); setPage(0); }, tone: 'purple' },
  ]}>
    {loading && !rows.length ? <Skeleton /> : error ? <LoadError message={error} retry={load} /> : <div className="demand-workspace" id="demand-results" aria-busy={loading}>
      <div className="toolbar demand-toolbar">
        <Search id="demand-search" label="Search leads" value={query} onChange={value => { setQuery(value); setPage(0); }} placeholder="Search message or lead ID" />
        <label className="field" htmlFor="demand-status-filter"><span>Lead filter</span><select id="demand-status-filter" value={filter} onChange={event => { setFilter(event.target.value as DemandFilter); setPage(0); }}>
          <option value="all">All leads</option><option value="awaiting-response">Awaiting response</option><option value="responded">Responded</option><option value="delivery-problems">Delivery problems</option><option value="opened">Opened</option><option value="sent">Sent</option><option value="viewed">Viewed</option><option value="closed">Closed</option>
        </select></label>
      </div>
      {!rows.length ? <EmptyState title="No leads match this filter." detail="Try another status or search term." /> : <>
        <div className="panel table demand-table"><table><thead><tr><th>Provider</th><th>Customer</th><th>Category</th><th>Status</th><th>Created</th><th>Age</th></tr></thead><tbody>{rows.map(row => {
          const ageDays = Math.max(0, Math.floor((now - new Date(row.created_at).getTime()) / 86_400_000));
          return <tr key={row.id} aria-selected={selected?.id === row.id}>
            <td>{row.providers?.business_name || 'Provider unavailable'}</td><td>{row.user_id ? <Link href={`/community/authors/${encodeURIComponent(row.user_id)}`}>{customerNames[row.user_id] || 'View customer'}</Link> : 'Unavailable'}</td><td>{row.providers?.categories?.name || '—'}</td><td><Status value={row.status} /></td>
            <td>{new Date(row.created_at).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' })}</td><td>{ageDays === 0 ? 'Today' : `${ageDays} ${ageDays === 1 ? 'day' : 'days'} ago`}<button type="button" className="text" aria-pressed={selected?.id === row.id} onClick={() => setSelected(row)}>View details</button></td>
          </tr>;
        })}</tbody></table></div>
        <Pager page={page} total={total} setPage={setPage} disabled={loading} />
        {selected && <section className="panel demand-detail" aria-label="Lead details"><header><div><span className="page-kicker">Lead details</span><h3>{selected.providers?.business_name || 'Provider unavailable'}</h3></div><Status value={selected.status} /></header><dl>
          <dt>Lead ID</dt><dd>{selected.id}</dd><dt>Customer</dt><dd>{selected.user_id ? <Link href={`/community/authors/${encodeURIComponent(selected.user_id)}`}>{customerNames[selected.user_id] || selected.user_id}</Link> : 'Unavailable'}</dd><dt>Category</dt><dd>{selected.providers?.categories?.name || '—'}</dd><dt>Preferred contact</dt><dd>{selected.preferred_contact || 'Not specified'}</dd>
          <dt>Received</dt><dd>{new Date(selected.created_at).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' })}</dd><dt>Message</dt><dd>{selected.message || 'No message supplied'}</dd>
          <dt>Provider response</dt><dd>{selected.response_message || (selected.responded_at ? 'Response recorded' : 'No response recorded')}</dd>
          <dt>Delivery history</dt><dd>{selected.provider_lead_deliveries?.length ? selected.provider_lead_deliveries.map(delivery => `${delivery.channel}: ${delivery.status}${delivery.last_error ? ` (${delivery.last_error})` : ''}`).join(' · ') : 'No delivery records'}</dd>
        </dl></section>}
      </>}
    </div>}
  </Page>;
}
