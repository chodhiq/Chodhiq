import { cacheMarketplace, loadLocalMarketplace } from './localDatabase';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { mapReview } from './reviewRepository';

function mapCategory(row) {
  return { id: row.slug, databaseId: row.id, name: row.name, icon: row.icon, color: row.color };
}

function mapProvider(row) {
  return {
    id: row.id,
    publishedAt: row.created_at || null,
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
    basePostcode: row.base_postcode || null,
    serviceAreas: row.service_areas || [],
    languages: row.languages_spoken || [],
    yearsExperience: row.years_experience,
    priceRange: row.price_range,
    rating: row.avg_rating == null ? null : Number(row.avg_rating),
    reviewCount: row.review_count == null ? 0 : Number(row.review_count),
    isVerified: row.is_verified,
    isDataVerified: row.data_verification_status === 'source_checked',
    dataVerifiedAt: row.data_verified_at,
    phone: row.phone,
    whatsapp: row.whatsapp,
    website: row.website,
    address: row.base_postcode ? `${row.base_city} ${row.base_postcode}` : row.base_city,
    googleMapsUrl: row.google_place_id
      ? `https://www.google.com/maps/search/?api=1&query_place_id=${row.google_place_id}`
      : row.base_city
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${row.business_name} ${row.base_city} ${row.base_postcode || ''}`)}`
        : null,
    image: row.cover_image_url || null,
    baseLatitude: row.latitude == null ? null : Number(row.latitude),
    baseLongitude: row.longitude == null ? null : Number(row.longitude),
    portfolio: row.portfolio_urls || [],
  };
}

export async function loadMarketplace({ onCached } = {}) {
  const cached = await loadLocalMarketplace();
  onCached?.(cached);
  if (!isSupabaseConfigured) return cached;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const [categoryResult, providerResult, reviewResult, replyResult, serviceResult, hoursResult] =
      await Promise.all([
        supabase
          .from('categories')
          .select('id,name,slug,icon,color,sort_order')
          .order('sort_order')
          .abortSignal(controller.signal),
        supabase
          .from('providers')
          .select(
            [
              'id,business_name,description,base_city,base_postcode,service_areas',
              'languages_spoken,years_experience,price_range,phone,whatsapp,website',
              'google_place_id,cover_image_url,portfolio_urls,is_verified',
              'data_verification_status,data_verified_at,avg_rating,review_count,created_at',
              'categories(name,slug)',
            ].join(','),
          )
          .order('created_at', { ascending: false })
          .abortSignal(controller.signal),
        supabase
          .from('reviews')
          .select('id,provider_id,user_id,rating,comment,created_at')
          .order('created_at', { ascending: false }),
        supabase.from('review_replies').select('review_id,body').abortSignal(controller.signal),
        supabase
          .from('services')
          .select('id,provider_id,name,description,starting_price,is_featured')
          .order('created_at')
          .abortSignal(controller.signal),
        supabase
          .from('provider_hours')
          .select('provider_id,day_of_week,open_time,close_time,is_closed')
          .order('day_of_week')
          .abortSignal(controller.signal),
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
    const coordinateResult = await supabase
      .rpc('public_provider_coordinates')
      .abortSignal(controller.signal);
    const coordinateRows = coordinateResult.error ? [] : coordinateResult.data || [];
    const coordinates = new Map(coordinateRows.map((row) => [row.id, row]));
    const providers = providerResult.data
      .map((row) => ({
        ...mapProvider({ ...row, ...(coordinates.get(row.id) || {}) }),
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
        return rankB - rankA || (b.rating || 0) - (a.rating || 0) || b.reviewCount - a.reviewCount;
      });
    let lastUpdatedAt = new Date().toISOString();
    try {
      lastUpdatedAt = await cacheMarketplace(categories, providers);
    } catch (error) {
      console.warn('Marketplace loaded but could not refresh its offline cache.', error.message);
    }
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
      lastUpdatedAt,
    };
  } catch (error) {
    console.warn('Marketplace sync failed; using the local cache.', error.message);
    return cached;
  } finally {
    clearTimeout(timeout);
  }
}
