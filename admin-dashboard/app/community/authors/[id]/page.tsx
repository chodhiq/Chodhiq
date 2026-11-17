'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from '../../../components/admin-link';
import { LoadError, Page, Pager, Skeleton, Status } from '../../../components/ui';
import { supabase } from '../../../../lib/supabase';

type ActivityItem = Record<string, string | number | null | undefined>;
type Activity = { available: boolean; count: number | null; items: ActivityItem[] };
type AuthorProfile = {
  profile: {
    id: string; name: string | null; avatar_url: string | null; created_at: string | null;
    last_active: string | null; account_status: string; role: string; admin_level: string | null;
    email: string | null; phone: string | null; provider_verification: string | null;
  };
  providers: { count: number; items: ActivityItem[] };
  suspensions: Activity;
  privileges: Activity;
  activity: Record<string, Activity>;
};

const sections = [
  ['posts', 'Posts'], ['comments', 'Comments'], ['reviews', 'Reviews'], ['bookings', 'Bookings'],
  ['quotes', 'Quotes'], ['reports_filed', 'Reports filed'], ['reports_against', 'Reports filed against this author'],
  ['notifications', 'Notifications received'], ['moderation_actions', 'Moderation actions'],
] as const;

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Not available' : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function itemHref(section: string, item: ActivityItem, authorId: string) {
  const id = typeof item.id === 'string' ? item.id : '';
  const provider = typeof item.provider_id === 'string' ? item.provider_id : '';
  if (section === 'posts') return `/community#post-${id}`;
  if (section === 'comments') return `/community#post-${item.post_id}`;
  if (section === 'reviews' || section === 'providers') return provider ? `/providers/${provider}` : '/providers';
  if (section === 'bookings') return '/activity?section=bookings';
  if (section === 'quotes') return '/activity?section=quotes';
  if (section === 'reports_filed' || section === 'reports_against') {
    const queue = item.kind === 'provider' ? '/moderation/providers' : '/moderation/community';
    return `${queue}${typeof item.status === 'string' ? `?status=${encodeURIComponent(item.status)}` : ''}`;
  }
  if (section === 'notifications') return '/notifications';
  if (section === 'suspensions') return `/users?user=${encodeURIComponent(authorId)}`;
  if (section === 'privileges') return '/community/privileges';
  if (section === 'moderation_actions') return '/audit';
  return '/community/privileges';
}

function itemTitle(section: string, item: ActivityItem) {
  if (typeof item.body === 'string' && item.body) return item.body;
  if (typeof item.comment === 'string' && item.comment) return item.comment;
  if (typeof item.title === 'string' && item.title) return item.title;
  if (typeof item.business_name === 'string') return item.business_name;
  if (typeof item.provider === 'string') return item.provider;
  if (typeof item.action === 'string') return item.action.replaceAll('_', ' ');
  if (typeof item.reason === 'string') return item.reason.replaceAll('_', ' ');
  return section.replaceAll('_', ' ');
}

function ActivitySection({ title, section, activity, authorId }: { title: string; section: string; activity: Activity; authorId: string }) {
  const [page, setPage] = useState(0);
  const items = activity.items.slice(0, 50);
  const pageSize = 10;
  const visible = items.slice(page * pageSize, (page + 1) * pageSize);
  return <section className="panel">
    <h3>{title} <small>({activity.count ?? '—'})</small></h3>
    {!activity.available ? <p>This activity is unavailable for your administrator role.</p> : !visible.length ? <p>No records.</p> : <>
      <div className="table"><table><thead><tr><th>Record</th><th>Status</th><th>Date</th></tr></thead><tbody>
        {visible.map((item, index) => <tr key={String(item.id ?? `${section}-${index}`)}>
          <td><Link href={itemHref(section, item, authorId)}>{itemTitle(section, item).slice(0, 180)}</Link></td>
          <td>{typeof item.status === 'string' ? <Status value={item.status} /> : typeof item.rating === 'number' ? `${item.rating}/5` : typeof item.kind === 'string' ? item.kind : '—'}</td>
          <td>{formatDate(item.created_at ?? item.joined_at ?? item.updated_at)}</td>
        </tr>)}
      </tbody></table></div>
      <Pager page={page} total={items.length} setPage={setPage} pageSize={pageSize} />
      {activity.count && activity.count > 50 ? <small>Showing the 50 most recent records.</small> : null}
    </>}
  </section>;
}

export default function AuthorProfilePage() {
  const params = useParams<{ id: string }>();
  const authorId = params.id;
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void supabase.rpc('admin_get_author_profile', { author_id: authorId }).then(({ data, error: rpcError }) => {
      if (!active) return;
      if (rpcError || !data) setError('The author profile could not be loaded. Check your access and retry.');
      else setProfile(data as unknown as AuthorProfile);
      setLoading(false);
    });
    return () => { active = false; };
  }, [authorId]);

  const entries = useMemo(() => sections.filter(([key]) => profile?.activity[key]), [profile]);
  if (loading) return <Page title="Author profile" note="Community author activity"><Skeleton rows={5} /></Page>;
  if (error || !profile) return <Page title="Author profile" note="Community author activity"><LoadError message={error || 'Author profile unavailable.'} retry={() => { setError(''); setLoading(true); void supabase.rpc('admin_get_author_profile', { author_id: authorId }).then(({ data, error: rpcError }) => { if (rpcError || !data) setError('The author profile could not be loaded. Check your access and retry.'); else setProfile(data as unknown as AuthorProfile); setLoading(false); }); }} /></Page>;

  const author = profile.profile;
  return <Page title={author.name || 'Author profile'} note="Account, community activity and moderation history" className="author-profile-page">
    <section className="panel">
      <div className="page-identity">
        {author.avatar_url ? <Image src={author.avatar_url} alt="" width={64} height={64} unoptimized /> : null}
        <div><h3>{author.name || 'Name unavailable'}</h3><p>{author.role}{author.admin_level ? ` · ${author.admin_level}` : ''}</p></div>
      </div>
      <dl className="author-profile-details">
        <dt>Account created</dt><dd>{formatDate(author.created_at)}</dd>
        <dt>Last active</dt><dd>{formatDate(author.last_active)}</dd>
        <dt>Account status</dt><dd><Status value={author.account_status} /></dd>
        <dt>Linked provider verification</dt><dd>{author.provider_verification || 'No linked provider verification'}</dd>
        <dt>Contact</dt><dd>{author.email || author.phone || 'Not available for your administrator role'}</dd>
      </dl>
    </section>
    <section className="panel"><h3>Provider ownership ({profile.providers.count})</h3>
      {profile.providers.items.length ? <ul>{profile.providers.items.map((provider) => <li key={String(provider.id)}><Link href={`/providers/${provider.id}`}>{String(provider.name || 'Provider')}</Link> · {String(provider.verification_status || 'unverified')}</li>)}</ul> : <p>No provider listings are linked to this account.</p>}
    </section>
    <ActivitySection title="Suspension records" section="suspensions" activity={profile.suspensions} authorId={author.id} />
    <ActivitySection title="Community privileges" section="privileges" activity={profile.privileges} authorId={author.id} />
    {entries.map(([key, title]) => <ActivitySection key={key} title={title} section={key} activity={profile.activity[key]} authorId={author.id} />)}
  </Page>;
}
