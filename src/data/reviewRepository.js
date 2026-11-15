import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/dateTime';
import { enqueuePendingOperation, saveLocalReview } from './localDatabase';
import { classifySyncError } from './syncPolicy';

export const mapReview = (row) => ({
  id: row.id,
  providerId: row.provider_id,
  providerName: row.providers?.business_name || row.provider_name || row.providerName || null,
  userId: row.user_id,
  rating: row.rating,
  text: row.comment || '',
  date: row.created_at ? formatDate(row.created_at) : 'Recently',
  createdAt: row.created_at,
  reply: row.review_replies?.[0]?.body || null,
});

export async function createReview(userId, input) {
  const comment = String(input.comment || '').trim();
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new Error('Choose a rating from 1 to 5 stars.');
  if (!comment) throw new Error('Add a short review before submitting.');
  if (comment.length > 500) throw new Error('Keep your review to 500 characters or fewer.');

  if (supabase) {
    const { data, error } = await supabase
      .from('reviews')
      .insert({ user_id: userId, provider_id: input.providerId, rating, comment })
      .select('id,provider_id,user_id,rating,comment,created_at,review_replies(body)')
      .single();
    if (!error) return { ...mapReview(data), syncStatus: 'sent' };
    if (error?.code === '23505') throw new Error('You have already reviewed this provider.');
    if (classifySyncError(error) === 'auth_required') throw error;
    if (classifySyncError(error) === 'permanent') throw error;
  }
  const review = {
    id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    providerId: String(input.providerId),
    userId,
    rating,
    comment,
    createdAt: new Date().toISOString(),
    date: 'Recently',
  };
  const localReview = await saveLocalReview(userId, review);
  await enqueuePendingOperation('review_create', {
    user_id: userId,
    provider_id: String(input.providerId),
    rating,
    comment,
    localReviewId: localReview.id,
  });
  return { ...review, syncStatus: 'pending' };
}

export async function updateReview(userId, reviewId, input) {
  if (!supabase) throw new Error('Reviews require an internet connection.');
  const comment = String(input.comment || '').trim();
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new Error('Choose a rating from 1 to 5 stars.');
  if (!comment) throw new Error('Add a short review before saving.');
  if (comment.length > 500) throw new Error('Keep your review to 500 characters or fewer.');
  const { data, error } = await supabase
    .from('reviews')
    .update({ rating, comment })
    .eq('id', reviewId)
    .eq('user_id', userId)
    .select('id,provider_id,user_id,rating,comment,created_at,review_replies(body)')
    .single();
  if (error) throw error;
  return mapReview(data);
}

export async function deleteReview(userId, reviewId) {
  if (!supabase) throw new Error('Reviews require an internet connection.');
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', userId);
  if (error) throw error;
}
