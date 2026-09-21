'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../../lib/admin';
import { supabase } from '../../../lib/supabase';
import { AdminShell } from '../../components/admin-shell';
import { LoadError, Page, Skeleton, Status } from '../../components/ui';

interface Provider {
  id: string;
  business_name: string;
  category_id: string | null;
  base_city: string | null;
  phone: string | null;
  description: string | null;
  service_areas: string[] | null;
  sponsored_rank: number | null;
  verification_status: string;
  is_verified: boolean;
  avg_rating: number | null;
  updated_at?: string;
}
interface Category {
  id: string;
  name: string;
}
interface Related {
  reviews: Array<{ id: string; rating: number; comment: string | null }>;
  quotes: Array<{ id: string }>;
  verifications: Array<{ id: string; status: string; submitted_at: string }>;
  entitlement: { plan_code: string } | null;
  errors: string[];
}

export default function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const admin = useAdmin();
  const [provider, setProvider] = useState<Provider | null>(null),
    [draft, setDraft] = useState<Provider | null>(null),
    [categories, setCategories] = useState<Category[]>([]);
  const [related, setRelated] = useState<Related>({
    reviews: [],
    quotes: [],
    verifications: [],
    entitlement: null,
    errors: [],
  });
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [notFound, setNotFound] = useState(false);
  const dirty = useMemo(
    () => (provider && draft ? JSON.stringify(provider) !== JSON.stringify(draft) : false),
    [draft, provider],
  );
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotFound(false);
    const [
      providerResult,
      categoryResult,
      reviewResult,
      quoteResult,
      verificationResult,
      entitlementResult,
    ] = await Promise.all([
      supabase.from('providers').select('*').eq('id', id).maybeSingle(),
      supabase.from('categories').select('id,name').eq('is_active', true).order('sort_order'),
      supabase
        .from('reviews')
        .select('id,rating,comment')
        .eq('provider_id', id)
        .order('created_at', { ascending: false })
        .range(0, 9),
      supabase
        .from('quote_requests')
        .select('id')
        .eq('provider_id', id)
        .order('created_at', { ascending: false })
        .range(0, 24),
      supabase
        .from('verification_requests')
        .select('id,status,submitted_at')
        .eq('provider_id', id)
        .order('submitted_at', { ascending: false })
        .range(0, 9),
      supabase
        .from('provider_entitlements')
        .select('plan_code')
        .eq('provider_id', id)
        .maybeSingle(),
    ]);
    if (providerResult.error) setError('The provider dossier could not be loaded.');
    else if (!providerResult.data) setNotFound(true);
    else {
      setProvider(providerResult.data as Provider);
      setDraft(providerResult.data as Provider);
    }
    setCategories((categoryResult.data ?? []) as Category[]);
    const relatedErrors = [
      categoryResult,
      reviewResult,
      quoteResult,
      verificationResult,
      entitlementResult,
    ]
      .filter((result) => result.error)
      .map((result) => result.error!.message);
    setRelated({
      reviews: (reviewResult.data ?? []) as Related['reviews'],
      quotes: (quoteResult.data ?? []) as Related['quotes'],
      verifications: (verificationResult.data ?? []) as Related['verifications'],
      entitlement: entitlementResult.data as Related['entitlement'],
      errors: relatedErrors,
    });
    setLoading(false);
  }, [id]);
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
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  async function save() {
    if (!provider || !draft || saving) return;
    const rank = Number(draft.sponsored_rank ?? 0);
    if (!draft.business_name.trim() || rank < 0 || rank > 10 || !Number.isInteger(rank)) {
      admin.notify('Enter a business name and a sponsored rank from 0 to 10.', 'error');
      return;
    }
    setSaving(true);
    const fields = {
      business_name: draft.business_name.trim(),
      category_id: draft.category_id,
      base_city: draft.base_city?.trim() || null,
      phone: draft.phone?.trim() || null,
      description: draft.description?.trim() || null,
      service_areas: draft.service_areas ?? [],
      sponsored_rank: rank,
    };
    const result = await admin.act(
      'provider_profile_updated',
      'provider',
      id,
      () => {
        let request = supabase.from('providers').update(fields).eq('id', id);
        if (provider.updated_at) request = request.eq('updated_at', provider.updated_at);
        return request.select('*').maybeSingle();
      },
      { previous_values: provider, new_values: fields },
    );
    if (result.ok) await load();
    setSaving(false);
  }

  async function visibility() {
    if (!provider || saving) return;
    const suspended = provider.verification_status === 'suspended';
    const previous = String(
      (provider as Provider & { previous_verification_status?: string })
        .previous_verification_status || 'unverified',
    );
    if (
      !suspended &&
      !(await admin.confirmAction({
        title: 'Suspend provider',
        message: `Remove ${provider.business_name} from marketplace visibility?`,
        requiredText: provider.business_name,
        confirmLabel: 'Suspend provider',
      }))
    )
      return;
    setSaving(true);
    const fields = suspended
      ? { verification_status: previous, is_verified: previous === 'approved' }
      : {
          verification_status: 'suspended',
          is_verified: false,
          previous_verification_status: provider.verification_status,
        };
    if (
      (
        await admin.act(
          suspended ? 'provider_restored' : 'provider_suspended',
          'provider',
          id,
          () => supabase.from('providers').update(fields).eq('id', id),
          {
            previous_values: { verification_status: provider.verification_status },
            new_values: fields,
          },
        )
      ).ok
    )
      await load();
    setSaving(false);
  }

  if (loading)
    return (
      <AdminShell title="Provider dossier">
        <Page title="Loading provider" note="Fetching live provider data.">
          <Skeleton />
        </Page>
      </AdminShell>
    );
  if (error)
    return (
      <AdminShell title="Provider dossier">
        <Page title="Provider unavailable" note="No changes were made.">
          <LoadError message={error} retry={load} />
        </Page>
      </AdminShell>
    );
  if (notFound || !provider || !draft)
    return (
      <AdminShell title="Provider dossier">
        <Page
          title="Provider not found"
          note="This record may have been removed or the link is invalid."
        >
          <p>Return to the provider directory and select another record.</p>
        </Page>
      </AdminShell>
    );
  return (
    <AdminShell title={provider.business_name}>
      <Page
        title="Provider dossier"
        note="Profile and recent related records; lists are transparently limited to the latest 10 reviews/verifications and 25 quotes."
      >
        {related.errors.length > 0 && (
          <section className="load-error" role="alert">
            <b>Some related data is unavailable</b>
            <p>Profile editing remains available. Retry before relying on counts.</p>
            <button onClick={() => void load()}>Retry related data</button>
          </section>
        )}
        <div className="metrics">
          <article className="metric">
            <span>Recent reviews</span>
            <strong>{related.errors.length ? '—' : related.reviews.length}</strong>
            <small>{provider.avg_rating ?? 'No'} average</small>
          </article>
          <article className="metric">
            <span>Recent quotes</span>
            <strong>{related.errors.length ? '—' : related.quotes.length}</strong>
            <small>Latest 25</small>
          </article>
          <article className="metric">
            <span>Plan</span>
            <strong>{related.entitlement?.plan_code || 'free'}</strong>
            <small>Entitlement</small>
          </article>
        </div>
        <div className="columns">
          <section className="panel form-grid">
            <h3>Edit provider</h3>
            <label htmlFor="provider-name">
              Business name
              <input
                id="provider-name"
                required
                value={draft.business_name}
                onChange={(event) => setDraft({ ...draft, business_name: event.target.value })}
              />
            </label>
            <label htmlFor="provider-category">
              Category
              <select
                id="provider-category"
                value={draft.category_id || ''}
                onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="provider-city">
              Base city
              <input
                id="provider-city"
                value={draft.base_city || ''}
                onChange={(event) => setDraft({ ...draft, base_city: event.target.value })}
              />
            </label>
            <label htmlFor="provider-phone">
              Phone
              <input
                id="provider-phone"
                type="tel"
                autoComplete="tel"
                value={draft.phone || ''}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              />
            </label>
            <label htmlFor="provider-description">
              Description
              <textarea
                id="provider-description"
                maxLength={2000}
                value={draft.description || ''}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>
            <label htmlFor="provider-rank">
              Sponsored rank
              <input
                id="provider-rank"
                type="number"
                min="0"
                max="10"
                step="1"
                value={draft.sponsored_rank ?? 0}
                onChange={(event) =>
                  setDraft({ ...draft, sponsored_rank: Number(event.target.value) })
                }
              />
            </label>
            <button className="primary" disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save audited changes'}
            </button>
            <button className="danger" disabled={saving} onClick={() => void visibility()}>
              {provider.verification_status === 'suspended'
                ? 'Restore marketplace listing'
                : 'Suspend marketplace listing'}
            </button>
          </section>
          <section className="panel">
            <h3>Verification history</h3>
            {related.verifications.length ? (
              related.verifications.map((item) => (
                <p key={item.id}>
                  <Status value={item.status} />{' '}
                  {new Date(item.submitted_at).toLocaleDateString('en-GB', {
                    timeZone: 'Europe/London',
                  })}
                </p>
              ))
            ) : (
              <p>No verification history.</p>
            )}
            <h3>Recent reviews</h3>
            {related.reviews.length ? (
              related.reviews.map((review) => (
                <p key={review.id}>
                  {review.rating}★ {review.comment || 'No comment'}
                </p>
              ))
            ) : (
              <p>No reviews.</p>
            )}
          </section>
        </div>
      </Page>
    </AdminShell>
  );
}
