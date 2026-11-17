'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../../../lib/admin';
import { supabase } from '../../../lib/supabase';
import Link from '../../components/admin-link';
import { sendNotification } from '../../../lib/notify-user';
import { useAdminPageTitle } from '../../components/admin-page-title';
import { LoadError, Page, Skeleton, Status } from '../../components/ui';
import {
  geocodeUkPostcode,
  saveProviderCoordinates,
  type ProviderCoordinates,
} from '../../../../src/lib/providerGeocoding';

interface Provider {
  id: string;
  owner_id: string | null;
  business_name: string;
  category_id: string | null;
  listing_type?: string;
  street_address?: string | null;
  website?: string | null;
  source_url?: string | null;
  subcategory?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  base_city: string | null;
  base_postcode: string | null;
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
  placeSource: { attribution_text: string; source: string } | null;
  errors: string[];
}

export default function ProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const admin = useAdmin();
  const [provider, setProvider] = useState<Provider | null>(null),
    [draft, setDraft] = useState<Provider | null>(null),
    [categories, setCategories] = useState<Category[]>([]);
  useAdminPageTitle(provider?.business_name || 'Provider dossier');
  const [related, setRelated] = useState<Related>({
    reviews: [],
    quotes: [],
    verifications: [],
    entitlement: null,
    placeSource: null,
    errors: [],
  });
  const [placeReason, setPlaceReason] = useState('');
  const [placeMessage, setPlaceMessage] = useState('');
  const [pinLatitude, setPinLatitude] = useState('');
  const [pinLongitude, setPinLongitude] = useState('');
  const [pinReason, setPinReason] = useState('');
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
      placeSourceResult,
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
      supabase.from('place_sources').select('attribution_text,source').eq('listing_id', id).maybeSingle(),
    ]);
    if (providerResult.error) setError('The provider dossier could not be loaded.');
    else if (!providerResult.data) setNotFound(true);
    else {
      setProvider(providerResult.data as Provider);
      setDraft(providerResult.data as Provider);
      setPinLatitude(providerResult.data.latitude == null ? '' : String(providerResult.data.latitude));
      setPinLongitude(providerResult.data.longitude == null ? '' : String(providerResult.data.longitude));
    }
    setCategories((categoryResult.data ?? []) as Category[]);
    const relatedErrors = [
      categoryResult,
      reviewResult,
      quoteResult,
      verificationResult,
      entitlementResult,
      placeSourceResult,
    ]
      .filter((result) => result.error)
      .map((result) => result.error!.message);
    setRelated({
      reviews: (reviewResult.data ?? []) as Related['reviews'],
      quotes: (quoteResult.data ?? []) as Related['quotes'],
      verifications: (verificationResult.data ?? []) as Related['verifications'],
      entitlement: entitlementResult.data as Related['entitlement'],
      placeSource: placeSourceResult.data as Related['placeSource'],
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
    let coordinates: ProviderCoordinates | null = null;
    try {
      coordinates = draft.base_postcode?.trim()
        ? await geocodeUkPostcode(draft.base_postcode)
        : null;
    } catch (geocodeError) {
      admin.notify(
        geocodeError instanceof Error ? geocodeError.message : 'The postcode could not be geocoded.',
        'error',
      );
      return;
    }
    setSaving(true);
    const fields = {
      business_name: draft.business_name.trim(),
      category_id: draft.category_id,
      base_city: draft.base_city?.trim() || null,
      base_postcode: draft.base_postcode?.trim() || null,
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
    if (result.ok) {
      if (coordinates) {
        try {
          await saveProviderCoordinates(supabase, id, coordinates);
        } catch (locationError) {
          admin.notify(
            `Provider details were saved, but coordinates could not be updated: ${
              locationError instanceof Error
                ? locationError.message
                : 'The map location could not be saved.'
            }`,
            'error',
          );
        }
      }
      await load();
    }
    setSaving(false);
  }

  async function savePlace() {
    if (!provider || !draft || saving || provider.listing_type !== 'place') return;
    if (placeReason.trim().length < 8) { setPlaceMessage('Reason must be at least 8 characters.'); return; }
    if (draft.website?.trim() && !/^https:\/\//i.test(draft.website.trim())) { setPlaceMessage('Website must start with https://.'); return; }
    const changes = {
      business_name: draft.business_name.trim(), category_id: draft.category_id,
      street_address: draft.street_address?.trim() || null, base_postcode: draft.base_postcode?.trim() || null,
      base_city: draft.base_city?.trim() || null, phone: draft.phone?.trim() || null,
      website: draft.website?.trim() || null, description: draft.description?.trim() || null,
      subcategory: draft.subcategory?.trim() || null,
    };
    setSaving(true); setPlaceMessage('');
    const result = await supabase.rpc('admin_update_place', { provider_id: id, changes, reason: placeReason.trim() });
    if (result.error) setPlaceMessage(`Could not save place: ${result.error.message}`);
    else { setPlaceMessage('Place details saved.'); setPlaceReason(''); await load(); }
    setSaving(false);
  }

  async function movePlacePin() {
    if (!provider || saving || provider.listing_type !== 'place') return;
    if (pinReason.trim().length < 8) {
      setPlaceMessage('Move pin reason must be at least 8 characters.');
      return;
    }
    const latitude = Number(pinLatitude), longitude = Number(pinLongitude);
    if (!Number.isFinite(latitude) || latitude < 49 || latitude > 61 || !Number.isFinite(longitude) || longitude < -9 || longitude > 2) {
      setPlaceMessage('Enter latitude 49–61 and longitude -9–2.'); return;
    }
    setSaving(true); setPlaceMessage('');
    const result = await supabase.rpc('admin_set_place_coordinates', {
      provider_id: id,
      latitude,
      longitude,
      reason: pinReason.trim(),
    });
    if (result.error) setPlaceMessage(`Could not move pin: ${result.error.message}`);
    else { setPlaceMessage('Map pin moved.'); setPinReason(''); await load(); }
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
      ? { verification_status: previous, is_verified: previous === 'verified' }
      : {
          verification_status: 'suspended',
          is_verified: false,
          previous_verification_status: provider.verification_status,
        };
    const result = await admin.act(
          suspended ? 'provider_restored' : 'provider_suspended',
          'provider',
          id,
          () => supabase.from('providers').update(fields).eq('id', id),
          {
            previous_values: { verification_status: provider.verification_status },
            new_values: fields,
          },
        );
    if (result.ok) {
      if (provider.owner_id) {
        try { await sendNotification({ audience: 'user', userId: provider.owner_id, title: suspended ? 'Your provider account is active again' : 'Your provider account was suspended', body: suspended ? 'Your provider profile is available in the marketplace again.' : 'Your provider profile was suspended and is hidden from the marketplace. Contact support if you need help.' }); }
        catch { admin.notify('Provider status updated, but the owner notification could not be sent.', 'error'); }
      }
      await load();
    }
    setSaving(false);
  }

  if (loading)
    return (

        <Page title="Loading provider" note="Fetching live provider data.">
          <Skeleton />
        </Page>

    );
  if (error)
    return (

        <Page title="Provider unavailable" note="No changes were made.">
          <LoadError message={error} retry={load} />
        </Page>

    );
  if (notFound || !provider || !draft)
    return (

        <Page
          title="Provider not found"
          note="This record may have been removed or the link is invalid."
        >
          <p>Return to the provider directory and select another record.</p>
        </Page>

    );
  return (

      <Page
        title="Provider dossier"
        note="Profile and recent related records; lists are transparently limited to the latest 10 reviews/verifications and 25 quotes."
      >
        {provider.owner_id && <p><Link className="outline" href={`/notifications?to=${encodeURIComponent(provider.owner_id)}`}>Notify provider</Link></p>}
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
        {provider.listing_type === 'place' && (
          <section className="panel">
            <h3>Source information</h3>
            {provider.source_url ? <p><a href={provider.source_url} target="_blank" rel="noreferrer">Open source record</a></p> : <p>No source URL is recorded.</p>}
            {related.placeSource?.attribution_text && <p>{related.placeSource.attribution_text}</p>}
          </section>
        )}
        <div className="columns">
          <section className="panel form-grid">
            <h3>{provider.listing_type === 'place' ? 'Edit place' : 'Edit provider'}</h3>
            {provider.listing_type === 'place' ? (
              <>
                <label>Business name<input value={draft.business_name} onChange={(event) => setDraft({ ...draft, business_name: event.target.value })} /></label>
                <label>Category<select value={draft.category_id || ''} onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label>Street address<input value={draft.street_address || ''} onChange={(event) => setDraft({ ...draft, street_address: event.target.value })} /></label>
                <label>Postcode<input value={draft.base_postcode || ''} onChange={(event) => setDraft({ ...draft, base_postcode: event.target.value })} /></label>
                <label>City<input value={draft.base_city || ''} onChange={(event) => setDraft({ ...draft, base_city: event.target.value })} /></label>
                <label>Phone<input type="tel" value={draft.phone || ''} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
                <label>Website (HTTPS)<input type="url" value={draft.website || ''} onChange={(event) => setDraft({ ...draft, website: event.target.value })} /></label>
                <label>Description<textarea value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
                <label>Subcategory<input value={draft.subcategory || ''} onChange={(event) => setDraft({ ...draft, subcategory: event.target.value })} /></label>
                <label>Required reason<textarea required minLength={8} value={placeReason} onChange={(event) => setPlaceReason(event.target.value)} /></label>
                <button className="primary" disabled={saving || placeReason.trim().length < 8} onClick={() => void savePlace()}>Save audited place changes</button>
                <p role="status">{placeMessage}</p>
                <h3>Move pin</h3>
                <label>Latitude (49 to 61)<input type="number" min="49" max="61" step="any" value={pinLatitude} onChange={(event) => setPinLatitude(event.target.value)} /></label>
                <label>Longitude (-9 to 2)<input type="number" min="-9" max="2" step="any" value={pinLongitude} onChange={(event) => setPinLongitude(event.target.value)} /></label>
                <label>Required move reason<textarea required minLength={8} value={pinReason} onChange={(event) => setPinReason(event.target.value)} /></label>
                <button disabled={saving || pinReason.trim().length < 8} onClick={() => void movePlacePin()}>Move pin</button>
              </>
            ) : (
              <>
                <label>Business name<input value={draft.business_name} onChange={(event) => setDraft({ ...draft, business_name: event.target.value })} /></label>
                <label>Category<select value={draft.category_id || ''} onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label>Base city<input value={draft.base_city || ''} onChange={(event) => setDraft({ ...draft, base_city: event.target.value })} /></label>
                <label>Postcode<input value={draft.base_postcode || ''} onChange={(event) => setDraft({ ...draft, base_postcode: event.target.value })} /></label>
                <label>Phone<input value={draft.phone || ''} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label>
                <label>Description<textarea value={draft.description || ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
                <label>Sponsored rank<input type="number" min="0" max="10" step="1" value={draft.sponsored_rank ?? 0} onChange={(event) => setDraft({ ...draft, sponsored_rank: Number(event.target.value) })} /></label>
                <button className="primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save audited changes'}</button>
                <button className="danger" disabled={saving} onClick={() => void visibility()}>{provider.verification_status === 'suspended' ? 'Restore marketplace listing' : 'Suspend marketplace listing'}</button>
              </>
            )}
          </section>          <section className="panel">
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

  );
}
