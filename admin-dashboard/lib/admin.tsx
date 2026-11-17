'use client';

import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { initializeSupabase, isSupabaseConfigured, supabase } from './supabase';
import { withAuthTimeout } from './auth-operations';
import type { AdminLevel } from './permissions';
import { can } from './permissions';
import {
  cleanSearchValue,
  PAGE_SIZE,
  pageRange,
  safeErrorDiagnostic,
  type MutationResult,
} from './operations';

export { PAGE_SIZE };
export const range = pageRange;
export type ToastType = 'success' | 'error';
type Toast = { message: string; type: ToastType } | null;
export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  requiredText?: string;
  resolve: (value: boolean) => void;
} | null;

type ActionErrorDetails = { code?: unknown; message?: unknown; details?: unknown };

function reportActionFailure(
  notify: (message: string, type: ToastType) => void,
  failureCode: string,
  correlationId: string,
  error?: unknown,
) {
  const details = error && typeof error === 'object' ? (error as ActionErrorDetails) : undefined;
  const databaseCode =
    typeof details?.code === 'string' && /^[a-z0-9_-]{1,32}$/i.test(details.code)
      ? details.code
      : undefined;

  console.error('[admin-action-failed]', {
    code: databaseCode ?? failureCode,
    message: typeof details?.message === 'string' ? details.message : safeErrorDiagnostic(error),
    details: details?.details ?? null,
    correlationId,
  });
  notify(
    `Action failed (${failureCode}${databaseCode ? ` / ${databaseCode}` : ''}). Reference: ${correlationId}`,
    'error',
  );
}

type AdminContextValue = {
  session: Session | null;
  loading: boolean;
  sessionError: string;
  toast: Toast;
  confirmation: ConfirmRequest;
  notify: (message: string, type?: ToastType) => void;
  confirmAction: (request: Omit<NonNullable<ConfirmRequest>, 'resolve'>) => Promise<boolean>;
  settleConfirmation: (value: boolean) => void;
  act: <T = unknown>(
    action: string,
    entity: string,
    id: string,
    work: () => PromiseLike<{ error: unknown; data?: T }>,
    details?: Record<string, unknown>,
  ) => Promise<MutationResult<T | undefined>>;
  pending: ReadonlySet<string>;
  isAdmin: boolean;
  adminLevel: AdminLevel;
  can: (permission: import('./permissions').Permission) => boolean;
  configurationReady: boolean;
  configured: boolean;
};

type AdminAuthContextValue = Pick<
  AdminContextValue,
  'session' | 'loading' | 'sessionError' | 'isAdmin' | 'adminLevel' | 'can' | 'configurationReady' | 'configured'
