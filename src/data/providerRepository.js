import { cacheMarketplace, loadLocalMarketplace } from './localDatabase';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { providers as bundledProviders } from './mockData';
import { mapReview } from './reviewRepository';
import { DEMO_MODE } from '../config/runtime';

const bundledByName = new Map(
  (DEMO_MODE ? bundledProviders : []).map((provider) => [provider.name, provider]),
);

function mapCategory(row) {
  return { id: row.slug, databaseId: row.id, name: row.name, icon: row.icon, color: row.color };
}

function mapProvider(row) {
  const fallback = bundledByName.get(row.business_name) || {};
  return {
    ...fallback,
    id: row.id,
    name: row.business_name,
    category: row.categories?.name || 'Service provider',
    categoryId: row.categories?.slug,
    // Public directory reads deliberately avoid internal provenance and
    // moderation columns. Those fields are available only to privileged UI.
    sourceProfileId: null,
    isImported: false,
    sponsoredRank: 0,
    subcategory: null,
    description: row.description,
    baseCity: row.base_city,
    serviceAreas: row.service_areas || [],
    languages: row.languages_spoken || [],
    yearsExperience: row.years_experience,
    priceRange: row.price_range,
    rating: Number(row.avg_rating || 0),
    reviewCount: row.review_count || 0,
    isVerified: row.is_verified,
    phone: row.phone,
    whatsapp: row.whatsapp,
    website: row.website,
    address: row.base_postcode ? `${row.base_city} ${row.base_postcode}` : row.base_city,
    googleMapsUrl: row.google_place_id
      ? `https://www.google.com/maps/search/?api=1&query_place_id=${row.google_place_id}`
      : row.base_city
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${row.business_name} ${row.base_city} ${row.base_postcode || ''}`)}`
        : null,
    image: row.cover_image_url || fallback.image,
    portfolio: row.portfolio_urls?.length ? row.portfolio_urls : fallback.portfolio || [],
  };
}

export async function loadMarketplace() {
  const cached = await loadLocalMarketplace();
  if (!isSupabaseConfigured) return cached;
  try {
    const [categoryResult, providerResult, reviewResult, replyResult, serviceResult, hoursResult] =
      await Promise.all([
        supabase
          .from('categories')
          .select('id,name,slug,icon,color,sort_order')
          .order('sort_order'),
        supabase
          .from('providers')
          .select(
            'id,business_name,description,base_city,base_postcode,service_areas,languages_spoken,years_experience,price_range,phone,whatsapp,website,google_place_id,cover_image_url,portfolio_urls,is_verified,avg_rating,review_count,created_at,categories(name,slug)',
          )
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('id,provider_id,rating,comment,created_at')
          .order('created_at', { ascending: false }),
        supabase.from('review_replies').select('review_id,body'),
        supabase
          .from('services')
          .select('id,provider_id,name,description,starting_price,is_featured')
          .order('created_at'),
        supabase
          .from('provider_hours')
          .select('provider_id,day_of_week,open_time,close_time,is_closed')
          .order('day_of_week'),
      ]);
    if (categoryResult.error) throw categoryResult.error;
    if (providerResult.error) throw providerResult.error;
    if (reviewResult.error) throw reviewResult.error;
    if (replyResult.error) throw replyResult.error;
    if (serviceResult.error) throw serviceResult.error;
    if (hoursResult.error) throw hoursResult.error;
    const categories = categoryResult.data.map(mapCategory);
    const replies = new Map((replyResult.data || []).map((reply) => [reply.review_id, reply.body]));
    const servicesByProvider = new Map();
    for (const service of serviceResult.data || [])
      servicesByProvider.set(service.provider_id, [
        ...(servicesByProvider.get(service.provider_id) || []),
        service,
      ]);
    const hoursByProvider = new Map();
    for (const hours of hoursResult.data || [])
      hoursByProvider.set(hours.provider_id, [
        ...(hoursByProvider.get(hours.provider_id) || []),
        hours,
      ]);
    const providers = providerResult.data
      .map((row) => ({
        ...mapProvider(row),
        services: servicesByProvider.get(row.id) || [],
        featuredService:
          (servicesByProvider.get(row.id) || []).find((service) => service.is_featured) ||
          (servicesByProvider.get(row.id) || [])[0] ||
          null,
        openingHours: hoursByProvider.get(row.id) || [],
      }))
      .sort((a, b) => {
        const rankA = a.sponsoredRank === 5 ? 2 : a.sponsoredRank === 10 ? 1 : 0;
        const rankB = b.sponsoredRank === 5 ? 2 : b.sponsoredRank === 10 ? 1 : 0;
        return rankB - rankA || b.rating - a.rating || b.reviewCount - a.reviewCount;
      });
    await cacheMarketplace(categories, providers);
    return {
      categories,
      providers,
      reviews: reviewResult.data.map((row) =>
        mapReview({
          ...row,
          review_replies: replies.has(row.id) ? [{ body: replies.get(row.id) }] : [],
        }),
      ),
      offline: false,
    };
  } catch (error) {
    console.warn('Marketplace sync failed; using the local cache.', error.message);
    return cached;
  }
}
