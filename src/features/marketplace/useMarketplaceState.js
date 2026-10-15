import { useCallback, useState } from 'react';
import { categories as mockCategories, providers as mockProviders } from '../../data/mockData';
import { loadMarketplace } from '../../data/providerRepository';
import { DEMO_MODE } from '../../config/runtime';

export function useMarketplaceState(retryPendingOperations) {
  const [categories, setCategories] = useState(DEMO_MODE ? mockCategories : []);
  const [providers, setProviders] = useState(DEMO_MODE ? mockProviders : []);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);
  const [offline, setOffline] = useState(true);
  const [marketplaceLoading, setMarketplaceLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const refreshMarketplace = useCallback(async () => {
    setMarketplaceLoading(true);
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const marketplace = await loadMarketplace({
        onCached: (cached) => {
          setLastUpdatedAt(cached.lastUpdatedAt || null);
          setOffline(true);
          if (cached.providers?.length || cached.categories?.length) {
            setCategories(cached.categories);
            setProviders(cached.providers);
            setMarketplaceLoading(false);
          }
        },
      });
      setCategories(marketplace.categories);
      setProviders(marketplace.providers);
      if (marketplace.reviews !== null) setReviews(marketplace.reviews || []);
      setReviewsError(marketplace.reviewsError || null);
      setOffline(marketplace.offline);
      setLastUpdatedAt(marketplace.lastUpdatedAt || null);
      // Keep discovery responsive while any queued writes retry in the background.
      retryPendingOperations().catch(() => {});
      return marketplace;
    } finally {
      setMarketplaceLoading(false);
      setReviewsLoading(false);
    }
  }, [retryPendingOperations]);

  return {
    categories,
    providers,
    reviews,
    setReviews,
    reviewsLoading,
    reviewsError,
    offline,
    lastUpdatedAt,
    marketplaceLoading,
    refreshMarketplace,
  };
}
