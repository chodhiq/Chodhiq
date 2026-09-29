import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

const required = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'E2E_SUPABASE_SERVICE_ROLE_KEY',
  'E2E_CUSTOMER_EMAIL',
  'E2E_CUSTOMER_PASSWORD',
  'E2E_OWNER_EMAIL',
  'E2E_OWNER_PASSWORD',
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_PROVIDER_ID',
];
const missing = required.filter((key) => !process.env[key]);
if (process.env.EXPO_PUBLIC_SUPABASE_URL) {
  assert.equal(
    new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).hostname,
    'ljhncdzhzoatonhhofbv.supabase.co',
    'This mutation test is restricted to ChodhiQ Staging',
  );
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const client = () =>
  createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    options,
  );
async function login(email, password) {
  const db = client();
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  assert.ok(data.user);
  return db;
}

test(
  'authenticated customer-owner-admin marketplace journey',
  {
    skip: missing.length ? `Missing staging variables: ${missing.join(', ')}` : false,
    timeout: 60_000,
  },
  async () => {
    const customer = await login(process.env.E2E_CUSTOMER_EMAIL, process.env.E2E_CUSTOMER_PASSWORD);
    const owner = await login(process.env.E2E_OWNER_EMAIL, process.env.E2E_OWNER_PASSWORD);
    const admin = await login(process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD);
    const cleanup = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.E2E_SUPABASE_SERVICE_ROLE_KEY,
      options,
    );
    const providerId = process.env.E2E_PROVIDER_ID;
    let reviewId, quoteId, bookingId;
    try {
      const ownerProvider = await owner
        .from('providers')
        .select('id')
        .eq('id', providerId)
        .single();
      assert.ifError(ownerProvider.error);
      const review = await customer
        .from('reviews')
        .insert({ provider_id: providerId, rating: 5, comment: `Staging E2E review ${Date.now()}` })
        .select('id')
        .single();
      assert.ifError(review.error);
      reviewId = review.data.id;
      const quote = await customer
        .from('quote_requests')
        .insert({
          provider_id: providerId,
          message: 'Staging E2E quote request',
          preferred_contact: 'email',
        })
        .select('id')
        .single();
      assert.ifError(quote.error);
      quoteId = quote.data.id;
      const ownerReply = await owner
        .from('quote_requests')
        .update({
          status: 'responded',
          response_message: 'Staging E2E quote response',
          responded_at: new Date().toISOString(),
        })
        .eq('id', quoteId)
        .select('response_message')
        .single();
      assert.ifError(ownerReply.error);
      assert.equal(ownerReply.data.response_message, 'Staging E2E quote response');
      const customerQuote = await customer
        .from('quote_requests')
        .select('status,response_message')
        .eq('id', quoteId)
        .single();
      assert.ifError(customerQuote.error);
      assert.equal(customerQuote.data.status, 'responded');
      const future = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const booking = await customer
        .from('bookings')
        .insert({
          provider_id: providerId,
          requested_date: future,
          requested_time: '10:00',
          notes: 'Staging E2E booking',
        })
        .select('id')
        .single();
      assert.ifError(booking.error);
      bookingId = booking.data.id;
      const confirmation = await owner
        .from('bookings')
        .update({
          status: 'confirmed',
          provider_message: 'Confirmed by staging E2E',
          responded_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .select('status')
        .single();
      assert.ifError(confirmation.error);
      assert.equal(confirmation.data.status, 'confirmed');
      const adminReview = await admin.from('reviews').select('id').eq('id', reviewId).single();
      assert.ifError(adminReview.error);
    } finally {
      if (bookingId) await cleanup.from('bookings').delete().eq('id', bookingId);
      if (quoteId) await customer.from('quote_requests').delete().eq('id', quoteId);
      if (reviewId) await admin.from('reviews').delete().eq('id', reviewId);
    }
  },
);
