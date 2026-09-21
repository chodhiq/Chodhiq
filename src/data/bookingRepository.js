// @ts-check
import { supabase } from '../lib/supabase';
import { mapBooking } from './bookingMapper';

/** @typedef {import('../types/domain').BookingInput} BookingInput */
/** @typedef {import('../types/domain').BookingRecord} BookingRecord */
export { mapBooking } from './bookingMapper';

/** @param {string} userId @returns {Promise<BookingRecord[]>} */
export async function loadBookings(userId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('bookings')
    .select(
      'id,provider_id,service_id,requested_date,requested_time,status,notes,provider_message,created_at,providers(business_name),services(name)',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapBooking);
}

/** @param {string} userId @param {BookingInput} input @returns {Promise<BookingRecord>} */
export async function createBooking(userId, input) {
  if (!supabase) throw new Error('Bookings require an internet connection.');
  const date = String(input.requestedDate || '').trim();
  const time = String(input.requestedTime || '').trim();
  const notes = String(input.notes || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Enter the date as YYYY-MM-DD.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Enter the time as HH:MM.');
  if (new Date(`${date}T${time}:00`).getTime() <= Date.now())
    throw new Error('Choose a future date and time.');
  if (notes.length > 1000) throw new Error('Keep booking notes to 1,000 characters or fewer.');
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id: userId,
      provider_id: input.providerId,
      service_id: input.serviceId || null,
      requested_date: date,
      requested_time: time,
      notes: notes || null,
    })
    .select(
      'id,provider_id,service_id,requested_date,requested_time,status,notes,provider_message,created_at,providers(business_name),services(name)',
    )
    .single();
  if (error) throw error;
  return mapBooking(data);
}

/** @param {string} userId @param {string} bookingId */
export async function cancelBooking(userId, bookingId) {
  if (!supabase) throw new Error('Bookings require an internet connection.');
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed'])
    .select('id,status')
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new Error('This booking can no longer be cancelled. Refresh to see its latest status.');
  return data;
}
