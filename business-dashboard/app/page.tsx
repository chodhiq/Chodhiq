'use client';
/* eslint-disable jsx-a11y/label-has-associated-control, @next/next/no-img-element */

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  validateOptionalUrl,
  validateService,
  validateText,
  validateUpload,
} from '../lib/validation';
import { brand } from '../lib/brand';
import { respondToLead, updateLeadStatus } from '../lib/lead-api';
import { signInErrorMessage, withAuthTimeout } from '../lib/auth-operations';
import { BusinessApplication, CreateAccount } from './business-application';

const paymentsEnabled = process.env.NEXT_PUBLIC_ENABLE_PAYMENTS?.trim().toLowerCase() === 'true';
const freePromotionsEnabled =
  process.env.NEXT_PUBLIC_ENABLE_FREE_PROMOTIONS?.trim().toLowerCase() === 'true';

type Section =
  | 'overview'
  | 'profile'
  | 'services'
  | 'hours'
  | 'reviews'
  | 'promotions'
  | 'leads'
  | 'analytics'
  | 'plans';
type Provider = {
  id: string;
  owner_id: string;
  business_name: string;
  description: string | null;
  base_city: string | null;
  base_postcode: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  cover_image_url: string | null;
  avg_rating: number;
  review_count: number;
  is_verified: boolean;
  verification_status: string;
};
type Service = {
  id: string;
  name: string;
  description: string | null;
  starting_price: number | null;
  is_featured: boolean;
};
type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  review_replies?: { id: string; body: string }[];
};
type Lead = {
  id: string;
  user_id: string;
  message: string | null;
  preferred_contact: string;
  status: string;
  response_message: string | null;
  responded_at: string | null;
  created_at: string;
};
type Notification = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};
type ClaimableProvider = {
  id: string;
  business_name: string;
  base_city: string | null;
  base_postcode: string | null;
};
const nav: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'Dashboard', icon: '⌂' },
  { id: 'profile', label: 'Business profile', icon: '▣' },
  { id: 'promotions', label: 'Posts & offers', icon: '◎' },
  ...(paymentsEnabled ? ([{ id: 'plans', label: 'Subscription', icon: '◇' }] as const) : []),
  { id: 'leads', label: 'Leads & messages', icon: '✉' },
  { id: 'analytics', label: 'Insights', icon: '↗' },
  { id: 'reviews', label: 'Reviews', icon: '★' },
  { id: 'services', label: 'Services', icon: '✦' },
  { id: 'hours', label: 'Opening hours', icon: '◷' },
];
const week = [
  { label: 'Monday', dayOfWeek: 1 },
  { label: 'Tuesday', dayOfWeek: 2 },
  { label: 'Wednesday', dayOfWeek: 3 },
  { label: 'Thursday', dayOfWeek: 4 },
  { label: 'Friday', dayOfWeek: 5 },
  { label: 'Saturday', dayOfWeek: 6 },
  { label: 'Sunday', dayOfWeek: 0 },
];
const providerColumns =
  'id,owner_id,business_name,description,base_city,base_postcode,phone,whatsapp,website,cover_image_url,avg_rating,review_count,is_verified,verification_status';

function ProviderReviews({
  providerId,
  uid,
  notify,
}: {
  providerId: string;
  uid: string;
  notify: (m: string) => void;
}) {
  const [items, setItems] = useState<Review[]>([]);
  const load = useCallback(async () => {
    const reviewResult = await supabase
      .from('reviews')
      .select('id,rating,comment,created_at')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });
    if (reviewResult.error) return notify(reviewResult.error.message);
    const rows = (reviewResult.data || []) as Review[];
    if (!rows.length) return setItems([]);
    const replyResult = await supabase
      .from('review_replies')
      .select('id,review_id,body')
      .in(
        'review_id',
        rows.map((r) => r.id),
      );
    if (replyResult.error) return notify(`Could not load replies: ${replyResult.error.message}`);
    const replies = new Map(
      (replyResult.data || []).map((reply) => [
        reply.review_id,
        { id: reply.id, body: reply.body },
      ]),
    );
    setItems(
      rows.map((review) => ({
        ...review,
        review_replies: replies.has(review.id) ? [replies.get(review.id)!] : [],
      })),
    );
  }, [providerId, notify]);
  useEffect(() => {
    // The async loader synchronizes this view with Supabase on mount/provider change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  return (
    <Reviews providerId={providerId} reviews={items} uid={uid} reload={load} notify={notify} />
  );
}

