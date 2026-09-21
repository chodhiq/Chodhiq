import React, { useEffect } from 'react';
import { OfferCard } from './DiscoveryCards';
import { features } from '../config/features';
import GoogleBanner from './GoogleBanner';

/**
 * Shared monetisation boundary for Google banners and first-party ChodhiQ promotions.
 */
export default function AdPlacement({ customCampaign, onPress, onImpression }) {
  useEffect(() => {
    if (features.customAds && customCampaign) onImpression?.(customCampaign);
  }, [customCampaign, onImpression]);
  return (
    <>
      <GoogleBanner />
      {features.customAds && customCampaign ? (
        <OfferCard item={customCampaign} onPress={() => onPress?.(customCampaign)} />
      ) : null}
    </>
  );
}
