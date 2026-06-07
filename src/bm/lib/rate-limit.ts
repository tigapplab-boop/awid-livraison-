// ========================================
// AWID / BURGER MINUTE - In-Memory Rate Limiter
// Sliding window algorithm with auto-cleanup
// ========================================

export interface RateLimitOptions {
  maxRequests: number;  // max requests allowed
  windowMs: number;     // time window in milliseconds
  key?: string;         // optional custom key prefix
}

interface RequestEntry {
  timestamp: number;    // when the request was made
}

interface RateLimitStore {
  entries: RequestEntry[];
}

// In-memory store keyed by identifier
const store = new Map<string, RateLimitStore>();

// HMR-safe cleanup timer stored on globalThis
const globalForRateLimit = globalThis as unknown as {
  rateLimitCleanupTimer: ReturnType<typeof setInterval> | undefined
}

/**
 * Remove expired entries from all buckets and delete empty buckets.
 * Runs automatically every 60 seconds.
 */
function cleanup(): void {
  const now = Date.now();

  for (const [identifier, bucket] of store.entries()) {
    // Filter out entries outside the largest possible window
    bucket.entries = bucket.entries.filter(
      (entry) => now - entry.timestamp < 60_000 // keep up to 1 min for safety
    );

    // Remove the bucket entirely if empty
    if (bucket.entries.length === 0) {
      store.delete(identifier);
    }
  }
}

/**
 * Ensure the cleanup timer is running.
 * Called lazily on first rateLimit() invocation.
 */
function ensureCleanup(): void {
  if (!globalForRateLimit.rateLimitCleanupTimer) {
    globalForRateLimit.rateLimitCleanupTimer = setInterval(cleanup, 60_000);
    // Allow the process to exit even if the timer is still running
    if (globalForRateLimit.rateLimitCleanupTimer && typeof globalForRateLimit.rateLimitCleanupTimer === 'object' && 'unref' in globalForRateLimit.rateLimitCleanupTimer) {
      globalForRateLimit.rateLimitCleanupTimer.unref();
    }
  }
}

/**
 * Check whether a request is allowed under the rate limit.
 *
 * Uses a sliding window algorithm: we keep timestamps of every request
 * within the window and count how many fall inside the current window.
 *
 * @param identifier - Unique key (e.g. IP address, phone number)
 * @param options    - Rate limit configuration
 * @returns allowed   - Whether the request is permitted
 * @returns remaining - How many more requests are allowed in this window
 * @returns resetAt   - Unix timestamp (ms) when the window resets
 */
export function rateLimit(
  identifier: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetAt: number } {
  ensureCleanup();

  const { maxRequests, windowMs, key } = options;
  const compositeKey = key ? `${key}:${identifier}` : identifier;
  const now = Date.now();

  // Get or create bucket
  let bucket = store.get(compositeKey);
  if (!bucket) {
    bucket = { entries: [] };
    store.set(compositeKey, bucket);
  }

  // Prune entries outside the sliding window
  bucket.entries = bucket.entries.filter(
    (entry) => now - entry.timestamp < windowMs
  );

  // Calculate remaining
  const currentCount = bucket.entries.length;
  const remaining = Math.max(0, maxRequests - currentCount);
  const allowed = currentCount < maxRequests;

  // Determine when the window resets (oldest entry timestamp + windowMs)
  const resetAt =
    bucket.entries.length > 0
      ? bucket.entries[0].timestamp + windowMs
      : now + windowMs;

  // If allowed, record this request
  if (allowed) {
    bucket.entries.push({ timestamp: now });
  }

  return {
    allowed,
    remaining: allowed ? remaining - 1 : 0,
    resetAt,
  };
}

/**
 * Manually clear rate limit entries for a given identifier.
 * Useful for testing or administrative purposes.
 */
export function clearRateLimit(identifier: string, key?: string): void {
  const compositeKey = key ? `${key}:${identifier}` : identifier;
  store.delete(compositeKey);
}

/**
 * Get current rate limit info without consuming a request.
 */
export function getRateLimitInfo(
  identifier: string,
  options: RateLimitOptions
): { remaining: number; resetAt: number; currentCount: number } {
  const { maxRequests, windowMs, key } = options;
  const compositeKey = key ? `${key}:${identifier}` : identifier;
  const now = Date.now();

  const bucket = store.get(compositeKey);
  if (!bucket) {
    return {
      remaining: maxRequests,
      resetAt: now + windowMs,
      currentCount: 0,
    };
  }

  // Prune stale entries
  bucket.entries = bucket.entries.filter(
    (entry) => now - entry.timestamp < windowMs
  );

  const currentCount = bucket.entries.length;
  const remaining = Math.max(0, maxRequests - currentCount);
  const resetAt =
    bucket.entries.length > 0
      ? bucket.entries[0].timestamp + windowMs
      : now + windowMs;

  return { remaining, resetAt, currentCount };
}
