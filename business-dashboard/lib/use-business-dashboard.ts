'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabase';
import {
  providerColumns,
  type Lead,
  type Notification,
  type Provider,
  type Review,
  type Service,
} from './business-dashboard-domain';

export function useBusinessDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [recovering, setRecovering] = useState(
    () => typeof window !== 'undefined' && window.location.hash.includes('type=recovery'),
  );
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<{ event_type: string; created_at: string }[]>([]);
  const [plan, setPlan] = useState('free');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState('');

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const uid = session.user.id;
      const { data: nextProvider, error } = await supabase
        .from('providers')
        .select(providerColumns)
        .eq('owner_id', uid)
        .limit(1)
        .maybeSingle();
      if (error) notify(error.message);
      setProvider(nextProvider);

      const notificationResult = await supabase
        .from('notifications')
        .select('id,title,body,read_at,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(30);
      if (notificationResult.error) notify(notificationResult.error.message);
      else setNotifications(notificationResult.data || []);

      if (!nextProvider) return;
      const [serviceResult, reviewResult, analyticsResult, entitlementResult, leadResult] =
        await Promise.all([
          supabase
            .from('services')
            .select('*')
            .eq('provider_id', nextProvider.id)
            .order('created_at'),
          supabase
            .from('reviews')
            .select('id,rating,comment,created_at,review_replies(id,body)')
            .eq('provider_id', nextProvider.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('provider_analytics_events')
            .select('event_type,created_at')
            .eq('provider_id', nextProvider.id),
          supabase
            .from('provider_entitlements')
            .select('plan_code')
            .eq('provider_id', nextProvider.id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from('quote_requests')
            .select(
              'id,user_id,message,preferred_contact,status,response_message,responded_at,created_at',
            )
            .eq('provider_id', nextProvider.id)
            .order('created_at', { ascending: false }),
        ]);
      setServices(serviceResult.data || []);
      setReviews((reviewResult.data || []) as unknown as Review[]);
      setEvents(analyticsResult.data || []);
      setPlan(entitlementResult.data?.plan_code || 'free');
      setLeads((leadResult.data || []) as Lead[]);
    } finally {
      setLoading(false);
    }
  }, [session, notify]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(nextSession);
      setAuthLoading(false);
    });
    const params = new URLSearchParams(window.location.hash.slice(1));
    const signupToken =
      params.get('type') === 'signup' && params.get('access_token') && params.get('refresh_token');
    if (signupToken) {
      void supabase.auth
        .setSession({
          access_token: params.get('access_token')!,
          refresh_token: params.get('refresh_token')!,
        })
        .then(({ data: confirmed }) => {
          window.history.replaceState({}, '', window.location.pathname + window.location.search);
          setSession(confirmed.session);
          setAuthLoading(false);
        })
        .catch(() => {
          window.history.replaceState({}, '', window.location.pathname + window.location.search);
          setAuthLoading(false);
        });
    } else {
      void supabase.auth
        .getSession()
        .then(({ data: current }) => {
          setSession(current.session);
          setAuthLoading(false);
        })
        .catch(() => setAuthLoading(false));
    }
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) queueMicrotask(() => void loadDashboard());
  }, [session, loadDashboard]);

  return {
    session,
    authLoading,
    recovering,
    setRecovering,
    loading,
    provider,
    setProvider,
    services,
    reviews,
    leads,
    events,
    plan,
    notifications,
    setNotifications,
    toast,
    notify,
    loadDashboard,
  };
}
