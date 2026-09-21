import { supabase } from '../lib/supabase';

function requireClient() {
  if (!supabase) throw new Error('Connect Supabase before claiming a listing.');
  return supabase;
}

export async function listClaimableProviders() {
  const { data, error } = await requireClient().rpc('list_claimable_providers');
  if (error) throw error;
  return data || [];
}

export async function listProviderCategories() {
  const { data, error } = await requireClient()
    .from('categories')
    .select('id,name')
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

export async function claimProvider(providerId) {
  const { data, error } = await requireClient().rpc('claim_imported_provider', {
    target_provider: providerId,
  });
  if (error) throw error;
  const claim = Array.isArray(data) ? data[0] : data;
  if (!claim?.provider_id || !claim?.request_id)
    throw new Error('The claim request could not be created.');
  return claim;
}

export async function createProvider(userId, values) {
  const { data, error } = await requireClient()
    .from('providers')
    .insert({
      owner_id: userId,
      business_name: values.businessName.trim(),
      base_city: values.city.trim(),
      base_postcode: values.postcode.trim() || null,
      category_id: values.categoryId,
      verification_status: 'unverified',
      is_claimed: true,
    })
    .select('id,business_name,base_city,base_postcode')
    .single();
  if (error) throw error;
  return data;
}

export async function ensureVerificationDraft(providerId, userId, notes = '') {
  const existing = await requireClient()
    .from('verification_requests')
    .select('id,status')
    .eq('provider_id', providerId)
    .eq('submitted_by', userId)
    .in('status', ['draft', 'changes_requested'])
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data.id;
  const created = await requireClient()
    .from('verification_requests')
    .insert({
      provider_id: providerId,
      submitted_by: userId,
      status: 'draft',
      notes: notes.trim() || null,
    })
    .select('id')
    .single();
  if (created.error) throw created.error;
  return created.data.id;
}

export async function uploadVerificationDocument({
  providerId,
  requestId,
  userId,
  documentType,
  asset,
}) {
  const safeName = (asset.name || 'verification-document').replace(/[^a-z0-9._-]/gi, '-');
  const path = `${userId}/${providerId}/${requestId}/${Date.now()}-${safeName}`;
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('The selected document could not be read.');
  const bytes = await response.arrayBuffer();
  const uploaded = await requireClient()
    .storage.from('verification-documents')
    .upload(path, bytes, {
      contentType: asset.mimeType || 'application/octet-stream',
      upsert: false,
    });
  if (uploaded.error) throw uploaded.error;
  const metadata = await requireClient()
    .from('verification_documents')
    .insert({
      request_id: requestId,
      provider_id: providerId,
      uploaded_by: userId,
      document_type: documentType,
      storage_path: path,
      original_filename: asset.name || null,
      mime_type: asset.mimeType || null,
    });
  if (metadata.error) {
    await requireClient().storage.from('verification-documents').remove([path]);
    throw metadata.error;
  }
  return { path, name: asset.name || 'Verification document' };
}

export async function submitProviderVerification(providerId, notes = '') {
  const { data, error } = await requireClient().rpc('submit_provider_verification', {
    target_provider: providerId,
    request_notes: notes.trim() || null,
  });
  if (error) throw error;
  return data;
}
