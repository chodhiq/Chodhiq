'use client';

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { AdminShell } from '../components/admin-shell';
import { EmptyState, LoadError, Page, Skeleton, Status } from '../components/ui';
import { useAdmin } from '../../lib/admin';
import { supabase } from '../../lib/supabase';

type Provider = { id: string; business_name: string };
type Campaign = {
  id: string;
  name: string;
  headline: string;
  status: string;
  starts_at: string;
  ends_at: string;
  creative_url: string;
  destination_url: string;
  providers: { business_name: string } | null;
};
type Enquiry = {
  id: string;
  objective: string;
  contact_email: string;
  status: string;
  providers: { business_name: string } | null;
};
type Performance = {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  click_through_rate: number;
};
type Draft = {
  providerId: string;
  name: string;
  headline: string;
  body: string;
  destinationUrl: string;
  startsAt: string;
  endsAt: string;
};
const emptyDraft: Draft = {
  providerId: '',
  name: '',
  headline: '',
  body: '',
  destinationUrl: '',
  startsAt: '',
  endsAt: '',
};
const allowedImages = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export default function CampaignsPage() {
  const admin = useAdmin();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [creative, setCreative] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!admin.isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const [providerResult, enquiryResult, campaignResult, performanceResult] = await Promise.all([
      supabase
        .from('providers')
        .select('id,business_name')
        .eq('is_verified', true)
        .order('business_name')
        .limit(200),
      supabase
        .from('ad_campaign_enquiries')
        .select('id,objective,contact_email,status,providers(business_name)')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('ad_campaigns')
        .select(
          'id,name,headline,status,starts_at,ends_at,creative_url,destination_url,providers(business_name)',
        )
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('ad_campaign_performance')
        .select('id,name,impressions,clicks,click_through_rate')
        .limit(100),
    ]);
    if (
      providerResult.error ||
      enquiryResult.error ||
      campaignResult.error ||
      performanceResult.error
    ) {
      setError('Advertising records could not be loaded.');
    } else {
      setProviders((providerResult.data || []) as Provider[]);
      setEnquiries((enquiryResult.data || []) as unknown as Enquiry[]);
      setCampaigns((campaignResult.data || []) as unknown as Campaign[]);
      setPerformance((performanceResult.data || []) as Performance[]);
    }
    setLoading(false);
  }, [admin.isAdmin]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const chooseCreative = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file && (!allowedImages.has(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024)) {
      setCreative(null);
      setError('Choose a JPEG, PNG or WebP image no larger than 5 MB.');
      return;
    }
    setError('');
    setCreative(file);
  };

  const createCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || !admin.session || !creative) return;
    const startsAt = new Date(draft.startsAt);
    const endsAt = new Date(draft.endsAt);
    if (
      !providers.some((provider) => provider.id === draft.providerId) ||
      draft.name.trim().length < 2 ||
      draft.headline.trim().length < 2 ||
      draft.body.trim().length < 2 ||
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(endsAt.getTime()) ||
      endsAt <= startsAt ||
      endsAt <= new Date()
    ) {
      setError(
        'Choose a verified business, complete the creative and set a valid future end date.',
      );
      return;
    }
    let destination: URL;
    try {
      destination = new URL(draft.destinationUrl.trim());
      if (destination.protocol !== 'https:') throw new Error('HTTPS required');
    } catch {
      setError('Enter a valid HTTPS destination URL.');
      return;
    }
    const approved = await admin.confirmAction({
      title: 'Upload advertising creative',
      message:
        'Create this campaign for review? It will not appear in the app until approved and within its scheduled dates.',
      confirmLabel: 'Create campaign',
    });
    if (!approved) return;
    setBusy(true);
    setError('');
    const campaignId = crypto.randomUUID();
    const path = `${campaignId}/creative.${allowedImages.get(creative.type)}`;
    try {
      const uploaded = await supabase.storage.from('ad-creatives').upload(path, creative, {
        contentType: creative.type,
        upsert: false,
      });
      if (uploaded.error) throw uploaded.error;
      const creativeUrl = supabase.storage.from('ad-creatives').getPublicUrl(path).data.publicUrl;
      const result = await admin.act('campaign_created', 'ad_campaign', campaignId, () =>
        supabase
          .from('ad_campaigns')
          .insert({
            id: campaignId,
            provider_id: draft.providerId,
            name: draft.name.trim(),
            headline: draft.headline.trim(),
            body: draft.body.trim(),
            creative_url: creativeUrl,
            destination_url: destination.href,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            status: 'in_review',
          })
          .select('id')
          .single(),
      );
      if (!result.ok) {
        const saved = await supabase
          .from('ad_campaigns')
          .select('id')
          .eq('id', campaignId)
          .maybeSingle();
        if (!saved.data && !saved.error) {
          await supabase.storage.from('ad-creatives').remove([path]);
        }
        await load();
        setError(result.userMessage);
        return;
      }
      setDraft(emptyDraft);
      setCreative(null);
      admin.notify('Campaign created. Approve it when the creative and destination are checked.');
      await load();
    } catch {
      const saved = await supabase
        .from('ad_campaigns')
        .select('id')
        .eq('id', campaignId)
        .maybeSingle();
      if (!saved.data && !saved.error) {
        await supabase.storage
          .from('ad-creatives')
          .remove([path])
          .catch(() => {});
      }
      setError('Campaign could not be created. Check the image and try again.');
    } finally {
      setBusy(false);
    }
  };

  const transition = async (campaign: Campaign, status: 'approved' | 'paused') => {
    if (busy || !admin.session) return;
    const accepted = await admin.confirmAction({
      title: status === 'approved' ? 'Approve campaign' : 'Pause campaign',
      message:
        status === 'approved'
          ? 'Confirm the image, destination, business and scheduled dates. The ad can appear during its active window.'
          : 'Pause this campaign immediately?',
      confirmLabel: status === 'approved' ? 'Approve' : 'Pause',
    });
    if (!accepted) return;
    setBusy(true);
    try {
      const result = await admin.act(`campaign_${status}`, 'ad_campaign', campaign.id, () =>
        supabase
          .from('ad_campaigns')
          .update({
            status,
            ...(status === 'approved'
              ? { approved_by: admin.session!.user.id, approved_at: new Date().toISOString() }
              : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaign.id)
          .eq('status', campaign.status)
          .select('id')
          .single(),
      );
      await load();
      if (!result.ok) setError(result.userMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell title="Advertising campaigns">
      <Page
        title="Advertising campaigns"
        note="Upload one approved creative at a time into the home feed. No active campaign means no custom-ad card appears in the app."
      >
        {error && <LoadError message={error} retry={load} />}
        {loading ? (
          <Skeleton rows={8} />
        ) : (
          <div className="campaign-operations-grid">
            <form className="panel form-grid" onSubmit={(event) => void createCampaign(event)}>
              <h3>Create a campaign</h3>
              <p>
                The uploaded image stays in review until an administrator approves it. Google banner
                ads remain disabled for beta.
              </p>
              <label className="field">
                Verified business
                <select
                  required
                  value={draft.providerId}
                  disabled={busy}
                  onChange={(event) => setDraft({ ...draft, providerId: event.target.value })}
                >
                  <option value="">Choose business</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.business_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Internal campaign name
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={draft.name}
                  disabled={busy}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </label>
              <label className="field">
                Headline
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={draft.headline}
                  disabled={busy}
                  onChange={(event) => setDraft({ ...draft, headline: event.target.value })}
                />
              </label>
              <label className="field">
                Message
                <textarea
                  required
                  minLength={2}
                  maxLength={240}
                  value={draft.body}
                  disabled={busy}
                  onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                />
              </label>
              <label className="field">
                Creative image (JPEG, PNG or WebP; 5 MB maximum)
                <input
                  required
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={chooseCreative}
                />
              </label>
              {creative && <p>Selected: {creative.name}</p>}
              <label className="field">
                HTTPS destination
                <input
                  required
                  type="url"
                  maxLength={2000}
                  placeholder="https://example.com"
                  value={draft.destinationUrl}
                  disabled={busy}
                  onChange={(event) => setDraft({ ...draft, destinationUrl: event.target.value })}
                />
              </label>
              <label className="field">
                Starts
                <input
                  required
                  type="datetime-local"
                  value={draft.startsAt}
                  disabled={busy}
                  onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })}
                />
              </label>
              <label className="field">
                Ends
                <input
                  required
                  type="datetime-local"
                  value={draft.endsAt}
                  disabled={busy}
                  onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })}
                />
              </label>
              <button
                className="primary"
                type="submit"
                disabled={busy || !creative || !providers.length}
              >
                {busy ? 'Saving…' : 'Create for review'}
              </button>
            </form>
            <section className="panel table">
              <h3>Campaigns</h3>
              {campaigns.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Business</th>
                      <th>Schedule</th>
                      <th>Status</th>
                      <th>Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id}>
                        <td>
                          <a href={campaign.creative_url} target="_blank" rel="noreferrer">
                            {campaign.headline}
                          </a>
                        </td>
                        <td>{campaign.providers?.business_name || 'Business unavailable'}</td>
                        <td>
                          {new Date(campaign.starts_at).toLocaleString('en-GB')} –{' '}
                          {new Date(campaign.ends_at).toLocaleString('en-GB')}
                        </td>
                        <td>
                          <Status value={campaign.status} />
                        </td>
                        <td>
                          {campaign.status === 'in_review' && (
                            <button
                              disabled={busy}
                              onClick={() => void transition(campaign, 'approved')}
                            >
                              Approve
                            </button>
                          )}
                          {['approved', 'scheduled', 'active'].includes(campaign.status) && (
                            <button
                              className="danger"
                              disabled={busy}
                              onClick={() => void transition(campaign, 'paused')}
                            >
                              Pause
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState
                  title="No campaigns uploaded"
                  detail="The app shows no custom ad card until an approved campaign is active."
                />
              )}
            </section>
            <section className="panel table">
              <h3>Campaign enquiries</h3>
              {enquiries.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Objective</th>
                      <th>Contact</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map((enquiry) => (
                      <tr key={enquiry.id}>
                        <td>{enquiry.providers?.business_name}</td>
                        <td>{enquiry.objective}</td>
                        <td>{enquiry.contact_email}</td>
                        <td>
                          <Status value={enquiry.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="No campaign enquiries" />
              )}
            </section>
            <section className="panel table">
              <h3>Performance</h3>
              {performance.length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Impressions</th>
                      <th>Clicks</th>
                      <th>CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.impressions}</td>
                        <td>{item.clicks}</td>
                        <td>{item.click_through_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="No delivery data" />
              )}
            </section>
          </div>
        )}
      </Page>
    </AdminShell>
  );
}
