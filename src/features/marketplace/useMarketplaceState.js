import { useCallback, useState } from 'react';
import { categories as mockCategories, providers as mockProviders } from '../../data/mockData';
import { loadMarketplace } from '../../data/providerRepository';
import { DEMO_MODE } from '../../config/runtime';

export function useMarketplaceState(retryPendingOperations) {
  const [categories, setCategories] = useState(DEMO_MODE ? mockCategories : []);
  const [providers, setProviders] = useState(DEMO_MODE ? mockProviders : []);
  const [reviews, setReviews] = useState([]);
  const [offline, setOffline] = useState(true);
  const [marketplaceLoading, setMarketplaceLoading] = useState(true);

  const refreshMarketplace = useCallback(async () => {
    setMarketplaceLoading(true);
    try {
      const marketplace = await loadMarketplace();
      setCategories(marketplace.categories);
      setProviders(marketplace.providers);
      if (marketplace.reviews) setReviews(marketplace.reviews);
      setOffline(marketplace.offline);
      // Keep discovery responsive while any queued writes retry in the background.
      retryPendingOperations().catch(() => {});
      return marketplace;
    } finally {
      setMarketplaceLoading(false);
    }
  }, [retryPendingOperations]);

  return {
    categories,
    providers,
    reviews,
    setReviews,
    offline,
    marketplaceLoading,
    refreshMarketplace,
  };
}
