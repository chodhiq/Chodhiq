'use client';

import { useCallback, useEffect, useState } from 'react';
import { cleanSearch, range, useAdmin } from '../../lib/admin';
import { supabase } from '../../lib/supabase';
import { AdminShell } from './admin-shell';
import { EmptyState, LoadError, Page, Pager, Search, Skeleton, Status } from './ui';

interface ReviewReplyRow {
  id: string;
  body: string;
}
interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  moderation_status: string;
  providers: { business_name: string } | null;
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
  status: string;
  providers: { business_name: string } | null;
}

export function ReviewsPage() {
  const admin = useAdmin();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [page, setPage] = useState(0),
    [total, setTotal] = useState(0);
  const [query, setQuery] = useState(''),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
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
    const search = cleanSearch(query);
    if (search) request = request.ilike('comment', `%${search}%`);
    const result = await request;
    if (result.error) setError('Reviews are unavailable.');
    else {
      setRows((result.data ?? []) as unknown as ReviewRow[]);
      setTotal(result.count ?? 0);
    }
    setLoading(false);
  }, [page, query]);
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
    <AdminShell title="Review moderation">
      <Page
        title="Customer reviews"
        note="Search reviews, inspect owner replies, and moderate abusive content."
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
                    <button className="danger" onClick={() => void removeReply(row, reply)}>
                      Remove reply
                    </button>
                  </blockquote>
                ))}
                <footer>
                  <button
                    className={row.moderation_status === 'removed' ? '' : 'danger'}
                    disabled={admin.pending.has(
                      `review_${row.moderation_status === 'removed' ? 'published' : 'removed'}:review:${row.id}`,
                    )}
                    onClick={() => void moderate(row)}
                  >
                    {row.moderation_status === 'removed' ? 'Restore' : 'Remove review'}
                  </button>
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

export function CategoriesPage() {
  const admin = useAdmin();
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
    <AdminShell title="Categories">
      <Page title="Category management" note="Create, edit, and order marketplace categories.">
        {loading ? (
          <Skeleton />
        ) : error ? (
          <LoadError message={error} retry={load} />
        ) : (
          <>
            <section className="panel form-grid">
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
            </section>
            {!rows.length ? (
              <EmptyState title="No categories are configured." />
            ) : (
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
                          <button onClick={() => void save(row)}>Save</button>{' '}
                          <button className="danger" onClick={() => void remove(row)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}
      </Page>
    </AdminShell>
  );
}

export function DemandPage() {
  const [quotes, setQuotes] = useState<DemandRow[]>([]),
    [bookings, setBookings] = useState<DemandRow[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [quoteResult, bookingResult] = await Promise.all([
      supabase
        .from('quote_requests')
        .select('id,status,providers(business_name)')
        .order('created_at', { ascending: false })
        .range(0, 24),
      supabase
        .from('bookings')
        .select('id,status,providers(business_name)')
        .order('created_at', { ascending: false })
        .range(0, 24),
    ]);
    if (quoteResult.error || bookingResult.error)
      setError('Demand records are partially or fully unavailable.');
    setQuotes((quoteResult.data ?? []) as unknown as DemandRow[]);
    setBookings((bookingResult.data ?? []) as unknown as DemandRow[]);
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
  return (
    <AdminShell title="Demand">
      <Page
        title="Marketplace demand"
        note="Recent quote requests and bookings; each list shows up to 25 records."
      >
        {loading ? (
          <Skeleton />
        ) : error ? (
          <LoadError message={error} retry={load} />
        ) : (
          <div className="columns">
            <section className="panel">
              <h3>Recent quote requests</h3>
              {quotes.length ? (
                quotes.map((row) => (
                  <p key={row.id}>
                    {row.providers?.business_name || row.id.slice(0, 8)} ·{' '}
                    <Status value={row.status} />
                  </p>
                ))
              ) : (
                <EmptyState title="No recent quote requests." />
              )}
            </section>
            <section className="panel">
              <h3>Recent bookings</h3>
              {bookings.length ? (
                bookings.map((row) => (
                  <p key={row.id}>
                    {row.providers?.business_name || row.id.slice(0, 8)} ·{' '}
                    <Status value={row.status} />
                  </p>
                ))
              ) : (
                <EmptyState title="No recent bookings." />
              )}
            </section>
          </div>
        )}
      </Page>
    </AdminShell>
  );
}
