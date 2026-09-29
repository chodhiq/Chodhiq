import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && anonKey && serviceKey, 'Staging URL, anon key and service-role key are required');
assert.equal(
  new URL(url).hostname,
  'ljhncdzhzoatonhhofbv.supabase.co',
  'This mutation harness is restricted to ChodhiQ Staging',
);

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, serviceKey, options);
const anonymous = createClient(url, anonKey, options);
const run = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const generatedCredential = `ChodhiQ-${crypto.randomUUID()}-Aa1!`;
const emails = {
  customer: `e2e-customer-${run}@example.com`,
  other: `e2e-other-${run}@example.com`,
  owner: `e2e-owner-${run}@example.com`,
  claimant: `e2e-claimant-${run}@example.com`,
  admin: `e2e-admin-${run}@example.com`,
  roleTarget: `e2e-role-${run}@example.com`,
};
const users = [];
const failures = [];
const storageObjects = [];
let applicationId;
let providerId;
let importedProviderId;
let communityPostId;

const check = (result, label) => {
  assert.ifError(result.error, label);
  return result.data;
};
const signIn = async (email) => {
  const client = createClient(url, anonKey, options);
  check(
    await client.auth.signInWithPassword({ email, password: generatedCredential }),
    `sign in ${email}`,
  );
  return client;
};
const createConfirmedUser = async (email, metadata = {}) => {
  const result = await service.auth.admin.createUser({
    email,
    password: generatedCredential,
    email_confirm: true,
    app_metadata: metadata,
    user_metadata: { full_name: `E2E ${email.split('@')[0]}` },
  });
  const user = check(result, `create ${email}`).user;
  users.push(user.id);
  return user;
};
const invoke = async (client, name, body) => {
  const result = await client.functions.invoke(name, { body });
  assert.ifError(result.error, `${name} invocation`);
  return result.data;
};
const expectNoRows = async (promise, label) => {
  const result = await promise;
  assert.ifError(result.error, label);
  assert.equal(result.data?.length ?? 0, 0, label);
};

