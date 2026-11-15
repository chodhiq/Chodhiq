import React from 'react';
import { findUserReview, summarizeReviews } from '../../src/lib/reviewStats';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {
  formatReviewCount,
  getProviderReviewDisplay,
  ReviewSummary,
} from '../../src/components/ProviderDetailComponents';

describe('summarizeReviews', () => {
  test('uses the review records for the count, mean, and histogram', () => {
    expect(summarizeReviews([{ rating: 4 }])).toEqual({
      count: 1,
      average: 4,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 0 },
    });
  });

  test('averages multiple reviews and returns no average for an empty list', () => {
    expect(summarizeReviews([{ rating: 4 }, { rating: 5 }])).toEqual({
      count: 2,
      average: 4.5,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
    });
    expect(summarizeReviews([])).toEqual({
      count: 0,
      average: null,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
  });

  test('finds an existing review regardless of numeric or string IDs', () => {
    const review = { providerId: 7, userId: 'member-1', rating: 4 };
    expect(findUserReview([review], '7', 'member-1')).toBe(review);
    expect(findUserReview([review], '7', 'member-2')).toBeNull();
  });

  test('header and summary use loaded review counts and correct singular/plural labels', () => {
    const cases = [
      { reviews: [], header: 'No reviews yet', summary: '0 reviews' },
      {
        reviews: [{ rating: 4 }],
        header: '4.0 (1 review)',
        summary: '1 review',
      },
      {
        reviews: [{ rating: 4 }, { rating: 5 }, { rating: 3 }],
        header: '4.0 (3 reviews)',
        summary: '3 reviews',
      },
    ];

    for (const testCase of cases) {
      const stats = summarizeReviews(testCase.reviews);
      expect(getProviderReviewDisplay(testCase.reviews).label).toBe(testCase.header);
      expect(formatReviewCount(stats.count)).toBe(testCase.summary);
    }
  });

  test('a single 4-star review fills only the 4-star histogram bar', async () => {
    const stats = summarizeReviews([{ rating: 4 }]);
    const view = await render(
      React.createElement(ReviewSummary, {
        palette: globalThis.__CHODHIQ_TEST_PALETTE__,
        rating: stats.average,
        count: stats.count,
        distribution: stats.distribution,
      }),
    );

    expect(StyleSheet.flatten(view.getByTestId('review-distribution-4').props.style).width).toBe(
      '100%',
    );
    expect(StyleSheet.flatten(view.getByTestId('review-distribution-5').props.style).width).toBe(
      '0%',
    );
    expect(view.getByText('4.0')).toBeTruthy();
    expect(view.getByText('1 review')).toBeTruthy();
  });
});
