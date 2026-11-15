import { useCallback, useEffect, useRef, useState } from 'react';
import * as Network from 'expo-network';
import { categories as mockCategories, providers as mockProviders } from '../../data/mockData';
import { loadMarketplace } from '../../data/providerRepository';
import { DEMO_MODE } from '../../config/runtime';

export function useMarketplaceState(retryPendingOperations) {
  const [categories, setCategories] = useState(DEMO_MODE ? mockCategories : []);
  const [providers, setProviders] = useState(DEMO_MODE ? mockProviders : []);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);
  const [networkState, setNetworkState] = useState(null);
  const [refreshError, setRefreshError] = useState(null);
  const [marketplaceLoading, setMarketplaceLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const networkStateRef = useRef(null);

  const refreshMarketplace = useCallback(async () => {
    setMarketplaceLoading(true);
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const marketplace = await loadMarketplace({
        onCached: (cached) => {
          setLastUpdatedAt(cached.lastUpdatedAt || null);
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
      setRefreshError(marketplace.refreshError || null);
      setLastUpdatedAt(marketplace.lastUpdatedAt || null);
      // Keep discovery responsive while any queued writes retry in the background.
      retryPendingOperations().catch((error) => {
        console.warn('Pending changes could not be synced.', error?.message || error);
        setRefreshError('Pending changes could not sync. Tap Retry to try again.');
      });
      return marketplace;
    } catch (error) {
      setRefreshError(error?.message || 'The directory could not be refreshed.');
      throw error;
    } finally {
      setMarketplaceLoading(false);
      setReviewsLoading(false);
    }
  }, [retryPendingOperations]);

  useEffect(() => {
    let active = true;
    const updateNetworkState = (next) => {
      if (!active) return;
      const previous = networkStateRef.current;
      networkStateRef.current = next;
      setNetworkState(next);
      const wasOffline = previous?.isConnected === false || previous?.isInternetReachable === false;
      const isOnline = next?.isConnected !== false && next?.isInternetReachable !== false;
      if (wasOffline && isOnline) refreshMarketplace().catch(() => {});
    };

    Network.getNetworkStateAsync()
      .then(updateNetworkState)
      .catch((error) =>
        console.warn('Device connectivity could not be determined.', error?.message || error),
      );
    const subscription = Network.addNetworkStateListener(updateNetworkState);
    return () => {
      active = false;
      subscription.remove();
    };
  }, [refreshMarketplace]);

  const offline =
    networkState?.isConnected === false || networkState?.isInternetReachable === false;

  return {
    categories,
    providers,
    reviews,
    setReviews,
    reviewsLoading,
    reviewsError,
    offline,
    refreshError,
    lastUpdatedAt,
    marketplaceLoading,
    refreshMarketplace,
  };
}