try {
  // Registration, confirmation, login and profile.
  let registration = await anonymous.auth.signUp({
    email: emails.customer,
    password: generatedCredential,
    options: { data: { full_name: 'E2E Customer' } },
  });
  if (registration.error || !registration.data.user) {
    failures.push(
      `customer registration failed: ${registration.error?.message || 'no user returned'}`,
    );
    const fallback = await createConfirmedUser(emails.customer);
    registration = { data: { user: fallback }, error: null };
  } else {
    users.push(registration.data.user.id);
    check(
      await service.auth.admin.updateUserById(registration.data.user.id, { email_confirm: true }),
      'confirm registration',
    );
  }
  const otherUser = await createConfirmedUser(emails.other);
  const ownerUser = await createConfirmedUser(emails.owner);
  const claimantUser = await createConfirmedUser(emails.claimant);
  const adminUser = await createConfirmedUser(emails.admin, { role: 'admin' });
  const roleTarget = await createConfirmedUser(emails.roleTarget);

  const customer = await signIn(emails.customer);
  const other = await signIn(emails.other);
  const owner = await signIn(emails.owner);
  const claimant = await signIn(emails.claimant);
  const admin = await signIn(emails.admin);

  check(
    await customer
      .from('profiles')
      .update({ full_name: 'E2E Customer Updated' })
      .eq('id', registration.data.user.id),
    'profile update',
  );
  const ownProfile = check(
    await customer.from('profiles').select('full_name').single(),
    'own profile',
  );
  assert.equal(ownProfile.full_name, 'E2E Customer Updated');
  await expectNoRows(
    other.from('profiles').select('id').eq('id', registration.data.user.id),
    'cross-account profile denied',
  );
  const recovery = await anonymous.auth.resetPasswordForEmail(emails.customer);
  if (recovery.error) failures.push(`password recovery failed: ${recovery.error.message}`);

  const category = check(
    await anonymous.from('categories').select('id').eq('is_active', true).limit(1).single(),
    'active category',
  );

  // Provider application, private proof and audited admin approval.
  applicationId = crypto.randomUUID();
  const proofPath = `${ownerUser.id}/${applicationId}/proof.pdf`;
  check(
    await owner.storage
      .from('business-application-proofs')
      .upload(proofPath, new TextEncoder().encode('%PDF-1.4 E2E proof'), {
        contentType: 'application/pdf',
      }),
    'proof upload',
  );
  storageObjects.push(['business-application-proofs', proofPath]);
  const privateRead = await customer.storage
    .from('business-application-proofs')
    .download(proofPath);
  assert.ok(privateRead.error, 'another customer cannot read private proof');
  check(
    await admin.storage.from('business-application-proofs').download(proofPath),
    'admin reads private proof',
  );
  check(
    await owner.rpc('submit_business_application', {
      application_id: applicationId,
      business_name: `E2E Business ${run}`,
      category_id: category.id,
      city: 'Leicester',
      postcode: 'LE1 1AA',
      phone: '01161234567',
      proof_path: proofPath,
      proof_name: 'proof.pdf',
    }),
    'submit provider application',
  );
  providerId = check(
    await admin.rpc('review_business_application', {
      application_id: applicationId,
      expected_revision: 1,
      decision: 'approved',
      decision_note: 'Approved by automated staging verification',
    }),
    'approve provider application',
  );
  assert.ok(providerId);

  // Services, quotes, lead queue, owner reply, bookings, reviews and notifications.
  const serviceRow = check(
    await owner
      .from('services')
      .insert({ provider_id: providerId, name: 'E2E Service', starting_price: 25 })
      .select('id')
      .single(),
    'owner service create',
  );
  const quote = check(
    await customer
      .from('quote_requests')
      .insert({
        user_id: registration.data.user.id,
        provider_id: providerId,
        message: 'E2E quote request',
        preferred_contact: 'email',
      })
      .select('id,status')
      .single(),
    'customer quote',
  );
  await expectNoRows(
    other.from('quote_requests').select('id').eq('id', quote.id),
    'cross-account quote denied',
  );
  check(
    await owner.rpc('respond_to_quote', {
      target_quote: quote.id,
      expected_status: quote.status,
      response_text: 'E2E owner response',
    }),
    'owner quote reply',
  );
  const leadRows = check(
    await owner.from('provider_lead_deliveries').select('id').eq('quote_request_id', quote.id),
    'owner lead visibility',
  );
  assert.ok(leadRows.length >= 1, 'quote creates owner-visible lead delivery');
  const ownerNotifications = check(
    await owner.from('notifications').select('id').eq('user_id', ownerUser.id),
    'owner notifications',
  );
  assert.ok(ownerNotifications.length >= 1, 'owner receives quote notification');

  const booking = check(
    await customer
      .from('bookings')
      .insert({
        user_id: registration.data.user.id,
        provider_id: providerId,
        service_id: serviceRow.id,
        requested_date: '2026-10-20',
        requested_time: '10:00',
        notes: 'E2E booking',
      })
      .select('id')
      .single(),
    'booking create',
  );
  await expectNoRows(
    other.from('bookings').select('id').eq('id', booking.id),
    'cross-account booking denied',
  );
  check(
    await owner
      .from('bookings')
      .update({ status: 'confirmed', provider_message: 'Confirmed' })
      .eq('id', booking.id)
      .select('id')
      .single(),
    'owner confirms booking',
  );
  const review = check(
    await customer
      .from('reviews')
      .insert({
        user_id: registration.data.user.id,
        provider_id: providerId,
        rating: 5,
        comment: 'E2E review',
      })
      .select('id')
      .single(),
    'review create',
  );
  check(
    await owner.from('review_replies').insert({
      review_id: review.id,
      provider_id: providerId,
      author_id: ownerUser.id,
      body: 'Thank you',
    }),
    'owner review reply',
  );
  await expectNoRows(
    other.from('services').update({ name: 'Forbidden' }).eq('id', serviceRow.id).select('id'),
    'non-owner service update denied',
  );

  // Claim workflow and verification-document isolation.
  importedProviderId = crypto.randomUUID();
  check(
    await service.from('providers').insert({
      id: importedProviderId,
      business_name: `Imported E2E ${run}`,
      category_id: category.id,
      base_city: 'Leicester',
      source_profile_id: `e2e-${run}`,
      is_claimed: false,
      is_verified: false,
      verification_status: 'unverified',
    }),
    'seed claimable provider',
  );
  const claimRows = check(
    await claimant.rpc('claim_imported_provider', { target_provider: importedProviderId }),
    'claim imported provider',
  );
  const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
  assert.equal(claim.provider_id, importedProviderId);
  const claimed = check(
    await claimant.from('providers').select('id,owner_id').eq('id', importedProviderId).single(),
    'claim remains unassigned before approval',
  );
  assert.equal(claimed.owner_id, null);
  await expectNoRows(
    owner
      .from('providers')
      .update({ business_name: 'Forbidden' })
      .eq('id', importedProviderId)
      .select('id'),
    'cross-provider update denied',
  );
  const request = { id: claim.request_id };
  const verificationPath = `${claimantUser.id}/${request.id}/proof.pdf`;
  check(
    await claimant.storage
      .from('verification-documents')
      .upload(verificationPath, new TextEncoder().encode('%PDF-1.4 verification'), {
        contentType: 'application/pdf',
      }),
    'verification upload',
  );
  storageObjects.push(['verification-documents', verificationPath]);
  check(
    await claimant.from('verification_documents').insert({
      request_id: request.id,
      provider_id: importedProviderId,
      uploaded_by: claimantUser.id,
      document_type: 'registration',
      storage_path: verificationPath,
    }),
    'verification metadata',
  );
  assert.ok(
    (await customer.storage.from('verification-documents').download(verificationPath)).error,
    'customer cannot read verification file',
  );
  check(
    await admin.storage.from('verification-documents').download(verificationPath),
    'admin reads verification file',
  );
  check(
    await claimant.rpc('submit_provider_verification', {
      target_provider: importedProviderId,
      request_notes: 'Ready for review',
    }),
    'submit verification',
  );
  check(
    await admin
      .from('verification_requests')
      .update({
        status: 'approved',
        reviewed_by: adminUser.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: 'Approved in E2E',
      })
      .eq('id', request.id),
    'admin verification decision',
  );
  const approvedClaim = check(
    await claimant
      .from('providers')
      .select('owner_id,is_verified')
      .eq('id', importedProviderId)
      .single(),
    'approved claim state',
  );
  assert.equal(approvedClaim.owner_id, claimantUser.id);
  assert.equal(approvedClaim.is_verified, true);

  // Community moderation and audit visibility.
  communityPostId = check(
    await customer
      .from('community_posts')
      .insert({
        author_id: registration.data.user.id,
        post_type: 'discussion',
        body: 'E2E moderation post',
      })
      .select('id')
      .single(),
    'community post',
  ).id;
  check(
    await other.from('community_post_reports').insert({
      post_id: communityPostId,
      reporter_id: otherUser.id,
      reason: 'Automated staging report',
    }),
    'community report',
  );
  check(
    await admin.rpc('admin_transition_community_post', {
      post_id: communityPostId,
      expected_status: 'published',
      next_status: 'removed',
      reason: 'Removed by automated staging test',
    }),
    'admin moderation',
  );
  const audits = check(
    await admin
      .from('admin_audit_log')
      .select('action')
      .in('action', [
        'business_application_approved',
        'verification_decision',
        'community_post_removed',
      ]),
    'admin audit read',
  );
  assert.ok(audits.length >= 3, 'approval, verification and moderation are audited');
  await expectNoRows(
    customer.from('admin_audit_log').select('id').limit(1),
    'non-admin audit access denied',
  );

  // User suspension and role management through deployed Edge Functions.
  let action = await invoke(admin, 'admin-user-control', {
    userId: otherUser.id,
    action: 'suspend',
    reason: 'Automated staging suspension',
    idempotencyKey: crypto.randomUUID(),
  });
  assert.equal(action.status, 'suspended');
  action = await invoke(admin, 'admin-user-control', {
    userId: otherUser.id,
    action: 'reactivate',
    reason: 'Automated staging reactivation',
    idempotencyKey: crypto.randomUUID(),
  });
  assert.equal(action.status, 'active');
  await invoke(admin, 'admin-role-control', { action: 'grant', email: emails.roleTarget });
  let roleState = check(
    await service.auth.admin.getUserById(roleTarget.id),
    'role grant state',
  ).user;
  assert.equal(roleState.app_metadata.role, 'admin');
  await invoke(admin, 'admin-role-control', { action: 'revoke', email: emails.roleTarget });
  roleState = check(await service.auth.admin.getUserById(roleTarget.id), 'role revoke state').user;
  if (roleState.app_metadata.role !== undefined)
    failures.push('admin role revocation reported success but the role remained assigned');
  const deniedRoleChange = await customer.functions.invoke('admin-role-control', {
    body: { action: 'grant', email: emails.roleTarget },
  });
  assert.ok(deniedRoleChange.error || deniedRoleChange.data?.error, 'non-admin role change denied');

  // Authenticated account deletion is the final customer workflow.
  const deletion = await invoke(customer, 'delete-account', {});
  assert.equal(deletion.deleted, true);
  const deletedLookup = await service.auth.admin.getUserById(registration.data.user.id);
  assert.ok(deletedLookup.error, 'deleted customer no longer exists');
  users.splice(users.indexOf(registration.data.user.id), 1);

  console.log(JSON.stringify({ ok: failures.length === 0, checks: 36, failures, run }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  for (const [bucket, path] of storageObjects.reverse())
    await service.storage
      .from(bucket)
      .remove([path])
      .catch(() => {});
  if (importedProviderId) await service.from('providers').delete().eq('id', importedProviderId);
  if (providerId) await service.from('providers').delete().eq('id', providerId);
  if (applicationId) await service.from('business_applications').delete().eq('id', applicationId);
  if (users.length) {
    await service.from('admin_audit_log').delete().in('admin_id', users);
    await service.from('user_moderation_status').delete().in('user_id', users);
  }
  for (const id of users.reverse()) {
    const deletion = await service.auth.admin.deleteUser(id);
    if (deletion.error) console.error(`cleanup failed for ${id}: ${deletion.error.message}`);
  }
}
