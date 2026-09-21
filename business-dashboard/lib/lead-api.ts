import { supabase } from './supabase';

export async function updateLeadStatus(id: string, currentStatus: string, nextStatus: string) {
  const result = await supabase
    .from('quote_requests')
    .update({ status: nextStatus })
    .eq('id', id)
    .eq('status', currentStatus)
    .select('id');
  if (result.error) throw result.error;
  if (!result.data?.length) throw new Error('This lead changed. Refresh and try again.');
}

export async function respondToLead(id: string, expectedStatus: string, responseText: string) {
  const { error } = await supabase.rpc('respond_to_quote', {
    target_quote: id,
    expected_status: expectedStatus,
    response_text: responseText,
  });
  if (error) throw error;
}
