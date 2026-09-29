'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import Link from './admin-link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { useAdmin, useAdminActions, useAdminAuth } from '../../lib/admin';
import { signInErrorMessage, withAuthTimeout } from '../../lib/auth-operations';
import { brand } from '../../lib/brand';

const monetisationEnabled =
  process.env.NEXT_PUBLIC_ENABLE_MONETISATION?.trim().toLowerCase() === 'true';

const navGroups = [
  {
    label: 'Operations',
    items: [
      ['/', 'Dashboard'],
      ['/providers', 'Providers'],
      ['/demand', 'Bookings'],
      ['/users', 'Customers'],
      [monetisationEnabled ? '/payments' : '/analytics', 'Payouts'],
      ['/categories', 'Services'],
      ['/analytics', 'Reports'],
      ['/admins', 'Settings'],
    ],
  },
] as const;

function NavIcon({ index }: { index: number }) {
  const paths = [
    'M4 11l8-7 8 7v9h-5v-6H9v6H4z',
    'M4 5h16v14H4z M8 9h8 M8 13h5',
    'M4 12h16 M12 4v16',
    'M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5',
  ];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[index % paths.length]} />
    </svg>
  );
}

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    Array<{ id: string; label: string; detail: string; href: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(-1);
  const requestId = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError('');
      return;
    }
    const activeRequest = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      const value = query.trim().replace(/[,%_()]/g, ' ');
      const [providers, users, posts] = await Promise.all([
        supabase
          .from('providers')
          .select('id,business_name,base_city')
          .ilike('business_name', `%${value}%`)
          .range(0, 4),
        supabase
          .from('profiles')
          .select('id,full_name,city')
          .ilike('full_name', `%${value}%`)
          .range(0, 4),
        supabase
          .from('community_posts')
          .select('id,body,status')
          .ilike('body', `%${value}%`)
          .range(0, 4),
      ]);
      if (activeRequest !== requestId.current) return;
      const error = providers.error || users.error || posts.error;
      if (error) {
        setError('Search is temporarily unavailable.');
        setResults([]);
        setLoading(false);
        return;
      }
      setResults([
        ...(providers.data || []).map((row) => ({
          id: `p-${row.id}`,
          label: row.business_name,
          detail: `Provider · ${row.base_city || 'No city'}`,
          href: `/providers/${row.id}`,
        })),
        ...(users.data || []).map((row) => ({
          id: `u-${row.id}`,
          label: row.full_name || row.id,
          detail: `User · ${row.city || 'No city'}`,
          href: `/users?user=${row.id}`,
        })),
        ...(posts.data || []).map((row) => ({
          id: `c-${row.id}`,
          label: row.body.slice(0, 70),
          detail: `Community post · ${row.status}`,
          href: `/community#post-${row.id}`,
        })),
      ]);
      setActive(-1);
      setLoading(false);
    }, 250);
    return () => {
      clearTimeout(timer);
      requestId.current += 1;
    };
  }, [query]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setResults([]);
        setActive(-1);
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  function close() {
    setQuery('');
    setResults([]);
    setActive(-1);
    setError('');
  }
  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setActive((value) => (value + 1) % results.length);
    }
    if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActive((value) => (value <= 0 ? results.length - 1 : value - 1));
    }
    if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      document.getElementById(`global-result-${active}`)?.click();
    }
  }
  const open = query.trim().length >= 2;
  return (
    <div className="global-search" ref={root}>
      <label htmlFor="global-admin-search">Search providers, users and posts</label>
      <span aria-hidden="true">⌕</span>
      <input
        id="global-admin-search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="global-search-results"
        aria-activedescendant={active >= 0 ? `global-result-${active}` : undefined}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={keys}
        placeholder="Search operations…"
        autoComplete="off"
      />
      {query && (
        <button className="search-clear" aria-label="Clear global search" onClick={close}>
          ×
        </button>
      )}
      {open && (
        <div
          className="search-results"
          id="global-search-results"
          role="listbox"
          aria-label="Global search results"
        >
          {loading ? (
            <p role="status">Searching…</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : results.length ? (
            results.map((result, index) => (
              <Link
                id={`global-result-${index}`}
                role="option"
                aria-selected={active === index}
                className={active === index ? 'active' : ''}
                key={result.id}
                href={result.href}
                onClick={close}
              >
                <b>{result.label}</b>
                <small>{result.detail}</small>
              </Link>
            ))
          ) : (
            <p role="status">No matching providers, users, or posts.</p>
          )}
        </div>
      )}
    </div>
  );
}

