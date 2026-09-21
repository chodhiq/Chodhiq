import * as SQLite from 'expo-sqlite';
import { categories as seedCategories, providers as seedProviders } from './mockData';
import { DEMO_MODE } from '../config/runtime';

const DATABASE_NAME = 'chodhiq.db';
let databasePromise;

const json = (value) => JSON.stringify(value ?? null);
const parse = (value, fallback) => {
  try {
    return value == null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
};

async function openDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT);
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, sort_order INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS providers (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, sort_order INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS saved_items (user_id TEXT NOT NULL, provider_id TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id, provider_id));
    CREATE TABLE IF NOT EXISTS quote_requests (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, provider_id TEXT NOT NULL, message TEXT NOT NULL, preferred_contact TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, provider_id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, read_at TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS provider_reports (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, provider_id TEXT NOT NULL, reason TEXT NOT NULL, details TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS community_posts (id TEXT PRIMARY KEY NOT NULL, author_id TEXT NOT NULL, provider_id TEXT, post_type TEXT NOT NULL, body TEXT NOT NULL, image_url TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pending_operations (id TEXT PRIMARY KEY NOT NULL, operation TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_user ON quote_requests(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON community_posts(created_at DESC);
  `);

  const seeded = await db.getFirstAsync(
    "SELECT value FROM app_meta WHERE key = 'catalog_seed_version'",
  );
  const seedVersion = DEMO_MODE ? '2-demo' : '2-production';
  if (seeded?.value !== seedVersion) {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM categories');
      await db.runAsync('DELETE FROM providers');
      const categoriesToSeed = DEMO_MODE ? seedCategories : [];
      const providersToSeed = DEMO_MODE ? seedProviders : [];
      for (let index = 0; index < categoriesToSeed.length; index += 1) {
        const item = categoriesToSeed[index];
        await db.runAsync(
          'INSERT INTO categories (id, payload, sort_order) VALUES (?, ?, ?)',
          item.id,
          json(item),
          index,
        );
      }
      for (let index = 0; index < providersToSeed.length; index += 1) {
        const item = providersToSeed[index];
        await db.runAsync(
          'INSERT INTO providers (id, payload, sort_order) VALUES (?, ?, ?)',
          String(item.id),
          json(item),
          index,
        );
      }
      await db.runAsync(
        "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('catalog_seed_version', ?)",
        seedVersion,
      );
    });
  }
  return db;
}

export function getLocalDatabase() {
  if (!databasePromise) databasePromise = openDatabase();
  return databasePromise;
}

export async function loadLocalMarketplace() {
  const db = await getLocalDatabase();
  const [categoryRows, providerRows] = await Promise.all([
    db.getAllAsync('SELECT payload FROM categories ORDER BY sort_order'),
    db.getAllAsync('SELECT payload FROM providers ORDER BY sort_order'),
  ]);
  return {
    categories: categoryRows.map((row) => parse(row.payload, null)).filter(Boolean),
    providers: providerRows.map((row) => parse(row.payload, null)).filter(Boolean),
    offline: true,
  };
}

export async function cacheMarketplace(categories, providers) {
  const db = await getLocalDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM categories');
    await db.runAsync('DELETE FROM providers');
    for (let index = 0; index < categories.length; index += 1) {
      const item = categories[index];
      await db.runAsync(
        'INSERT INTO categories (id, payload, sort_order) VALUES (?, ?, ?)',
        String(item.id),
        json(item),
        index,
      );
    }
    for (let index = 0; index < providers.length; index += 1) {
      const item = providers[index];
      await db.runAsync(
        'INSERT INTO providers (id, payload, sort_order) VALUES (?, ?, ?)',
        String(item.id),
        json(item),
        index,
      );
    }
  });
}

export async function loadLocalAccount(userId) {
  const db = await getLocalDatabase();
  const [profile, saved, quotes, notifications, reviews] = await Promise.all([
    db.getFirstAsync('SELECT payload FROM profiles WHERE user_id = ?', userId),
    db.getAllAsync('SELECT provider_id FROM saved_items WHERE user_id = ?', userId),
    db.getAllAsync(
      'SELECT id, provider_id, message, preferred_contact, status, created_at FROM quote_requests WHERE user_id = ? ORDER BY created_at DESC',
      userId,
    ),
    db.getAllAsync(
      'SELECT id, title, body, read_at, created_at FROM notifications WHERE user_id IN (?, ?) ORDER BY created_at DESC',
      userId,
      'local',
    ),
    db.getAllAsync(
      'SELECT payload FROM reviews WHERE user_id = ? ORDER BY created_at DESC',
      userId,
    ),
  ]);
  return {
    profile: parse(profile?.payload, null),
    saved,
    quotes,
    notifications,
    reviews: reviews.map((row) => parse(row.payload, null)).filter(Boolean),
    ownedProviders: [],
  };
}

export async function saveLocalProfile(userId, profile) {
  const db = await getLocalDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT OR REPLACE INTO profiles (user_id, payload, updated_at) VALUES (?, ?, ?)',
    userId,
    json({ ...profile, updated_at: now }),
    now,
  );
  return profile;
}

export async function setLocalSaved(userId, providerId, saved) {
  const db = await getLocalDatabase();
  if (saved)
    await db.runAsync(
      'INSERT OR IGNORE INTO saved_items (user_id, provider_id, created_at) VALUES (?, ?, ?)',
      userId,
      String(providerId),
      new Date().toISOString(),
    );
  else
    await db.runAsync(
      'DELETE FROM saved_items WHERE user_id = ? AND provider_id = ?',
      userId,
      String(providerId),
    );
}

export async function createLocalQuote(userId, input) {
  const db = await getLocalDatabase();
  const row = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    provider_id: String(input.providerId),
    message: input.message,
    preferred_contact: input.preferredContact,
    status: 'sent',
    created_at: new Date().toISOString(),
  };
  await db.runAsync(
    'INSERT INTO quote_requests (id, user_id, provider_id, message, preferred_contact, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    row.id,
    userId,
    row.provider_id,
    row.message,
    row.preferred_contact || null,
    row.status,
    row.created_at,
  );
  return row;
}

export async function saveLocalReview(userId, review) {
  const db = await getLocalDatabase();
  const row = {
    id: review.id || `r-${Date.now()}`,
    createdAt: review.createdAt || 'Today',
    ...review,
  };
  await db.runAsync(
    'INSERT OR REPLACE INTO reviews (id, user_id, provider_id, payload, created_at) VALUES (?, ?, ?, ?, ?)',
    row.id,
    userId,
    String(row.providerId),
    json(row),
    new Date().toISOString(),
  );
  return row;
}

export async function markLocalNotificationsRead(userId) {
  const db = await getLocalDatabase();
  await db.runAsync(
    'UPDATE notifications SET read_at = ? WHERE user_id IN (?, ?) AND read_at IS NULL',
    new Date().toISOString(),
    userId,
    'local',
  );
}

export async function createLocalReport(userId, providerId, reason, details) {
  const db = await getLocalDatabase();
  await db.runAsync(
    'INSERT INTO provider_reports (id, user_id, provider_id, reason, details, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    `report-${Date.now()}`,
    userId,
    String(providerId),
    reason,
    details || null,
    new Date().toISOString(),
  );
}

export async function loadLocalPosts(providers = []) {
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM community_posts ORDER BY created_at DESC LIMIT 100',
  );
  return rows.map((row) => ({
    ...row,
    providers: row.provider_id
      ? (() => {
          const provider = providers.find((item) => String(item.id) === row.provider_id);
          return provider
            ? { business_name: provider.name, is_verified: provider.isVerified }
            : null;
        })()
      : null,
  }));
}

export async function createLocalPost(userId, input) {
  const db = await getLocalDatabase();
  const row = {
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author_id: userId,
    provider_id: input.providerId ? String(input.providerId) : null,
    post_type: input.postType,
    body: input.body,
    image_url: null,
    created_at: new Date().toISOString(),
  };
  await db.runAsync(
    'INSERT INTO community_posts (id, author_id, provider_id, post_type, body, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    row.id,
    row.author_id,
    row.provider_id,
    row.post_type,
    row.body,
    row.image_url,
    row.created_at,
  );
  return row;
}
export async function removeLocalPost(id) {
  const db = await getLocalDatabase();
  await db.runAsync('DELETE FROM community_posts WHERE id = ?', id);
}

export async function cacheCommunityPosts(posts) {
  const db = await getLocalDatabase();
  await db.withTransactionAsync(async () => {
    // Remove stale server rows (including posts moderated away) while keeping
    // local post-* rows that still belong to the offline sync queue.
    await db.runAsync("DELETE FROM community_posts WHERE id NOT LIKE 'post-%'");
    for (const post of posts) {
      await db.runAsync(
        'INSERT OR REPLACE INTO community_posts (id, author_id, provider_id, post_type, body, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        String(post.id),
        post.author_id || 'remote',
        post.provider_id ? String(post.provider_id) : null,
        post.post_type,
        post.body,
        post.image_url || null,
        post.created_at,
      );
    }
  });
}

export async function enqueuePendingOperation(operation, payload) {
  const db = await getLocalDatabase();
  const id = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.runAsync(
    'INSERT INTO pending_operations (id, operation, payload, created_at) VALUES (?, ?, ?, ?)',
    id,
    operation,
    json(payload),
    new Date().toISOString(),
  );
  return id;
}
export async function loadPendingOperations() {
  const db = await getLocalDatabase();
  const rows = await db.getAllAsync('SELECT * FROM pending_operations ORDER BY created_at');
  return rows.map((row) => ({ ...row, payload: parse(row.payload, {}) }));
}
export async function removePendingOperation(id) {
  const db = await getLocalDatabase();
  await db.runAsync('DELETE FROM pending_operations WHERE id = ?', id);
}
export async function updatePendingOperation(id, payload) {
  const db = await getLocalDatabase();
  await db.runAsync('UPDATE pending_operations SET payload = ? WHERE id = ?', json(payload), id);
}
