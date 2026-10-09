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
import { isSupabaseConfigured, supabase } from './supabase';
import { withAuthTimeout } from './auth-operations';
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
};

type AdminAuthContextValue = Pick<
  AdminContextValue,
  'session' | 'loading' | 'sessionError' | 'isAdmin'
>;
type AdminActionsContextValue = Omit<AdminContextValue, keyof AdminAuthContextValue>;

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
const AdminActionsContext = createContext<AdminActionsContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => (!isSupabaseConfigured ? false : true));
  const [toast, setToast] = useState<Toast>(null);
  const [sessionError, setSessionError] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmRequest>(null);
  const pendingKeys = useRef(new Set<string>());
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (!isSupabaseConfigured) return;

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
  }, []);
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
      if (pendingKeys.current.has(key))
        return {
          ok: false,
          code: 'duplicate',
          userMessage: 'This action is already processing.',
          correlationId,
        };
      pendingKeys.current.add(key);
      setPending(new Set(pendingKeys.current));
      try {
        const current = await supabase.auth.getSession();
        const currentSession = current.data.session;
        if (current.error || !currentSession) {
          notify('Your session expired. Sign in and retry.', 'error');
          return {
            ok: false,
            code: 'session_expired',
            userMessage: 'Your session expired. Sign in and retry.',
            diagnostic: safeErrorDiagnostic(current.error),
            correlationId,
          };
        }
        if (currentSession.user.app_metadata?.role !== 'admin') {
          notify('Administrator access is required.', 'error');
          return {
            ok: false,
            code: 'unauthorized',
            userMessage: 'Administrator access is required.',
            correlationId,
          };
        }
        const result = await work();
        if (result.error) {
          notify('The action could not be completed. Refresh and retry.', 'error');
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
          notify(
            'The change succeeded, but its audit record failed. Stop and contact support before retrying.',
            'error',
          );
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
        notify('The action could not be completed. Refresh and retry.', 'error');
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
    }),
    [session, loading, sessionError],
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