function VerificationPanel({
  provider,
  uid,
  reload,
  notify,
}: {
  provider: Provider;
  uid: string;
  reload: () => void;
  notify: (m: string) => void;
}) {
  const [requestId, setRequestId] = useState(''),
    [documents, setDocuments] = useState<
      { id: string; document_type: string; storage_path: string }[]
    >([]),
    [type, setType] = useState('business_registration'),
    [notes, setNotes] = useState(''),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data: r, error } = await supabase
      .from('verification_requests')
      .select('id,status,notes')
      .eq('provider_id', provider.id)
      .in('status', ['draft', 'pending', 'changes_requested'])
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return notify(error.message);
    if (r) {
      setRequestId(r.id);
      setNotes(r.notes || '');
      const { data: d, error: de } = await supabase
        .from('verification_documents')
        .select('id,document_type,storage_path')
        .eq('request_id', r.id)
        .order('created_at');
      if (de) notify(de.message);
      else setDocuments(d || []);
    } else {
      setRequestId('');
      setDocuments([]);
    }
  }, [provider.id, notify]);
  useEffect(() => {
    // The async loader synchronizes this view with Supabase on mount/provider change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function ensureDraft() {
    if (requestId) return requestId;
    const { data, error } = await supabase
      .from('verification_requests')
      .insert({
        provider_id: provider.id,
        submitted_by: uid,
        status: 'draft',
        notes,
      })
      .select('id')
      .single();
    if (error) throw error;
    setRequestId(data.id);
    return data.id;
  }
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateUpload(file, ['application/pdf', 'image/jpeg', 'image/png']);
    if (validation) {
      notify(validation);
      e.target.value = '';
      return;
    }
    setBusy(true);
    try {
      const rid = await ensureDraft();
      const path = `${uid}/${provider.id}/${rid}/${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9.]/gi, '-')}`;
      const up = await supabase.storage.from('verification-documents').upload(path, file);
      if (up.error) throw up.error;
      const meta = await supabase.from('verification_documents').insert({
        request_id: rid,
        provider_id: provider.id,
        uploaded_by: uid,
        document_type: type,
        storage_path: path,
      });
      if (meta.error) {
        await supabase.storage.from('verification-documents').remove([path]);
        throw meta.error;
      }
      notify('Verification document uploaded');
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }
  async function submit() {
    setBusy(true);
    const { error } = await supabase.rpc('submit_provider_verification', {
      target_provider: provider.id,
      request_notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) notify(error.message);
    else {
      notify('Verification request submitted for admin review');
      await load();
      reload();
    }
  }
  return (
    <div className="page form-page">
      <section className="panel form-card">
        <h3>Ownership evidence</h3>
        <p>
          Upload a Companies House document, licence, utility bill or other proof connecting you to
          this business. Files remain private to you and administrators.
        </p>
        <div className="verification-upload">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="business_registration">Business registration</option>
            <option value="licence">Business licence</option>
            <option value="proof_of_address">Proof of address</option>
            <option value="other">Other evidence</option>
          </select>
          <label className="upload">
            {busy ? 'Uploading…' : '＋ Upload PDF or image'}
            <input
              disabled={busy || provider.verification_status === 'verified'}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={upload}
            />
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note for the verification team"
          />
        </div>
        <div className="verification-files">
          {documents.map((d) => (
            <div key={d.id}>
              <b>{d.document_type.replaceAll('_', ' ')}</b>
              <span>Uploaded securely</span>
            </div>
          ))}
        </div>
        <button
          className="outline"
          disabled={
            busy ||
            !documents.length ||
            provider.verification_status === 'pending' ||
            provider.verification_status === 'verified'
          }
          onClick={submit}
        >
          {provider.verification_status === 'pending'
            ? 'Awaiting admin review'
            : provider.verification_status === 'verified'
              ? 'Verified'
              : 'Submit verification request'}
        </button>
      </section>
    </div>
  );
}

export default function BusinessDashboard() {
  const [session, setSession] = useState<Session | null>(null),
    [authLoading, setAuthLoading] = useState(isSupabaseConfigured),
    [recovering, setRecovering] = useState(
      () => typeof window !== 'undefined' && window.location.hash.includes('type=recovery'),
    ),
    [loading, setLoading] = useState(false);
  const [section, setSection] = useState<Section>('overview'),
    [provider, setProvider] = useState<Provider | null>(null),
    [services, setServices] = useState<Service[]>([]),
    [reviews, setReviews] = useState<Review[]>([]),
    [reviewsSeen, setReviewsSeen] = useState(false),
    [leads, setLeads] = useState<Lead[]>([]),
    [events, setEvents] = useState<{ event_type: string; created_at: string }[]>([]),
    [plan, setPlan] = useState('free'),
    [notifications, setNotifications] = useState<Notification[]>([]),
    [notificationsOpen, setNotificationsOpen] = useState(false),
    [toast, setToast] = useState('');
  const notify = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 2600);
  }, []);
  const loadDashboard = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const uid = session.user.id;
    const { data: p, error } = await supabase
      .from('providers')
      .select(providerColumns)
      .eq('owner_id', uid)
      .limit(1)
      .maybeSingle();
    if (error) notify(error.message);
    setProvider(p);
    const n = await supabase
      .from('notifications')
      .select('id,title,body,read_at,created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(30);
    if (n.error) notify(n.error.message);
    else setNotifications(n.data || []);
    if (p) {
      const [s, r, a, e, l] = await Promise.all([
        supabase.from('services').select('*').eq('provider_id', p.id).order('created_at'),
        supabase
          .from('reviews')
          .select('id,rating,comment,created_at,review_replies(id,body)')
          .eq('provider_id', p.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('provider_analytics_events')
          .select('event_type,created_at')
          .eq('provider_id', p.id),
        supabase
          .from('provider_entitlements')
          .select('plan_code')
          .eq('provider_id', p.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('quote_requests')
          .select(
            'id,user_id,message,preferred_contact,status,response_message,responded_at,created_at',
          )
          .eq('provider_id', p.id)
          .order('created_at', { ascending: false }),
      ]);
      setServices(s.data || []);
      setReviews((r.data || []) as unknown as Review[]);
      setEvents(a.data || []);
      setPlan(e.data?.plan_code || 'free');
      setLeads((l.data || []) as Lead[]);
    }
    setLoading(false);
  }, [session, notify]);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setAuthLoading(false);
      })
      .catch(() => setAuthLoading(false));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(s);
      setAuthLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (session) queueMicrotask(() => void loadDashboard());
  }, [session, loadDashboard]);
  if (authLoading) return <Loading label="Securing your workspace…" />;
  if (!isSupabaseConfigured) return <Setup />;
  if (recovering) return <ResetPassword onComplete={() => setRecovering(false)} />;
  if (!session) return <Login />;
  if (loading) return <Loading label="Loading your business…" />;
  if (!provider) return <BusinessApplication session={session} onApproved={loadDashboard} />;
  if (!provider.is_verified || provider.verification_status !== 'verified')
    return (
      <main className="auth-page">
        <section className="auth-card onboarding-card">
          <small>BUSINESS VERIFICATION</small>
          <h2>{provider.business_name}</h2>
          <p>
            Your listing is claimed, but the business workspace stays locked until an administrator
            approves your evidence.
          </p>
          <p>
            Status: <b>{provider.verification_status.replaceAll('_', ' ')}</b>
          </p>
          <VerificationPanel
            provider={provider}
            uid={session.user.id}
            reload={loadDashboard}
            notify={notify}
          />
          <button className="text-button" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </section>
        {toast && <div className="toast">{toast}</div>}
      </main>
    );
  const completion =
    [
      provider.description,
      provider.phone,
      provider.base_city,
      provider.cover_image_url,
      services.length,
    ].filter(Boolean).length * 20;
  const unreadCount = notifications.filter((n) => !n.read_at).length;
  async function openNotifications() {
    setNotificationsOpen((v) => !v);
    if (unreadCount) {
      const readAt = new Date().toISOString();
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('user_id', session!.user.id)
        .is('read_at', null);
      if (error) notify(error.message);
      else
        setNotifications((items) =>
          items.map((item) => ({ ...item, read_at: item.read_at || readAt })),
        );
    }
  }
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Image src={brand.logoPath} alt="" width={38} height={38} />
          </span>
          <div>
            <strong>{brand.name}</strong>
            <small>BUSINESS STUDIO</small>
          </div>
        </div>
        <nav aria-label="Business sections">
          {nav.map((n) => (
            <button
              key={n.id}
              aria-label={n.label}
              aria-current={section === n.id ? 'page' : undefined}
              className={section === n.id ? 'active' : ''}
              onClick={() => {
                setSection(n.id);
                if (n.id === 'reviews') setReviewsSeen(true);
              }}
            >
              <span>{n.icon}</span>
              {n.label}
              {n.id === 'reviews' && !reviewsSeen && reviews.length > 0 && <b>{reviews.length}</b>}
            </button>
          ))}
        </nav>
        {paymentsEnabled && (
          <div className="side-card">
            <span>{plan.toUpperCase()}</span>
            <strong>Grow your local reach</strong>
            <p>Publish offers and earn promoted placement.</p>
            <button onClick={() => setSection('plans')}>Manage plan →</button>
          </div>
        )}
        <button className="account" onClick={() => supabase.auth.signOut()}>
          <span className="avatar">{provider.business_name.slice(0, 2).toUpperCase()}</span>
          <span>
            <strong>{provider.business_name}</strong>
            <small>Sign out</small>
          </span>
        </button>
      </aside>
      <section className="workspace">
        <header>
          <div>
            <p>
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
            <h1>{nav.find((n) => n.id === section)?.label}</h1>
          </div>
          <div className="header-actions">
            <span className="live-pill">● Live data</span>
            <button aria-label="Notifications" className="icon-button" onClick={openNotifications}>
              ♢{unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}
            </button>
            <button
              className="view-button"
              onClick={() => window.open(`chodhiq://provider/${provider.id}`)}
            >
              View listing ↗
            </button>
            {notificationsOpen && (
              <div className="notification-panel">
                <header>
                  <b>Notifications</b>
                  <span>{unreadCount} unread</span>
                </header>
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setNotificationsOpen(false)}
                    className={n.read_at ? '' : 'unread'}
                  >
                    <b>{n.title}</b>
                    <span>{n.body}</span>
                    <time>{new Date(n.created_at).toLocaleString('en-GB')}</time>
                  </button>
                ))}
                {!notifications.length && <p>No notifications yet.</p>}
              </div>
            )}
          </div>
        </header>
        {section === 'overview' && (
          <Overview
            provider={provider}
            completion={completion}
            events={events}
            leads={leads}
            plan={plan}
            go={setSection}
          />
        )}{' '}
        {section === 'profile' && (
          <>
            <Profile
              provider={provider}
              setProvider={setProvider}
              notify={notify}
              uid={session.user.id}
            />
            <VerificationPanel
              provider={provider}
              uid={session.user.id}
              reload={loadDashboard}
              notify={notify}
            />
          </>
        )}{' '}
        {section === 'services' && (
          <Services
            providerId={provider.id}
            services={services}
            reload={loadDashboard}
            notify={notify}
          />
        )}{' '}
        {section === 'hours' && <Hours providerId={provider.id} notify={notify} />}{' '}
        {section === 'reviews' && (
          <ProviderReviews providerId={provider.id} uid={session.user.id} notify={notify} />
        )}{' '}
        {section === 'promotions' && (
          <Promotions provider={provider} uid={session.user.id} plan={plan} notify={notify} />
        )}{' '}
        {section === 'leads' && <Leads leads={leads} reload={loadDashboard} notify={notify} />}{' '}
        {section === 'analytics' && <Analytics events={events} />}{' '}
        {section === 'plans' && <Plans providerId={provider.id} current={plan} notify={notify} />}
      </section>
      {toast && <div className="toast">✓ {toast}</div>}
    </main>
  );
}

