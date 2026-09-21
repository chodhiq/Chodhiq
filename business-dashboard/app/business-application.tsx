'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { applicationErrors, proofError, type ApplicationFields } from '../lib/application-validation';

type Application = ApplicationFields & { id: string; email: string; status: string; review_note: string | null; review_due_at: string; submitted_at: string; proof_name: string };
const empty: ApplicationFields = { business_name: '', category_id: '', city: '', postcode: '', phone: '' };
const enquiryEmail = process.env.NEXT_PUBLIC_BUSINESS_ENQUIRY_EMAIL?.trim();

export function CreateAccount({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const [emailError, setEmailError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !event.currentTarget.reportValidity()) return;
    if (password !== confirmation) { setError('Passwords must match.'); return; }
    setBusy(true); setError('');
    try {
      const result = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
      if (result.error) { setError('Account creation failed. Check your details or try signing in if you already have an account.'); return; }
      setPassword(''); setConfirmation('');
      setNotice('Check your inbox to confirm your email, then sign in here to submit your business details and proof. If you already have an account, sign in or reset your password.');
    } catch { setError('Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><section className="auth-card onboarding-card">
    <small>BUSINESS ACCOUNT</small><h2>Create your account</h2>
    <p>Confirm your email, submit your UK business details and proof, then wait for administrator approval.</p>
    {notice ? <p role="status">{notice}</p> : <form onSubmit={submit}>
      <label htmlFor="signup-email">Email address<input id="signup-email" type="email" required maxLength={254} autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} aria-invalid={!!emailError} aria-describedby="signup-email-error" onChange={event => { setEmail(event.target.value); setEmailError(event.target.validity.valid ? '' : 'Enter a valid email address.'); }} /></label>
      <p id="signup-email-error" className="form-error" aria-live="polite">{emailError}</p>
      <label htmlFor="signup-password">Password<input id="signup-password" type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={password} aria-describedby="signup-password-help" onChange={event => setPassword(event.target.value)} /></label>
      <p id="signup-password-help" className={password && password.length < 10 ? 'form-error' : ''} aria-live="polite">Use 10–128 characters.</p>
      <label htmlFor="signup-confirm">Confirm password<input id="signup-confirm" type="password" required autoComplete="new-password" value={confirmation} aria-invalid={!!confirmation && confirmation !== password} aria-describedby="signup-confirm-error" onChange={event => setConfirmation(event.target.value)} /></label>
      <p id="signup-confirm-error" className="form-error" aria-live="polite">{confirmation && confirmation !== password ? 'Passwords must match.' : ''}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
    </form>}
    <button className="text-button" onClick={onBack}>Back to sign in</button>
  </section></main>;
}

export function BusinessApplication({ session, onApproved }: { session: Session; onApproved: () => Promise<void> }) {
  const [now, setNow] = useState(() => Date.now());
  const [application, setApplication] = useState<Application | null>(null), [fields, setFields] = useState<ApplicationFields>(empty);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null), [touched, setTouched] = useState<Partial<Record<keyof ApplicationFields, boolean>>>({});
  const [applicationId] = useState(() => crypto.randomUUID());
  const errors = applicationErrors(fields);
  const load = useCallback(async () => {
    setNow(Date.now()); setLoading(true); setLoadError('');
    try {
      const [result, catalogue] = await Promise.all([
        supabase.from('business_applications').select('*').eq('applicant_id', session.user.id).maybeSingle(),
        supabase.from('categories').select('id,name').eq('is_active', true).order('sort_order'),
      ]);
      if (result.error || catalogue.error) throw new Error('load');
      setApplication(result.data as Application | null); setCategories(catalogue.data ?? []);
      if (result.data) setFields({ business_name: result.data.business_name, city: result.data.city, postcode: result.data.postcode, phone: result.data.phone, category_id: result.data.category_id });
    } catch { setLoadError('Your application could not be loaded. Please retry.'); }
    finally { setLoading(false); }
  }, [session.user.id]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  function change(key: keyof ApplicationFields, value: string) { setFields(current => ({ ...current, [key]: value })); setTouched(current => ({ ...current, [key]: true })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ business_name: true, city: true, postcode: true, phone: true, category_id: true });
    const invalid = Object.values(errors).find(Boolean) || proofError(file);
    if (invalid || !file) { setError(invalid); return; }
    if (busy) return;
    setBusy(true); setError('');
    try {
      const id = application?.id ?? applicationId;
      const extension = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
      const path = `${session.user.id}/${id}/${crypto.randomUUID()}.${extension}`;
      const uploaded = await supabase.storage.from('business-application-proofs').upload(path, file, { contentType: file.type, upsert: false });
      if (uploaded.error) throw new Error('upload');
      const result = await supabase.rpc('submit_business_application', { application_id: id, ...fields, proof_path: path, proof_name: file.name.slice(0, 180) });
      if (result.error) throw new Error('submit');
      setFile(null); await load();
    } catch { setError('The application could not be confirmed. Refresh its status before retrying. Your details remain here.'); }
    finally { setBusy(false); }
  }
  const waiting = application?.status === 'pending';
  const overdue = !!application && now > Date.parse(application.review_due_at);
  return <main className="auth-page"><section className="auth-card onboarding-card">
    <small>PROVIDER-ONLY ACCESS</small><h2>{waiting ? 'Your application is awaiting review' : application?.status === 'approved' ? 'Your business is approved' : 'Apply for a business workspace'}</h2>
    {loading ? <p role="status">Loading your application…</p> : loadError ? <><p role="alert">{loadError}</p><button onClick={() => void load()}>Retry</button></> : waiting ? <>
      <p><strong>{application.business_name}</strong> has been submitted. Please allow up to 3 days for our team to respond.</p>
      <p>Response due by <strong>{new Date(application.review_due_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })} UK time</strong>.</p>
      <p>Your business workspace stays locked until an administrator approves your application.</p>
      {overdue && <p role="status">The three-day response window has passed. Your application is still awaiting review.{enquiryEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(enquiryEmail) ? <> Please contact <a href={`mailto:${enquiryEmail}?subject=${encodeURIComponent(`Business application ${application.id}`)}`}>{enquiryEmail}</a> and include your application reference.</> : ' An enquiry email address will be added here when available.'}</p>}
      <p>Reference: {application.id}</p><button onClick={() => void load()}>Check review status</button>
    </> : application?.status === 'approved' ? <><p>Your application has been approved. You can now enter your business workspace.</p><button className="primary" onClick={() => void onApproved()}>Open business dashboard</button></> : <>
      {application && <p role="status"><strong>{application.status === 'changes_requested' ? 'Changes requested' : 'Application not approved'}:</strong> {application.review_note} Update the details and upload proof again to resubmit.</p>}
      <p>Submit your business details and evidence that it operates in the UK. Our team reviews applications within a target of 3 days.</p>
      <form onSubmit={submit}>
        {([['business_name', 'Business name', 'text', 120], ['city', 'UK town or city', 'text', 100], ['postcode', 'UK postcode', 'text', 10], ['phone', 'Business phone number', 'tel', 30]] as const).map(([key, label, type, max]) => <div key={key}><label htmlFor={`application-${key}`}>{label}<input id={`application-${key}`} type={type} required maxLength={max} value={fields[key]} disabled={busy} aria-invalid={!!touched[key] && !!errors[key]} aria-describedby={`error-${key}`} onChange={event => change(key, event.target.value)} onBlur={() => setTouched(current => ({ ...current, [key]: true }))} /></label><p id={`error-${key}`} className="form-error" aria-live="polite">{touched[key] && errors[key]}</p></div>)}
        <label htmlFor="application-category">Business category<select id="application-category" required disabled={busy} value={fields.category_id} onChange={event => change('category_id', event.target.value)}><option value="">Choose a category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label htmlFor="application-email">Account email<input id="application-email" type="email" value={session.user.email ?? ''} readOnly /></label>
        <p>We use your confirmed account email for this application.</p>
        <label htmlFor="application-proof">Proof of UK business<input id="application-proof" type="file" required disabled={busy} accept="application/pdf,image/jpeg,image/png" aria-describedby="application-proof-help" onChange={event => { const next = event.target.files?.[0] ?? null; setFile(next); setError(proofError(next)); }} /></label>
        <p id="application-proof-help">Upload a business licence, registration document or other evidence of UK trading. PDF, JPG or PNG, up to 10 MB. Only you and administrators can view it.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
        {error && <button type="button" onClick={() => void load()} disabled={busy}>Refresh application status</button>}
      </form>
    </>}
    <button className="text-button" disabled={busy} onClick={() => void supabase.auth.signOut()}>Sign out</button>
  </section></main>;
}
