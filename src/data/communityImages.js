import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { devicePerformance } from '../lib/devicePerformance';
import { supabase } from '../lib/supabase';

const BUCKET = 'community-images';
const PREFIX = 'community-image:';
const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadCommunityImage(userId, asset) {
  if (!supabase) throw new Error('Connect to upload a photo.');
  let uploadUri = asset.uri;
  let contentType = asset.mimeType || 'image/jpeg';
  const supported = ['image/jpeg', 'image/png', 'image/webp'].includes(contentType);
  if (asset.width > devicePerformance.uploadWidth || !supported) {
    const context = ImageManipulator.manipulate(asset.uri);
    let image;
    try {
      if (asset.width > devicePerformance.uploadWidth)
        context.resize({ width: devicePerformance.uploadWidth });
      image = await context.renderAsync();
      if (!supported) contentType = 'image/jpeg';
      const resized = await image.saveAsync({
        compress: 0.8,
        format:
          contentType === 'image/png'
            ? SaveFormat.PNG
            : contentType === 'image/webp'
              ? SaveFormat.WEBP
              : SaveFormat.JPEG,
      });
      uploadUri = resized.uri;
    } finally {
      image?.release();
      context.release();
    }
  }
  const response = await fetch(uploadUri);
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES)
    throw new Error('Choose an image smaller than 5 MB.');
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[contentType];
  if (!extension) throw new Error('Choose a JPEG, PNG, or WebP image.');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType });
  if (error) throw error;
  return { path, imageUrl: PREFIX + path };
}

export async function removeCommunityImage(path) {
  if (supabase && path) await supabase.storage.from(BUCKET).remove([path]);
}

const signedImages = new Map();
let cachedUser = null;
export async function resolveCommunityImages(posts) {
  if (!supabase) return posts;
  const session = await supabase.auth.getSession();
  const user = session.data.session?.user?.id || 'guest';
  if (cachedUser !== user) {
    signedImages.clear();
    cachedUser = user;
  }
  const paths = [
    ...new Set(
      posts
        .filter((post) => post.image_url?.startsWith(PREFIX))
        .map((post) => post.image_url.slice(PREFIX.length)),
    ),
  ];
  const now = Date.now();
  const missing = paths.filter(
    (path) => !signedImages.has(path) || signedImages.get(path).expiresAt <= now,
  );
  if (missing.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(missing, 3600);
    if (cachedUser !== user)
      return posts.map((post) =>
        post.image_url?.startsWith(PREFIX)
          ? { ...post, storage_image_ref: post.image_url, image_url: null }
          : post,
      );
    (data || []).forEach((item) => {
      if (item.signedUrl)
        signedImages.set(item.path, { url: item.signedUrl, expiresAt: now + 3300000 });
    });
    while (signedImages.size > 150) signedImages.delete(signedImages.keys().next().value);
  }
  return posts.map((post) =>
    !post.image_url?.startsWith(PREFIX)
      ? post
      : {
          ...post,
          storage_image_ref: post.image_url,
          image_url: signedImages.get(post.image_url.slice(PREFIX.length))?.url || null,
        },
  );
}
