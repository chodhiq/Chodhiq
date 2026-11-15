/** @param {Array<{rating?: number | string | null}>} reviews */
export function summarizeReviews(reviews) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingTotal = 0;
  let ratedCount = 0;

  for (const review of Array.isArray(reviews) ? reviews : []) {
    const rating = Number(review.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) continue;
    distribution[rating] += 1;
    ratingTotal += rating;
    ratedCount += 1;
  }

  return {
    count: Array.isArray(reviews) ? reviews.length : 0,
    average: ratedCount ? ratingTotal / ratedCount : null,
    distribution,
  };
}

export function findUserReview(reviews, providerId, userId) {
  if (!userId) return null;
  return (
    (Array.isArray(reviews) ? reviews : []).find(
      (review) =>
        String(review.providerId) === String(providerId) &&
        String(review.userId) === String(userId),
    ) || null
  );
}