function ConfirmationModal() {
  const admin = useAdminActions();
  const [text, setText] = useState('');
  const dialog = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!admin.confirmation) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(
      () => dialog.current?.querySelector<HTMLElement>('button, input')?.focus(),
      0,
    );
    const keydown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        admin.settleConfirmation(false);
        return;
      }
      if (event.key !== 'Tab' || !dialog.current) return;
      const focusable = [
        ...dialog.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href]',
        ),
      ];
      if (!focusable.length) return;
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', keydown);
      previousFocus.current?.focus();
      setText('');
    };
  }, [admin, admin.confirmation, admin.settleConfirmation]);
  const request = admin.confirmation;
  if (!request) return null;
  const enabled = !request.requiredText || text === request.requiredText;
  return (
    <div className="modal-backdrop" role="presentation" aria-hidden="false">
      <section
        ref={dialog}
        className="confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        <h2 id="confirm-title">{request.title}</h2>
        <p id="confirm-description">{request.message}</p>
        {request.requiredText && (
          <label htmlFor="confirmation-text">
            Type <strong>{request.requiredText}</strong> to continue
            <input
              id="confirmation-text"
              value={text}
              autoComplete="off"
              onChange={(event) => setText(event.target.value)}
            />
          </label>
        )}
        <footer>
          <button onClick={() => admin.settleConfirmation(false)}>Cancel</button>
          <button
            className="danger"
            disabled={!enabled}
            onClick={() => admin.settleConfirmation(true)}
          >
            {request.confirmLabel || 'Confirm'}
          </button>
        </footer>
      </section>
    </div>
  );
}

export function AdminGate({ children }: { children: ReactNode }) {
  const admin = useAdminAuth();
  const [recovering, setRecovering] = useState(
    () => typeof window !== 'undefined' && window.location.hash.includes('type=recovery'),
  );
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  if (!isSupabaseConfigured)
    return (
      <main className="auth-page">
        <section className="auth-card">
          <small>SETUP REQUIRED</small>
          <h2>Connect Supabase</h2>
          <p>
            Add the public Supabase URL and anonymous key to the dashboard environment, then restart
            it.
          </p>
        </section>
      </main>
    );
  if (admin.loading)
    return (
      <main className="loading">
        <span>S</span>
        <p>Validating secure session…</p>
      </main>
    );
  if (admin.sessionError)
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h2>Session validation failed</h2>
          <p role="alert">{admin.sessionError}</p>
          <button className="primary" onClick={() => window.location.reload()}>
            Retry session validation
          </button>
        </section>
      </main>
    );
  if (recovering) return <ResetPassword onComplete={() => setRecovering(false)} />;
  if (!admin.session) return <Login />;
  if (!admin.isAdmin)
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h2>Administrator role required</h2>
          <p>This account has no server-issued administrator role.</p>
          <button className="primary" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </section>
      </main>
    );
  return children;
}

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const admin = useAdmin();
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [today] = useState(() =>
    new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/London',
    }).format(new Date()),
  );
  if (!admin.session) return null;
  let iconIndex = 0;
  return (
    <main className={`shell ${mobileOpen ? 'nav-open' : ''}`}>
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span>
            <Image src={brand.logoPath} alt="" width={42} height={42} />
          </span>
          <div>
            <strong>{brand.name}</strong>
            <small>ADMIN</small>
          </div>
          <button
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            ×
          </button>
        </div>
        <div className="sidebar-scroll">
          <nav aria-label="Admin sections">
            {navGroups.map((group) => (
              <section className="nav-group" key={group.label}>
                <h2>{group.label}</h2>
                {group.items.map(([href, label]) => {
                  const current = iconIndex++;
                  return (
                    <Link
                      onClick={() => setMobileOpen(false)}
                      aria-label={label}
                      key={href}
                      href={href}
                      aria-current={path === href ? 'page' : undefined}
                      className={
                        path === href || (href !== '/' && path.startsWith(href)) ? 'active' : ''
                      }
                    >
                      <i>
                        <NavIcon index={current} />
                      </i>
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </section>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="secure">
            <b>PROTECTED SESSION</b>
            <p>Every privileged action is recorded.</p>
          </div>
          <button className="account" onClick={() => supabase.auth.signOut()}>
            <span>{(admin.session.user.email || 'AD').slice(0, 2).toUpperCase()}</span>
            <div>
              <b>{admin.session.user.email}</b>
              <small>Sign out securely</small>
            </div>
            <i aria-hidden="true">↗</i>
          </button>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <section className="workspace">
        <header className="topbar">
          <button
            className="menu-toggle"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="page-identity">
            <p>{today || `${brand.name} administration`}</p>
            <h1>{title}</h1>
          </div>
          <GlobalSearch />
          <div className="admin-badge">
            <span>AD</span>
            <div>
              <b>Administrator</b>
              <small>Secure workspace</small>
            </div>
          </div>
        </header>
        {children}
      </section>
      {admin.toast && (
        <div
          className={`toast ${admin.toast.type}`}
          role={admin.toast.type === 'error' ? 'alert' : 'status'}
        >
          <b>{admin.toast.type === 'error' ? '!' : '✓'}</b>
          {admin.toast.message}
        </div>
      )}
      <ConfirmationModal />
    </main>
  );
}

function Login() {
  const emailInput = useRef<HTMLInputElement>(null);
  const [emailError, setEmailError] = useState('');
  function checkEmail() {
    const input = emailInput.current;
    if (!input) return false;
    const valid = input.validity.valid;
    setEmailError(
      valid
        ? ''
        : input.validity.valueMissing
          ? 'Enter your email address.'
          : 'Enter a valid email address, such as name@example.com.',
    );
    return valid;
  }
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT_LABEL?.trim();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting || !checkEmail()) return;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const result = await withAuthTimeout(
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
      );
      if (result.error) setError(signInErrorMessage(result.error));
      else if (!result.data.session)
        setError('Sign-in did not create a session. Please try again.');
    } catch (error) {
      setError(signInErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }
  async function forgotPassword() {
    if (submitting || !checkEmail()) return;
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setSubmitting(true);
    const result = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    if (result.error) setError('Password reset is temporarily unavailable. Please try again.');
    else setNotice('If an account exists for that email, a password reset link has been sent.');
    setSubmitting(false);
  }
  return (
    <main className="auth-page admin-login-page">
      <section className="admin-login-brand" aria-label="ChodhiQ administration">
        <Image
          className="admin-login-art"
          src="/admin-login-side.png"
          alt="ChodhiQ administration: control the platform and protect the community"
          fill
          priority
          sizes="(max-width: 820px) 100vw, 52vw"
        />
      </section>
      <section className="auth-card admin-login-card">
        <small>ADMIN DASHBOARD{environment ? ` · ${environment}` : ''}</small>
        <h2>Authorized access</h2>
        <p>Sign in with your {brand.name} administrator account.</p>
        <form onSubmit={submit}>
          <label htmlFor="admin-email">
            Admin email
            <input
              id="admin-email"
              ref={emailInput}
              maxLength={254}
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(emailError)}
              aria-describedby="login-email-error"
              onBlur={checkEmail}
              type="email"
              required
              autoComplete="username"
              placeholder="admin@chodhiq.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
                setNotice('');
                checkEmail();
              }}
            />
          </label>
          <p id="login-email-error" className="form-error" aria-live="polite">
            {emailError}
          </p>
          <label htmlFor="admin-password">
            Password
            <span className="password-field">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="form-notice" role="status">
              {notice}
            </p>
          )}
          <button className="primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in securely →'}
          </button>
          <button
            type="button"
            className="text-button"
            disabled={submitting}
            onClick={forgotPassword}
          >
            Forgot password?
          </button>
        </form>
        <p className="admin-login-trust">◆ Protected administrative session</p>
        <p className="admin-login-restriction">
          Access is restricted to authorized {brand.name} personnel.
        </p>
        <p className="admin-login-support">
          Need assistance? <a href={`mailto:${brand.supportEmail}`}>Contact technical support</a>
        </p>
      </section>
    </main>
  );
}

