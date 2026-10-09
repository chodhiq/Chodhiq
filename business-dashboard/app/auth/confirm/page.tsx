'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  confirmedAppUrl,
  confirmationErrorMessage,
  readConfirmationLink,
} from '../../../lib/email-confirmation';
import { withAuthTimeout } from '../../../lib/auth-operations';

export default function EmailConfirmationPage() {
  const tokenHash = useRef('');
  const initialized = useRef(false);
  const [state, setState] = useState<'loading' | 'ready' | 'busy' | 'success' | 'error' | 'retry'>(
    'loading',
  );
  const [message, setMessage] = useState('Preparing your email confirmation…');
  const [appUrl, setAppUrl] = useState('chodhiq://auth/callback');

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const link = readConfirmationLink(window.location.href);
    // Remove the single-use token/code before any further navigation. Never
    // write it or the returned browser session into dashboard storage.
    window.history.replaceState(null, '', window.location.pathname);
    if (link.kind === 'token') {
      tokenHash.current = link.tokenHash;
      // Initial state comes from the external email URL after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState('ready');
      setMessage('Confirm your email to finish creating your ChodhiQ account.');
    } else if (link.kind === 'confirmed') {
      setAppUrl(link.appUrl);
      setState('success');
      setMessage('Your email is confirmed. Open ChodhiQ to continue.');
    } else {
      setState('error');
      setMessage(
        'This confirmation link is incomplete, expired, or has already been used. Try signing in to ChodhiQ, or request a new confirmation email from the app.',
      );
    }
  }, []);

  const confirm = async () => {
    if (!tokenHash.current || state === 'busy') return;
    setState('busy');
    setMessage('Confirming your email…');
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error('Confirmation unavailable');
      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { error } = await withAuthTimeout(
        client.auth.verifyOtp({ token_hash: tokenHash.current, type: 'email' }),
      );
      if (error) throw error;
      tokenHash.current = '';
      setAppUrl(confirmedAppUrl);
      setState('success');
      setMessage('Your email is confirmed. Open ChodhiQ and sign in with your email and password.');
    } catch (error) {
      setState('retry');
      setMessage(confirmationErrorMessage(error));
    }
  };

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section
        aria-labelledby="confirmation-title"
        style={{
          width: '100%',
          maxWidth: 480,
          padding: 28,
          borderRadius: 20,
          background: 'var(--surface, #fff)',
          color: 'var(--text, #172033)',
          border: '1px solid var(--border, #e7dfd1)',
        }}
      >
        <p style={{ fontWeight: 800, fontSize: 24 }}>ChodhiQ</p>
        <h1
          id="confirmation-title"
          style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.3, margin: '12px 0' }}
        >
          {state === 'success' ? 'Email confirmed' : 'Confirm your email'}
        </h1>
        <p
          role={state === 'error' || state === 'retry' ? 'alert' : 'status'}
          style={{ lineHeight: 1.6 }}
        >
          {message}
        </p>
        {state === 'ready' || state === 'busy' || state === 'retry' ? (
          <button
            type="button"
            disabled={state === 'busy'}
            onClick={confirm}
            style={{
              marginTop: 16,
              padding: '14px 20px',
              borderRadius: 10,
              background: '#0b1026',
              color: '#fff',
            }}
          >
            {state === 'busy' ? 'Confirming…' : 'Confirm email'}
          </button>
        ) : null}
        {state !== 'loading' && state !== 'busy' ? (
          <>
            <p style={{ marginTop: 24 }}>
              <a
                href={appUrl}
                style={{
                  display: 'inline-block',
                  padding: '14px 20px',
                  borderRadius: 10,
                  background: '#0b1026',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                Open ChodhiQ
              </a>
            </p>
            <p style={{ marginTop: 12, lineHeight: 1.6 }}>
              If ChodhiQ is not installed on this device, return to the device where you created
              your account and sign in there.
            </p>
            <p style={{ lineHeight: 1.6 }}>
              If the app does not open, close this browser and open ChodhiQ from your home screen.{' '}
              {state === 'success'
                ? 'Your email is confirmed; sign in with your email and password.'
                : 'Try signing in, or request a new confirmation email.'}
            </p>
          </>
        ) : null}
        <noscript>
          Enable JavaScript to confirm your email, or open ChodhiQ and request a new confirmation
          email.
        </noscript>
      </section>
    </main>
  );
}
