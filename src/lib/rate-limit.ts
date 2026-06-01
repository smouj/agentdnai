/**
 * AgentDNAI Rate Limiting
 *
 * Simple in-memory rate limiter with automatic cleanup.
 * Tracks requests per key (IP address or userId).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup interval: remove expired entries every 60 seconds
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

/**
 * Check if a request is allowed based on rate limits
 *
 * @param key - Unique identifier (IP address, userId, etc.)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status, remaining requests, and reset time
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Periodic cleanup
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cleanup();
    lastCleanup = now;
  }

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // No entry or window expired - start fresh
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
    };
  }

  // Within the current window
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Remove all expired entries from the store
 */
function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Pre-configured rate limit presets
 */
export const RATE_LIMITS = {
  /** General API: 100 requests per minute */
  general: { limit: 100, windowMs: 60_000 },
  /** Authentication endpoints: 10 requests per 15 minutes */
  auth: { limit: 10, windowMs: 15 * 60_000 },
  /** Token issuance: 5 requests per minute */
  tokenIssue: { limit: 5, windowMs: 60_000 },
  /** Registration: 5 requests per hour */
  registration: { limit: 5, windowMs: 60 * 60_000 },
  /** Login: 10 requests per 15 minutes */
  login: { limit: 10, windowMs: 15 * 60_000 },
} as const;
