import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.112.2';

const currentPeriodEndIso = (subscription: Stripe.Subscription) => {
  const periods = subscription.items.data.map((item) => item.current_period_end);
  if (!periods.length || periods.some((period) => !Number.isFinite(period) || period <= 0))
    throw new Error('Stripe subscription has no valid current period end');
  return new Date(Math.min(...periods) * 1000).toISOString();
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { error: claimError } = await db
    .from('stripe_webhook_events')
    .insert({ event_id: event.id, event_type: event.type });
  if (claimError) {
    if (claimError.code === '23505')
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    console.error('webhook_claim_failed', claimError);
    return new Response('Webhook processing failed', { status: 500 });
  }
  let processingError: unknown = null;
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const providerId = session.metadata?.provider_id,
        planCode = session.metadata?.plan_code,
        requestId = session.metadata?.request_id;
      if (providerId && planCode && requestId) {
        if (typeof session.subscription !== 'string')
          throw new Error('Checkout session is missing its subscription id');
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const expiresAt = currentPeriodEndIso(subscription);
        const tier = planCode === 'top5' ? 5 : planCode === 'top10' ? 10 : 0;
        const results = await Promise.all([
          db
            .from('provider_entitlements')
            .upsert({
              provider_id: providerId,
              plan_code: planCode,
              offers_active: true,
              search_tier: tier,
              stripe_customer_id: String(session.customer),
              stripe_subscription_id: session.subscription,
              expires_at: expiresAt,
              updated_at: new Date().toISOString(),
            }),
          db
            .from('subscription_requests')
            .update({ status: 'active' })
            .eq('id', requestId)
            .eq('provider_id', providerId),
          db
            .from('payment_records')
            .upsert(
              {
                provider_id: providerId,
                transaction_id: session.id,
                amount_pence: session.amount_total || 0,
                currency: session.currency || 'gbp',
                status: 'paid',
              },
              { onConflict: 'transaction_id' },
            ),
        ]);
        const failed = results.find((result) => result.error);
        if (failed?.error) throw failed.error;
      }
    }
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const { error } = await db
        .from('provider_entitlements')
        .update({
          plan_code: 'free',
          offers_active: false,
          search_tier: 0,
          expires_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
      if (error) throw error;
    }
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const active = subscription.status === 'active' || subscription.status === 'trialing';
      const planCode = subscription.metadata?.plan_code;
      const tier = active && planCode === 'top5' ? 5 : active && planCode === 'top10' ? 10 : 0;
      const expiresAt = active ? currentPeriodEndIso(subscription) : new Date().toISOString();
      const { error } = await db
        .from('provider_entitlements')
        .update({
          plan_code: active && planCode ? planCode : 'free',
          offers_active: active,
          search_tier: tier,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
      if (error) throw error;
    }
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const subscription = (invoice as unknown as { subscription?: string | { id?: string } })
        .subscription;
      const subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;
      if (subscriptionId) {
        const { error } = await db
          .from('provider_entitlements')
          .update({
            plan_code: 'free',
            offers_active: false,
            search_tier: 0,
            expires_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);
        if (error) throw error;
      }
    }
  } catch (error) {
    processingError = error;
  }
  if (processingError) {
    await db.from('stripe_webhook_events').delete().eq('event_id', event.id);
    console.error('webhook_processing_failed', processingError);
    return new Response('Webhook processing failed', { status: 500 });
  }
  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
