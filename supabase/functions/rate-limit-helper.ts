export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  headers: Record<string, string>;
  error?: string;
}

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowSeconds: 60,
};

/**
 * Check if a request is within rate limits
 * @param userId - Unique identifier for rate limiting (user ID, API key, IP, etc.)
 * @param endpoint - Endpoint name for metrics
 * @param config - Rate limit configuration (optional)
 * @returns Rate limit result with remaining quota and reset time
 */
export async function checkRateLimit(
  client: RpcClient,
  identifier: string,
  endpoint: string,
  config: Partial<RateLimitConfig> = {},
): Promise<RateLimitResult> {
  const { maxRequests, windowSeconds } = { ...DEFAULT_CONFIG, ...config };

  const now = Math.floor(Date.now() / 1000);
  const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds;
  const { data, error } = await client.rpc('consume_edge_rate_limit', {
    rate_scope: endpoint,
    rate_identifier: identifier,
    maximum_requests: maxRequests,
    window_seconds: windowSeconds,
  });
  const row = Array.isArray(data) ? data[0] : data;
  const count = Number((row as { request_count?: number } | null)?.request_count ?? 0);
  const allowed = !error && count > 0 && count <= maxRequests;
  const remaining = allowed ? Math.max(0, maxRequests - count) : 0;

  return {
    allowed,
    remaining,
    resetAt,
    error: error?.message,
    headers: {
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': resetAt.toString(),
      ...(allowed ? {} : { 'Retry-After': String(Math.max(1, resetAt - now)) }),
    },
  };
}

/**
 * Rate limit configuration presets for common endpoints
 */
export const RATE_LIMITS = {
  read: { maxRequests: 1000, windowSeconds: 60 },
  api: { maxRequests: 100, windowSeconds: 60 },
  mutation: { maxRequests: 30, windowSeconds: 60 },
  auth: { maxRequests: 5, windowSeconds: 300 },
  payment: { maxRequests: 10, windowSeconds: 300 },
  delivery: { maxRequests: 6, windowSeconds: 60 },
} as const;