function ResetPassword({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    let active = true;
    async function prepareRecoverySession() {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      if (accessToken && refreshToken) {
        const established = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!active) return;
        if (established.error || !established.data.session) {
          setError('This reset link is invalid or has expired. Request a new reset link.');
          return;
        }
        window.history.replaceState({}, '', window.location.pathname);
        setReady(true);
        return;
      }

      const current = await supabase.auth.getSession();
      if (!active) return;
      if (current.error || !current.data.session) {
        setError('This reset link is invalid or has expired. Request a new reset link.');
        return;
      }
      setReady(true);
    }
    void prepareRecoverySession().catch(() => {
      if (active) setError('The recovery session could not be verified. Request a new reset link.');
    });
    return () => {
      active = false;
    };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!ready) return setError('Wait while the secure recovery session is verified.');
    if (password.length < 10) return setError('Use at least 10 characters.');
    if (password !== confirmation) return setError('The passwords do not match.');
    setSubmitting(true);
    const session = await supabase.auth.getSession();
    if (session.error || !session.data.session) {
      setSubmitting(false);
      return setError('This reset link is invalid or has expired. Request a new reset link.');
    }
    const result = await withAuthTimeout(supabase.auth.updateUser({ password }));
    setSubmitting(false);
    if (result.error) {
      const code = String(result.error.code || '');
      if (code.includes('same_password'))
        return setError('Choose a password you have not used before.');
      if (code.includes('weak_password'))
        return setError('Choose a stronger password with at least 10 characters.');
      if (code.includes('session') || code.includes('token'))
        return setError('This reset link is invalid or has expired. Request a new reset link.');
      return setError('The password could not be updated. Please try again.');
    }
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
          <label htmlFor="admin-new-password">
            New password
            <span className="password-field">
              <input
                id="admin-new-password"
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
          <label htmlFor="admin-confirm-password">
            Confirm new password
            <input
              id="admin-confirm-password"
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
          <button className="primary" disabled={submitting || !ready}>
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>
    </main>
  );
}
