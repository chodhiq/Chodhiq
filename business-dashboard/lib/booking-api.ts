import { supabase } from './supabase';

export async function updateBookingStatus(
  id: string,
  providerId: string,
  currentStatus: string,
  nextStatus: 'confirmed' | 'declined' | 'completed',
) {
  const allowed =
    currentStatus === 'pending'
      ? ['confirmed', 'declined']
      : currentStatus === 'confirmed'
        ? ['completed']
        : [];
  if (!allowed.includes(nextStatus)) throw new Error('This booking can no longer be changed.');
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: nextStatus, responded_at: new Date().toISOString() })
    .eq('id', id)
    .eq('provider_id', providerId)
    .eq('status', currentStatus)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('This booking changed. Refresh and try again.');
}