function Login() {
  const [creating, setCreating] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const [emailError, setEmailError] = useState("");
  function checkEmail() {
    const input = emailInput.current;
    if (!input) return false;
    const valid = input.validity.valid;
    setEmailError(valid ? "" : input.validity.valueMissing ? "Enter your email address." : "Enter a valid email address, such as name@example.com.");
    return valid;
  }
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [showPassword, setShowPassword] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !checkEmail()) return;
    setBusy(true);
    setError('');
    try {
      const result = await withAuthTimeout(
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
      );
      if (result.error) setError(signInErrorMessage(result.error));
      else if (!result.data.session)
        setError('Sign-in did not create a session. Please try again.');
    } catch (signInError) {
      setError(signInErrorMessage(signInError));
    } finally {
      setBusy(false);
    }
  }
  async function forgotPassword() {
    if (busy || !checkEmail()) return;
    setError('');
    setNotice('');
    if (!email.trim()) return setError('Enter your email address first.');
    setBusy(true);
    try {
      const result = await withAuthTimeout(
        supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        }),
      );
      if (result.error) setError('Password reset is temporarily unavailable. Please try again.');
      else setNotice('If an account exists for that email, a password reset link has been sent.');
    } catch {
      setError('Password reset timed out. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  if (creating) return <CreateAccount onBack={() => setCreating(false)} />;
  return (
    <main className="auth-page">
      <section className="auth-brand">
        <span className="brand-mark">
          <Image src={brand.logoPath} alt={`${brand.name} logo`} width={54} height={54} />
        </span>
        <p>{brand.name.toUpperCase()} BUSINESS</p>
        <h1>Your business, professionally managed.</h1>
        <span>
          Update your listing, publish offers, understand customers and grow across the UK South
          Indian community.
        </span>
      </section>
      <section className="auth-card">
        <small>SECURE OWNER ACCESS</small>
        <h2>Welcome back</h2>
        <p>Sign in with your approved provider account.</p>
        <form onSubmit={submit}>
          <label>
            Email address
            <input type="email" required autoComplete="username" ref={emailInput}
              maxLength={254}
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(emailError)}
              aria-describedby="login-email-error"
              onBlur={checkEmail} value={email} onChange={(e) => { setEmail(e.target.value); setError(""); setNotice(""); checkEmail(); }} />
          </label>
          <p id="login-email-error" className="form-error" aria-live="polite">{emailError}</p>
          <label>
            Password
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && (
            <p className="form-notice" role="status">
              {notice}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? 'Please wait…' : 'Sign in'}
          </button>
          <button type="button" className="text-button" disabled={busy} onClick={forgotPassword}>
            Forgot password?
          </button>
          <button type="button" className="text-button" disabled={busy} onClick={() => setCreating(true)}>Create account</button>
        </form>
      </section>
    </main>
  );
}
function ResetPassword({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [showPassword, setShowPassword] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 10) return setError('Use at least 10 characters.');
    if (password !== confirmation) return setError('The passwords do not match.');
    setBusy(true);
    const result = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (result.error)
      return setError('The password could not be updated. Request a new reset link.');
    window.history.replaceState({}, '', window.location.pathname);
    onComplete();
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <small>SECURE RECOVERY</small>
        <h2>Choose a new password</h2>
        <p>Use at least 10 characters and avoid reusing an old password.</p>
        <form onSubmit={submit}>
          <label>
            New password
            <span className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={10}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </label>
          <label>
            Confirm new password
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={10}
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>
    </main>
  );
}
function Setup() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <h2>Connect Supabase</h2>
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code>, add the project URL and
          publishable key, then restart the dashboard.
        </p>
      </section>
    </main>
  );
}
function Loading({ label }: { label: string }) {
  return (
    <main className="loading">
      <span className="brand-mark">
        <Image src={brand.logoPath} alt={`${brand.name} logo`} width={54} height={54} />
      </span>
      <p>{label}</p>
    </main>
  );
}
// Retained for the post-prelaunch claim workflow; it is deliberately not
// reachable while provider access is administrator provisioned.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Onboarding({
  uid,
  done,
  notify,
}: {
  uid: string;
  done: () => void;
  notify: (m: string) => void;
}) {
  const [mode, setMode] = useState<'claim' | 'create'>('claim'),
    [name, setName] = useState(''),
    [city, setCity] = useState(''),
    [categoryId, setCategoryId] = useState(''),
    [search, setSearch] = useState(''),
    [claimable, setClaimable] = useState<ClaimableProvider[]>([]),
    [busy, setBusy] = useState(false),
    [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    Promise.all([
      supabase.from('categories').select('id,name').eq('is_active', true).order('sort_order'),
      supabase
        .from('providers')
        .select('id,business_name,base_city,base_postcode')
        .is('owner_id', null)
        .eq('is_claimed', false)
        .not('source_profile_id', 'is', null)
        .order('business_name')
        .limit(100),
    ]).then(([c, p]) => {
      if (c.error) notify(c.error.message);
      else {
        setCategories(c.data || []);
        setCategoryId(c.data?.[0]?.id || '');
      }
      if (p.error) notify(p.error.message);
      else setClaimable(p.data || []);
    });
  }, [notify]);
  async function create(e: FormEvent) {
    e.preventDefault();
    const nameError = validateText(name, 'Business name', 2, 160);
    if (nameError) return notify(nameError);
    const cityError = validateText(city, 'Base city', 2, 120);
    if (cityError) return notify(cityError);
    if (!categoryId) return notify('Choose a business category');
    setBusy(true);
    const { error } = await supabase.from('providers').insert({
      owner_id: uid,
      business_name: name.trim(),
      base_city: city.trim(),
      category_id: categoryId,
      verification_status: 'unverified',
      is_claimed: true,
    });
    setBusy(false);
    if (error)
      notify(
        error.code === '23505' ? 'This account already has a business workspace' : error.message,
      );
    else {
      notify('Business workspace created');
      done();
    }
  }
  async function claim(id: string) {
    if (
      !window.confirm(
        'Claim this listing? You will need to upload proof before it can be verified.',
      )
    )
      return;
    setBusy(true);
    const { error } = await supabase.rpc('claim_imported_provider', {
      target_provider: id,
    });
    setBusy(false);
    if (error) notify(error.message);
    else {
      notify('Listing claimed — upload proof to request verification');
      done();
    }
  }
  const matches = claimable.filter((p) =>
    `${p.business_name} ${p.base_city || ''} ${p.base_postcode || ''}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <main className="auth-page">
      <section className="auth-card onboarding-card">
        <small>BUSINESS ACCESS</small>
        <h2>
          {mode === 'claim' ? 'Claim your existing listing' : 'Create your business workspace'}
        </h2>
        <div className="onboarding-tabs">
          <button
            className={mode === 'claim' ? 'primary' : 'text-button'}
            onClick={() => setMode('claim')}
          >
            Claim listing
          </button>
          <button
            className={mode === 'create' ? 'primary' : 'text-button'}
            onClick={() => setMode('create')}
          >
            Create new
          </button>
        </div>
        {mode === 'claim' ? (
          <>
            <p>
              Search imported directory listings. Claiming does not issue a verified badge until
              evidence is approved.
            </p>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business, city or postcode"
            />
            <div className="claim-results">
              {matches.map((p) => (
                <button disabled={busy} key={p.id} onClick={() => claim(p.id)}>
                  <b>{p.business_name}</b>
                  <span>
                    {p.base_city}
                    {p.base_postcode ? ` · ${p.base_postcode}` : ''}
                  </span>
                  <em>Claim</em>
                </button>
              ))}
              {!matches.length && <p>No unclaimed imported listings match your search.</p>}
            </div>
          </>
        ) : (
          <form onSubmit={create}>
            <label>
              Business name
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Base city
              <input required value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label>
              Business category
              <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Choose a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create workspace'}
            </button>
          </form>
        )}
        <button className="text-button" onClick={() => supabase.auth.signOut()}>
          Use another account
        </button>
      </section>
    </main>
  );
}

function Overview({
  provider,
  completion,
  events,
  leads,
  plan,
  go,
}: {
  provider: Provider;
  completion: number;
  events: { event_type: string }[];
  leads: Lead[];
  plan: string;
  go: (s: Section) => void;
}) {
  const count = (x: string) => events.filter((e) => e.event_type === x).length;
  const points = [24, 34, 31, 48, 43, 60, 54, 69, 51, 63, 58, 72];
  return (
    <div className="page">
      <div className="reference-welcome">
        <div>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>{provider.business_name} 👋</h2>
          <p>Manage your business and grow with the South Indian community.</p>
        </div>
        <button className="primary" onClick={() => go('promotions')}>
          ＋ Create new post
        </button>
      </div>
      <div className="stat-grid">
        <Stat label="Profile views" value={String(count('view'))} note="+18% this month" />
        <Stat label="Post impressions" value={String(events.length)} note="+23% this month" />
        <Stat label="Total leads" value={String(leads.length)} note="Customer enquiries" />
        <Stat label="Saved by users" value={String(count('save'))} note="+15% this month" />
      </div>
      <div className="reference-grid">
        {paymentsEnabled && (
          <section className="panel subscription-summary">
            <small>SUBSCRIPTION PLAN</small>
            <StatusPill text="Active" />
            <h3>{planLabel(plan)}</h3>
            <strong>{planPrice(plan)}</strong>
            <button className="primary" onClick={() => go('plans')}>
              Manage subscription
            </button>
          </section>
        )}
        <section className="panel completion-card">
          <h3>Profile completion</h3>
          <div className="completion">
            <div
              className="ring"
              style={{ '--value': `${completion * 3.6}deg` } as React.CSSProperties}
            >
              <strong>{completion}%</strong>
            </div>
            <ul>
              <li>Business information ✓</li>
              <li>Photos & gallery ✓</li>
              <li>Business hours {completion > 70 ? '✓' : '○'}</li>
              <li>Services {completion > 80 ? '✓' : '○'}</li>
            </ul>
          </div>
        </section>
        <section className="panel recent-leads">
          <h3>
            Recent leads <button onClick={() => go('leads')}>View all</button>
          </h3>
          {leads.slice(0, 4).map((l, i) => (
            <div key={l.id}>
              <span>{String(i + 1)}</span>
              <p>
                <b>Customer enquiry</b>
                <small>{l.message || 'Requested business details'}</small>
              </p>
              <time>{new Date(l.created_at).toLocaleDateString('en-GB')}</time>
            </div>
          ))}
          {!leads.length && <p className="mini-empty">New enquiries will appear here.</p>}
        </section>
        <section className="panel performance-card">
          <h3>
            Performance overview <small>This month</small>
          </h3>
          <div className="sparkline">
            {points.map((p, i) => (
              <i key={i} style={{ height: `${p}%` }} />
            ))}
          </div>
          <div className="chart-legend">
            <span>● Views</span>
            <span>● Leads</span>
          </div>
        </section>
      </div>
    </div>
  );
}
function planLabel(p: string) {
  return p === 'top5'
    ? 'Top 5 Plan'
    : p === 'top10'
      ? 'Top 10 Plan'
      : p === 'community'
        ? 'Community Plan'
        : 'Free Plan';
}
function planPrice(p: string) {
  return p === 'top5'
    ? '£50 / month'
    : p === 'top10'
      ? '£25 / month'
      : p === 'community'
        ? '£10 / month'
        : '£0 / month';
}
function StatusPill({ text }: { text: string }) {
  return <span className="status-pill">{text}</span>;
}
function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className="green">{note}</small>
    </article>
  );
}
function Profile({
  provider,
  setProvider,
  notify,
  uid,
}: {
  provider: Provider;
  setProvider: (p: Provider) => void;
  notify: (m: string) => void;
  uid: string;
}) {
  const [draft, setDraft] = useState(provider),
    [uploading, setUploading] = useState(false);
  async function save() {
    const nameError = validateText(draft.business_name, 'Business name', 2, 160);
    if (nameError) return notify(nameError);
    const websiteError = validateOptionalUrl(draft.website || '');
    if (websiteError) return notify(websiteError);
    const { error } = await supabase
      .from('providers')
      .update({
        business_name: draft.business_name,
        description: draft.description,
        base_city: draft.base_city,
        base_postcode: draft.base_postcode,
        phone: draft.phone,
        whatsapp: draft.whatsapp,
        website: draft.website,
        cover_image_url: draft.cover_image_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', provider.id);
    if (error) notify(error.message);
    else {
      setProvider(draft);
      notify('Profile saved to your live listing');
    }
  }
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateUpload(file, ['image/jpeg', 'image/png', 'image/webp']);
    if (validation) {
      notify(validation);
      e.target.value = '';
      return;
    }
    setUploading(true);
    const path = `${uid}/${provider.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-z0-9.]/gi, '-')}`;
    const { error } = await supabase.storage.from('provider-media').upload(path, file);
    if (error) notify(error.message);
    else {
      const { data } = supabase.storage.from('provider-media').getPublicUrl(path);
      setDraft({ ...draft, cover_image_url: data.publicUrl });
      notify('Photo uploaded — save to publish');
    }
    setUploading(false);
  }
  async function verify() {
    const { error } = await supabase.from('verification_requests').insert({
      provider_id: provider.id,
      submitted_by: uid,
      status: 'pending',
      notes: 'Submitted from business dashboard',
    });
    notify(error ? error.message : 'Verification request submitted');
  }
  return (
    <div className="page form-page">
      <div className="section-title">
        <div>
          <h2>Business profile</h2>
          <p>Everything here powers your public listing.</p>
        </div>
        <button className="primary" onClick={save}>
          Save changes
        </button>
      </div>
      <section className="panel form-card">
        <h3>Business details</h3>
        <div className="form-grid">
          {[
            ['Business name', 'business_name'],
            ['Base city', 'base_city'],
            ['Postcode', 'base_postcode'],
            ['Phone', 'phone'],
            ['WhatsApp', 'whatsapp'],
            ['Website', 'website'],
          ].map(([label, key]) => (
            <label key={key}>
              <span>{label}</span>
              <input
                value={String(draft[key as keyof Provider] || '')}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="wide">
            <span>Description</span>
            <textarea
              value={draft.description || ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
        </div>
      </section>
      <section className="panel form-card">
        <div className="panel-head">
          <div>
            <h3>Cover photo</h3>
            <p>JPG, PNG or WebP up to 10 MB.</p>
          </div>
          <label className="upload">
            {uploading ? 'Uploading…' : '＋ Upload photo'}
            <input type="file" accept="image/*" onChange={upload} />
          </label>
        </div>
        {draft.cover_image_url && (
          <div className="photo-grid">
            <div>
              <img src={draft.cover_image_url} alt="Business cover" />
              <span>Cover</span>
            </div>
          </div>
        )}
      </section>
      <section className="panel verification-card">
        <div>
          <h3>Business verification</h3>
          <p>
            Status: <b>{provider.verification_status}</b>. Admin approval is required before a
            verified badge is issued.
          </p>
        </div>
        <button className="outline" onClick={verify}>
          Request verification
        </button>
      </section>
    </div>
  );
}
function Services({
  providerId,
  services,
  reload,
  notify,
}: {
  providerId: string;
  services: Service[];
  reload: () => void;
  notify: (m: string) => void;
}) {
  const [name, setName] = useState(''),
    [price, setPrice] = useState(''),
    [catalog, setCatalog] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    supabase
      .from('service_catalog')
      .select('id,name')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (error) notify(error.message);
        else setCatalog(data || []);
      });
  }, [notify]);
  async function add() {
    const validation = validateService(name, price);
    if (validation) return notify(validation);
    const catalogService = catalog.find(
      (service) => service.name.toLowerCase() === name.trim().toLowerCase(),
    );
    const { error } = await supabase.from('services').insert({
      provider_id: providerId,
      name: name.trim(),
      catalog_service_id: catalogService?.id || null,
      starting_price: price.trim() ? Number(price) : null,
      is_featured: true,
    });
    if (error) notify(error.message);
    else {
      setName('');
      setPrice('');
      notify('Service added');
      reload();
    }
  }
  async function toggle(s: Service) {
    const { error } = await supabase
      .from('services')
      .update({ is_featured: !s.is_featured })
      .eq('id', s.id);
    if (error) return notify(error.message);
    reload();
  }
  async function remove(id: string) {
    if (!window.confirm('Delete this service? This cannot be undone.')) return;
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) return notify(error.message);
    notify('Service removed');
    reload();
  }
  return (
    <div className="page form-page">
      <div className="section-title">
        <div>
          <h2>Products & services</h2>
          <p>Add accurate prices to turn visits into enquiries.</p>
        </div>
      </div>
      <section className="panel form-card">
        <div className="add-service">
          <input
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Choose or enter a service"
            list="chodhiq-service-catalog"
          />
          <datalist id="chodhiq-service-catalog">
            {catalog.map((service) => (
              <option key={service.id} value={service.name} />
            ))}
          </datalist>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="Price from (£)"
          />
          <button className="primary" onClick={add}>
            Add service
          </button>
        </div>
        {services.map((s) => (
          <div className="service-row" key={s.id}>
            <button
              className={s.is_featured ? 'service-icon active' : 'service-icon'}
              onClick={() => toggle(s)}
            >
              ✓
            </button>
            <div>
              <b>{s.name}</b>
              <small>{s.starting_price ? `From £${s.starting_price}` : 'Price on request'}</small>
            </div>
            <button onClick={() => remove(s.id)}>Delete</button>
          </div>
        ))}
      </section>
    </div>
  );
}
function Hours({ providerId, notify }: { providerId: string; notify: (m: string) => void }) {
  const [hours, setHours] = useState(() =>
    week.map((d) => ({
      day: d.label,
      day_of_week: d.dayOfWeek,
      closed: d.dayOfWeek === 0,
      open: '09:00',
      close: d.dayOfWeek === 6 ? '14:00' : '17:30',
    })),
  );
  useEffect(() => {
    supabase
      .from('provider_hours')
      .select('*')
      .eq('provider_id', providerId)
      .then(({ data, error }) => {
        if (error) return notify(error.message);
        if (data?.length)
          setHours(
            week.map((d) => {
              const x = data.find((h) => h.day_of_week === d.dayOfWeek);
              return {
                day: d.label,
                day_of_week: d.dayOfWeek,
                closed: x?.is_closed ?? true,
                open: (x?.open_time || '09:00').slice(0, 5),
                close: (x?.close_time || '17:30').slice(0, 5),
              };
            }),
          );
      });
  }, [providerId, notify]);
  async function save() {
    const invalid = hours.find((h) => !h.closed && (!h.open || !h.close || h.open >= h.close));
    if (invalid) return notify(`${invalid.day}: closing time must be after opening time`);
    const schedule = hours.map((h) => ({
      day_of_week: h.day_of_week,
      is_closed: h.closed,
      open_time: h.closed ? null : h.open,
      close_time: h.closed ? null : h.close,
    }));
    const { error } = await supabase.rpc('replace_provider_hours', {
      target_provider: providerId,
      schedule,
    });
    notify(error ? error.message : 'Opening hours saved');
  }
  return (
    <div className="page form-page">
      <div className="section-title">
        <div>
          <h2>Opening hours</h2>
          <p>Clear availability helps customers contact you at the right time.</p>
        </div>
        <button className="primary" onClick={save}>
          Save hours
        </button>
      </div>
      <section className="panel form-card hours-list">
        {hours.map((h, i) => (
          <div key={h.day}>
            <b>{h.day}</b>
            <label className="switch">
              <input
                type="checkbox"
                checked={!h.closed}
                onChange={() =>
                  setHours((x) => x.map((a, j) => (j === i ? { ...a, closed: !a.closed } : a)))
                }
              />
              <span />
            </label>
            <input
              type="time"
              aria-label={`${h.day} opening time`}
              value={h.open}
              disabled={h.closed}
              onChange={(e) =>
                setHours((x) => x.map((a, j) => (j === i ? { ...a, open: e.target.value } : a)))
              }
            />
            <span>to</span>
            <input
              type="time"
              aria-label={`${h.day} closing time`}
              value={h.close}
              disabled={h.closed}
              onChange={(e) =>
                setHours((x) => x.map((a, j) => (j === i ? { ...a, close: e.target.value } : a)))
              }
            />
            {h.closed && <em>Closed</em>}
          </div>
        ))}
      </section>
    </div>
  );
}
function Reviews({
  providerId,
  reviews,
  uid,
  reload,
  notify,
}: {
  providerId: string;
  reviews: Review[];
  uid: string;
  reload: () => void;
  notify: (m: string) => void;
}) {
  const [replies, setReplies] = useState<Record<string, string>>({});
  async function reply(r: Review) {
    const body = replies[r.id]?.trim() || '';
    const validation = validateText(body, 'Reply', 2, 2000);
    if (validation) return notify(validation);
    const { error } = await supabase
      .from('review_replies')
      .upsert(
        { review_id: r.id, provider_id: providerId, author_id: uid, body },
        { onConflict: 'review_id' },
      );
    notify(error ? error.message : 'Reply published');
    if (!error) reload();
  }
  return (
    <div className="page form-page">
      <div className="section-title">
        <div>
          <h2>Customer reviews</h2>
          <p>Professional public replies build trust.</p>
        </div>
      </div>
      {reviews.length === 0 && <section className="panel empty">No reviews yet.</section>}
      {reviews.map((r) => (
        <section className="panel review" key={r.id}>
          <div className="review-head">
            <span className="avatar">C</span>
            <div>
              <b>Customer</b>
              <strong>{'★'.repeat(r.rating)}</strong>
              <small>{new Date(r.created_at).toLocaleDateString('en-GB')}</small>
            </div>
          </div>
          <p>{r.comment}</p>
          {r.review_replies?.[0] ? (
            <div className="owner-reply">
              <b>Your reply</b>
              <p>{r.review_replies[0].body}</p>
            </div>
          ) : (
            <>
              <textarea
                maxLength={2000}
                value={replies[r.id] || ''}
                onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })}
                placeholder="Write a public reply…"
              />
              <button className="primary" onClick={() => reply(r)}>
                Publish reply
              </button>
            </>
          )}
        </section>
      ))}
    </div>
  );
}
function Promotions({
  provider,
  uid,
  plan,
  notify,
}: {
  provider: Provider;
  uid: string;
  plan: string;
  notify: (m: string) => void;
}) {
  const [body, setBody] = useState(''),
    [image, setImage] = useState<File | null>(null),
    [busy, setBusy] = useState(false);
  const [campaignEmail, setCampaignEmail] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('');
  const [campaignBudget, setCampaignBudget] = useState('');
  const [campaignStart, setCampaignStart] = useState('');
  const [campaignEnd, setCampaignEnd] = useState('');

  async function enquireAboutCampaign(event: FormEvent) {
    event.preventDefault();
    const objectiveError = validateText(campaignObjective, 'Campaign objective', 10, 1000);
    if (objectiveError) return notify(objectiveError);
    if (!/^\S+@\S+\.\S+$/.test(campaignEmail))
      return notify('Enter a valid campaign contact email');
    const pounds = Number(campaignBudget);
    if (!Number.isFinite(pounds) || pounds <= 0)
      return notify('Enter a campaign budget above zero');
    if (campaignStart && campaignEnd && campaignEnd <= campaignStart)
      return notify('Campaign end date must be after its start date');
    const { error } = await supabase.from('ad_campaign_enquiries').insert({
      provider_id: provider.id,
      requested_by: uid,
      contact_email: campaignEmail.trim(),
      objective: campaignObjective.trim(),
      target_cities: provider.base_city ? [provider.base_city] : [],
      requested_start: campaignStart || null,
      requested_end: campaignEnd || null,
      budget_pence: Math.round(pounds * 100),
    });
    if (error) return notify(error.message);
    setCampaignObjective('');
    setCampaignBudget('');
    setCampaignStart('');
    setCampaignEnd('');
    notify('Campaign enquiry submitted for review');
  }
  async function publish() {
    if (plan === 'free' && !freePromotionsEnabled)
      return notify('Promotional publishing is not enabled for your account');
    const textError = validateText(body, 'Offer caption', 2, 2000);
    if (textError) return notify(textError);
    if (!image) return notify('Add an offer image');
    const fileError = validateUpload(image, ['image/jpeg', 'image/png', 'image/webp']);
    if (fileError) return notify(fileError);
    setBusy(true);
    const path = `${uid}/${provider.id}/promotions/${crypto.randomUUID()}-${image.name.replace(/[^a-z0-9.]/gi, '-')}`;
    const up = await supabase.storage.from('provider-media').upload(path, image);
    if (up.error) {
      notify(up.error.message);
      setBusy(false);
      return;
    }
    const url = supabase.storage.from('provider-media').getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from('community_posts').insert({
      author_id: uid,
      provider_id: provider.id,
      post_type: 'promotion',
      body: body.trim(),
      image_url: url,
    });
    if (error) await supabase.storage.from('provider-media').remove([path]);
    notify(error ? error.message : 'Promotion published to the community feed');
    if (!error) {
      setBody('');
      setImage(null);
    }
    setBusy(false);
  }
  return (
    <div className="page form-page">
      <div className="section-title">
        <div>
          <h2>Promotional posts</h2>
          <p>
            {freePromotionsEnabled
              ? 'Verified providers may publish organic offers during the initial launch. Paid placement remains disabled.'
              : 'Promotional publishing is available only to eligible accounts.'}
          </p>
        </div>
        <span className="rating-chip">{plan.toUpperCase()}</span>
      </div>
      <section className="panel form-card">
        <label>
          <span>Offer caption</span>
          <textarea
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tell customers what is special, when it ends, and how to claim it."
          />
        </label>
        <label className="upload">
          ＋ Choose poster/image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </label>
        {image && <p>{image.name}</p>}
        <button className="primary" disabled={busy} onClick={publish}>
          {busy ? 'Publishing…' : 'Publish offer'}
        </button>
      </section>
      <section className="panel form-card">
        <h3>Advertise with ChodhiQ</h3>
        <p>
          Request a clearly labelled campaign. Nothing is published until ChodhiQ approves the
          creative, targeting, schedule and invoice.
        </p>
        <form onSubmit={enquireAboutCampaign}>
          <label>
            <span>Contact email</span>
            <input
              type="email"
              required
              value={campaignEmail}
              onChange={(e) => setCampaignEmail(e.target.value)}
            />
          </label>
          <label>
            <span>Campaign objective</span>
            <textarea
              required
              minLength={10}
              maxLength={1000}
              value={campaignObjective}
              onChange={(e) => setCampaignObjective(e.target.value)}
            />
          </label>
          <label>
            <span>Indicative budget (£)</span>
            <input
              type="number"
              min="1"
              step="0.01"
              required
              value={campaignBudget}
              onChange={(e) => setCampaignBudget(e.target.value)}
            />
          </label>
          <div className="add-service">
            <label>
              <span>Preferred start</span>
              <input
                type="date"
                value={campaignStart}
                onChange={(e) => setCampaignStart(e.target.value)}
              />
            </label>
            <label>
              <span>Preferred end</span>
              <input
                type="date"
                value={campaignEnd}
                onChange={(e) => setCampaignEnd(e.target.value)}
              />
            </label>
          </div>
          <button className="primary" type="submit">
            Submit campaign enquiry
          </button>
        </form>
      </section>
    </div>
  );
}
function Leads({
  leads,
  reload,
  notify,
}: {
  leads: Lead[];
  reload: () => void;
  notify: (m: string) => void;
}) {
  const [selected, setSelected] = useState<Lead | null>(leads[0] || null),
    [response, setResponse] = useState('');
  async function status(id: string, value: string) {
    const current = leads.find((item) => item.id === id);
    if (!current) return;
    try {
      await updateLeadStatus(id, current.status, value);
      notify(`Lead marked ${value}`);
      reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not update lead');
    }
  }
  async function send() {
    if (!selected) return;
    const body = response.trim();
    const validation = validateText(body, 'Response', 2, 2000);
    if (validation) return notify(validation);
    try {
      await respondToLead(selected.id, selected.status, body);
      notify('Response sent to the customer');
      setSelected({
        ...selected,
        status: 'responded',
        response_message: body,
        responded_at: new Date().toISOString(),
      });
      setResponse('');
      reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not send response');
    }
  }
  return (
    <div className="page form-page">
      <div className="section-title">
        <div>
          <h2>Leads & messages</h2>
          <p>Respond quickly to customer enquiries and keep their progress organised.</p>
        </div>
        <span className="rating-chip">{leads.filter((l) => l.status === 'sent').length} NEW</span>
      </div>
      <div className="lead-layout">
        <section className="panel lead-list">
          {leads.map((l, i) => (
            <button
              className={selected?.id === l.id ? 'selected' : ''}
              key={l.id}
              onClick={() => {
                setSelected(l);
                setResponse('');
              }}
            >
              <span>{String(i + 1)}</span>
              <p>
                <b>Customer enquiry</b>
                <small>{l.message || 'New enquiry'}</small>
              </p>
              <time>{new Date(l.created_at).toLocaleDateString('en-GB')}</time>
            </button>
          ))}
          {!leads.length && <div className="empty">No leads yet.</div>}
        </section>
        <section className="panel lead-detail">
          {selected ? (
            <>
              <div className="lead-person">
                <span>C</span>
                <div>
                  <h3>Customer enquiry</h3>
                  <p>Preferred contact: {selected.preferred_contact}</p>
                </div>
                <StatusPill text={selected.status} />
              </div>
              <div className="message-bubble">
                {selected.message || 'I would like more information about your services.'}
              </div>
              {selected.response_message ? (
                <div className="owner-reply">
                  <b>Your response</b>
                  <p>{selected.response_message}</p>
                </div>
              ) : (
                <>
                  <textarea
                    maxLength={2000}
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Write a clear response, price estimate, or next step…"
                  />
                  <div className="lead-actions">
                    <button onClick={() => status(selected.id, 'viewed')}>Mark viewed</button>
                    <button className="primary" disabled={!response.trim()} onClick={send}>
                      Send response
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="empty">Select a lead to view details.</div>
          )}
        </section>
      </div>
    </div>
  );
}
function Analytics({ events }: { events: { event_type: string; created_at: string }[] }) {
  const types = ['view', 'call', 'whatsapp', 'website', 'direction', 'save', 'share'];
  return (
    <div className="page form-page">
      <div className="section-title">
        <div>
          <h2>Business analytics</h2>
          <p>Real marketplace interactions recorded for your listing.</p>
        </div>
      </div>
      <div className="stat-grid">
        {types.slice(0, 4).map((t) => (
          <Stat
            key={t}
            label={t[0].toUpperCase() + t.slice(1)}
            value={String(events.filter((e) => e.event_type === t).length)}
            note="All-time events"
          />
        ))}
      </div>
      <section className="panel analytics-panel">
        <h3>Engagement breakdown</h3>
        <div className="contact-bars">
          {types.map((t) => (
            <div className="bar-row" key={t}>
              <div>
                <b>{t}</b>
                <span>{events.filter((e) => e.event_type === t).length}</span>
              </div>
              <i>
                <em
                  style={{
                    width: `${Math.min(100, events.filter((e) => e.event_type === t).length * 10)}%`,
                  }}
                />
              </i>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
function Plans({
  providerId,
  current,
  notify,
}: {
  providerId: string;
  current: string;
  notify: (m: string) => void;
}) {
  const [busy, setBusy] = useState('');
  const plans = [
    {
      code: 'free',
      name: 'Free',
      price: '£0',
      features: ['Public business profile', 'One category', 'Search visibility'],
    },
    {
      code: 'community',
      name: 'Community',
      price: '£10/mo',
      features: ['3 image offers monthly', 'Community feed visibility', 'Verification eligibility'],
    },
    {
      code: 'top10',
      name: 'Top 10',
      price: '£25/mo',
      features: ['Everything in Community', 'Promoted Top 10 placement', 'Higher visibility'],
    },
    {
      code: 'top5',
      name: 'Top 5',
      price: '£50/mo',
      features: ['Everything in Top 10', 'Promoted Top 5 placement', 'Maximum exposure'],
    },
  ];
  async function request(code: string) {
    if (!paymentsEnabled) {
      return notify(
        `Paid plans are not available during the initial launch. Contact ${brand.billingEmail} for help.`,
      );
    }
    if (code === 'free')
      return notify('Contact support to cancel or downgrade your paid subscription.');
    setBusy(code);
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        providerId,
        planCode: code,
        successUrl: `${window.location.origin}?checkout=success`,
        cancelUrl: `${window.location.origin}?checkout=cancelled`,
      },
    });
    setBusy('');
    if (error) return notify(error.message);
    if (!data?.url) return notify('Checkout could not be created');
    window.location.assign(data.url);
  }
  return (
    <div className="page form-page">
      <div className="plans-intro">
        <span className="eyebrow">GROW WITH {brand.name.toUpperCase()}</span>
        <h2>Transparent visibility plans.</h2>
        <p>
          {paymentsEnabled
            ? 'Promoted results are clearly labelled. Plans activate only after payment is confirmed.'
            : 'Paid plans are coming later. Your current plan remains active during the initial launch.'}
        </p>
      </div>
      <div className="plans">
        {plans.map((p, i) => (
          <article className={i === 2 ? 'plan featured' : 'plan'} key={p.code}>
            <h3>{p.name}</h3>
            <strong>{p.price}</strong>
            <ul>
              {p.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <button
              disabled={!paymentsEnabled || current === p.code || Boolean(busy)}
              onClick={() => request(p.code)}
            >
              {!paymentsEnabled && current !== p.code
                ? 'Coming later'
                : current === p.code
                  ? 'Current plan'
                  : busy === p.code
                    ? 'Opening checkout…'
                    : 'Choose plan'}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
