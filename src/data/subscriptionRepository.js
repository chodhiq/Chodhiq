// @ts-check
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { features } from '../config/features';

/**
 * @param {string} providerId
 * @param {'community' | 'top10' | 'top5'} planCode
 * @returns {Promise<{status: 'success' | 'cancelled' | 'unknown'}>}
 */
export async function openSubscriptionCheckout(providerId, planCode) {
  if (!features.payments) throw new Error('Payments are not available during the initial launch.');
  if (!supabase) throw new Error('Connect to ChodhiQ before starting checkout.');
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      providerId,
      planCode,
      successUrl: 'chodhiq://subscription?status=success',
      cancelUrl: 'chodhiq://subscription?status=cancelled',
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error || 'Stripe checkout could not be created.');
  const result = await WebBrowser.openAuthSessionAsync(data.url, 'chodhiq://subscription');
  if (result.type !== 'success')
    return {
      status: result.type === 'cancel' || result.type === 'dismiss' ? 'cancelled' : 'unknown',
    };
  const status = new URL(result.url).searchParams.get('status');
  return { status: status === 'success' ? 'success' : 'cancelled' };
}
