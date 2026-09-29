import AsyncStorage from '@react-native-async-storage/async-storage';
import { categories, providers } from './mockData';
import { DEMO_MODE } from '../config/runtime';

const key = (name, userId = 'local') => `chodhiq-local:${name}:${userId}`;
const CATALOG_CACHE_REVISION = DEMO_MODE ? '2-demo' : '3-production-clean';
const read = async (name, userId, fallback = []) => {
  try {
    const value = await AsyncStorage.getItem(key(name, userId));
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};
const write = (name, userId, value) =>
  AsyncStorage.setItem(key(name, userId), JSON.stringify(value));

export async function getLocalDatabase() {
  return null;
}
export async function loadLocalMarketplace() {
  const cachedRevision = await read('catalog-cache-revision', 'shared', '');
  if (cachedRevision !== CATALOG_CACHE_REVISION) {
    await Promise.all([
      write('catalog-categories', 'shared', []),
      write('catalog-providers', 'shared', []),
      write('catalog-cache-revision', 'shared', CATALOG_CACHE_REVISION),
    ]);
  }
  const [cachedCategories, cachedProviders] = await Promise.all([
    read('catalog-categories', 'shared', DEMO_MODE ? categories : []),
    read('catalog-providers', 'shared', DEMO_MODE ? providers : []),
  ]);
  return { categories: cachedCategories, providers: cachedProviders, offline: true };
}
export async function cacheMarketplace(nextCategories, nextProviders) {
  await Promise.all([
    write('catalog-categories', 'shared', nextCategories),
    write('catalog-providers', 'shared', nextProviders),
    write('catalog-cache-revision', 'shared', CATALOG_CACHE_REVISION),
  ]);
}

export async function loadLocalAccount(userId) {
  const [profile, savedIds, quotes, notifications, reviews] = await Promise.all([
    read('profile', userId, null),
    read('saved', userId),
    read('quotes', userId),
    read('notifications', userId),
    read('reviews', userId),
  ]);
  return {
    profile,
    saved: savedIds.map((provider_id) => ({ provider_id })),
    quotes,
    notifications,
    reviews,
    ownedProviders: [],
  };
}

export async function saveLocalProfile(userId, profile) {
  await write('profile', userId, profile);
  return profile;
}
export async function setLocalSaved(userId, providerId, saved) {
  const items = await read('saved', userId);
  const id = String(providerId);
  await write(
    'saved',
    userId,
    saved ? [...new Set([...items, id])] : items.filter((item) => item !== id),
  );
}
export async function createLocalQuote(userId, input) {
  const row = {
    id: `q-${Date.now()}`,
    provider_id: String(input.providerId),
    message: input.message,
    preferred_contact: input.preferredContact,
    status: 'sent',
    created_at: new Date().toISOString(),
  };
  await write('quotes', userId, [row, ...(await read('quotes', userId))]);
  return row;
}
export async function saveLocalReview(userId, review) {
  const row = {
    id: review.id || `r-${Date.now()}`,
    createdAt: review.createdAt || 'Today',
    ...review,
  };
  await write('reviews', userId, [row, ...(await read('reviews', userId))]);
  return row;
}
export async function markLocalNotificationsRead(userId) {
  const items = await read('notifications', userId);
  await write(
    'notifications',
    userId,
    items.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })),
  );
}
export async function createLocalReport(userId, providerId, reason, details) {
  const items = await read('reports', userId);
  await write('reports', userId, [
    {
      id: `report-${Date.now()}`,
      provider_id: String(providerId),
      reason,
      details,
      created_at: new Date().toISOString(),
    },
    ...items,
  ]);
}
export async function loadLocalPosts(providerList = []) {
  const rows = await read('community', 'shared');
  return rows
    .filter((row) => row.status !== 'removed')
    .map((row) => ({
      ...row,
      providers: row.provider_id
        ? (() => {
            const provider = providerList.find((item) => String(item.id) === row.provider_id);
            return provider
              ? { business_name: provider.name, is_verified: provider.isVerified }
              : null;
          })()
        : null,
    }));
}
export async function cacheCommunityPosts(posts) {
  const existing = await read('community', 'shared');
  // A successful server refresh is authoritative for remote posts. Retain only
  // locally-created posts that are still waiting for the offline sync queue.
  const pendingLocal = existing.filter((post) => String(post.id).startsWith('post-'));
  const merged = new Map(pendingLocal.map((post) => [String(post.id), post]));
  posts.forEach((post) => merged.set(String(post.id), post));
  await write(
    'community',
    'shared',
    [...merged.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  );
}
export async function createLocalPost(userId, input) {
  const row = {
    id: `post-${Date.now()}`,
    author_id: userId,
    provider_id: input.providerId ? String(input.providerId) : null,
    post_type: input.postType,
    body: input.body,
    image_url: null,
    region_key: input.regionKey || null,
    location_city: input.locationCity || null,
    created_at: new Date().toISOString(),
  };
  await write('community', 'shared', [row, ...(await read('community', 'shared'))]);
  return row;
}
export async function removeLocalPost(id) {
  await write(
    'community',
    'shared',
    (await read('community', 'shared')).filter((post) => String(post.id) !== String(id)),
  );
}
export async function enqueuePendingOperation(operation, payload) {
  const items = await read('pending', 'shared');
  const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await write('pending', 'shared', [
    ...items,
    { id, operation, payload, created_at: new Date().toISOString() },
  ]);
  return id;
}
export async function loadPendingOperations() {
  return read('pending', 'shared');
}
export async function removePendingOperation(id) {
  await write(
    'pending',
    'shared',
    (await read('pending', 'shared')).filter((item) => item.id !== id),
  );
}
export async function updatePendingOperation(id, payload) {
  await write(
    'pending',
    'shared',
    (await read('pending', 'shared')).map((item) => (item.id === id ? { ...item, payload } : item)),
  );
}

export async function clearLocalUserData(userId) {
  if (!userId) return;
  await Promise.all(
    ['profile', 'saved', 'quotes', 'notifications', 'reviews', 'reports'].map((name) =>
      AsyncStorage.removeItem(key(name, userId)),
    ),
  );
  const [community, pending] = await Promise.all([
    read('community', 'shared'),
    read('pending', 'shared'),
  ]);
  await Promise.all([
    write(
      'community',
      'shared',
      community.filter((post) => post.author_id !== userId),
    ),
    write(
      'pending',
      'shared',
      pending.filter((item) => !JSON.stringify(item.payload ?? {}).includes(userId)),
    ),
  ]);
}