>;
type AdminActionsContextValue = Omit<AdminContextValue, keyof AdminAuthContextValue>;

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
const AdminActionsContext = createContext<AdminActionsContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configurationReady, setConfigurationReady] = useState(isSupabaseConfigured);
  const [configured, setConfigured] = useState(isSupabaseConfigured);
  const [toast, setToast] = useState<Toast>(null);
  const [sessionError, setSessionError] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmRequest>(null);
  const pendingKeys = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    let active = true;
    void initializeSupabase().then((ready) => {
      if (!active) return;
      setConfigured(ready);
      setConfigurationReady(true);
      if (!ready) setLoading(false);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!configurationReady || !configured) return;

    let active = true;
    let receivedAuthEvent = false;
    void withAuthTimeout(supabase.auth.getSession())
      .then(({ data, error }) => {
        if (!active || receivedAuthEvent) return;
        if (error) throw error;
        setSession(data.session);
        setSessionError('');
      })
      .catch(() => {
        if (!active || receivedAuthEvent) return;
        setSessionError(
          'Your session could not be validated. Check your connection and reload to retry.',
        );
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      receivedAuthEvent = true;
      setSession(next);
      setSessionError('');
      setLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [configurationReady, configured]);
  const notify = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  const confirmAction = useCallback(
    (request: Omit<NonNullable<ConfirmRequest>, 'resolve'>) =>
      new Promise<boolean>((resolve) => setConfirmation({ ...request, resolve })),
    [],
  );
  const settleConfirmation = useCallback((value: boolean) => {
    setConfirmation((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);
  const act = useCallback(
    async <T,>(
      action: string,
      entity: string,
      id: string,
      work: () => PromiseLike<{ error: unknown; data?: T }>,
      details: Record<string, unknown> = {},
    ): Promise<MutationResult<T | undefined>> => {
      const key = `${action}:${entity}:${id}`;
      const correlationId = crypto.randomUUID();
      if (pendingKeys.current.has(key)) {
        reportActionFailure(notify, 'duplicate', correlationId);
        return {
          ok: false,
          code: 'duplicate',
          userMessage: 'This action is already processing.',
          correlationId,
        };
      }
      pendingKeys.current.add(key);
      setPending(new Set(pendingKeys.current));
      try {
        const current = await supabase.auth.getSession();
        const currentSession = current.data.session;
        if (current.error || !currentSession) {
          reportActionFailure(notify, 'session_expired', correlationId, current.error);
          return {
            ok: false,
            code: 'session_expired',
            userMessage: 'Your session expired. Sign in and retry.',
            diagnostic: safeErrorDiagnostic(current.error),
            correlationId,
          };
        }
        if (currentSession.user.app_metadata?.role !== 'admin') {
          reportActionFailure(notify, 'unauthorized', correlationId);
          return {
            ok: false,
            code: 'unauthorized',
            userMessage: 'Administrator access is required.',
            correlationId,
          };
        }
        const result = await work();
        if (result.error) {
          reportActionFailure(notify, 'mutation_failed', correlationId, result.error);
          return {
            ok: false,
            code: 'mutation_failed',
            userMessage: 'The action could not be completed. Refresh and retry.',
            diagnostic: safeErrorDiagnostic(result.error),
            correlationId,
          };
        }
        if (details.server_audited === true) {
          notify('Action completed and audited', 'success');
          return { ok: true, data: result.data, correlationId };
        }
        const audit = await supabase.from('admin_audit_log').insert({
          admin_id: currentSession.user.id,
          action,
          entity_type: entity,
          entity_id: id,
          details: {
            source: 'admin_dashboard',
            correlation_id: correlationId,
            outcome: 'succeeded',
            ...details,
          },
        });
        if (audit.error) {
          reportActionFailure(notify, 'audit_failed', correlationId, audit.error);
          return {
            ok: false,
            code: 'audit_failed',
            userMessage:
              'The change succeeded, but its audit record failed. Stop and contact support before retrying.',
            diagnostic: safeErrorDiagnostic(audit.error),
            correlationId,
          };
        }
        notify('Action completed and audited', 'success');
        return { ok: true, data: result.data, correlationId };
      } catch (error) {
        reportActionFailure(notify, 'mutation_failed', correlationId, error);
        return {
          ok: false,
          code: 'mutation_failed',
          userMessage: 'The action could not be completed. Refresh and retry.',
          diagnostic: safeErrorDiagnostic(error),
          correlationId,
        };
      } finally {
        pendingKeys.current.delete(key);
        setPending(new Set(pendingKeys.current));
      }
    },
    [notify],
  );
  const authValue = useMemo<AdminAuthContextValue>(
    () => ({
      session,
      loading,
      sessionError,
      isAdmin: session?.user.app_metadata?.role === 'admin',
      adminLevel: ((session?.user.app_metadata?.admin_level as AdminLevel | undefined) ?? 'super_admin'),
      can: (permission) => can((session?.user.app_metadata?.admin_level as AdminLevel | undefined) ?? 'super_admin', permission),
      configurationReady,
      configured,
    }),
    [session, loading, sessionError, configurationReady, configured],
  );
  const actionsValue = useMemo<AdminActionsContextValue>(
    () => ({
      toast,
      confirmation,
      notify,
      confirmAction,
      settleConfirmation,
      act,
      pending,
    }),
    [toast, confirmation, notify, confirmAction, settleConfirmation, act, pending],
  );
  return (
    <AdminAuthContext.Provider value={authValue}>
      <AdminActionsContext.Provider value={actionsValue}>{children}</AdminActionsContext.Provider>
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) throw new Error('useAdminAuth must be used inside AdminProvider');
  return value;
}

export function useAdminActions() {
  const value = useContext(AdminActionsContext);
  if (!value) throw new Error('useAdminActions must be used inside AdminProvider');
  return value;
}

export function useAdmin(): AdminContextValue {
  const auth = useAdminAuth();
  const actions = useAdminActions();
  return useMemo(() => ({ ...auth, ...actions }), [auth, actions]);
}

export const cleanSearch = cleanSearchValue;
