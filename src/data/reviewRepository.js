import { supabase } from '../lib/supabase';

export const mapReview = (row) => ({
  id: row.id,
  providerId: row.provider_id,
  userId: row.user_id,
  rating: row.rating,
  text: row.comment || '',
  date: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Recently',
  createdAt: row.created_at,
  reply: row.review_replies?.[0]?.body || null,
});

export async function createReview(userId, input) {
  if (!supabase) throw new Error('Reviews require an internet connection.');
  const comment = String(input.comment || '').trim();
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new Error('Choose a rating from 1 to 5 stars.');
  if (!comment) throw new Error('Add a short review before submitting.');
  if (comment.length > 500) throw new Error('Keep your review to 500 characters or fewer.');

  const { data, error } = await supabase
    .from('reviews')
    .insert({ user_id: userId, provider_id: input.providerId, rating, comment })
    .select('id,provider_id,user_id,rating,comment,created_at,review_replies(body)')
    .single();
  if (error?.code === '23505') throw new Error('You have already reviewed this provider.');
  if (error) throw error;
  return mapReview(data);
}
