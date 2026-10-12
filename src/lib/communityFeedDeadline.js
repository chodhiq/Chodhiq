import { withTimeout } from './withTimeout.js';

export const COMMUNITY_FEED_TIMEOUT_MS = 12000;

export function withCommunityFeedDeadline(work) {
  return withTimeout(
    work,
    COMMUNITY_FEED_TIMEOUT_MS,
    'Community feed request timed out.',
    'COMMUNITY_FEED_TIMEOUT',
  );
}

export function communityFeedErrorMessage(error) {
  if (error?.code === 'COMMUNITY_FEED_TIMEOUT') return "Couldn't load posts.";
  return 'Could not refresh the community feed. Showing saved posts if available.';
}
