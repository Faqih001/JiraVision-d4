// Shared per-IP rate limiting for public form endpoints.
// NOTE(deploy): in-memory only — per serverless instance. Swap for KV/Upstash when multi-instance matters.

type Entry = { count: number; resetAt: number }

const buckets = new Map<string, Entry>()

// A caller can mint unbounded keys (one per email an IP sprays), so spent windows are evicted
// rather than trusted to stay small.
const MAX_TRACKED_KEYS = 20_000

export function rateLimited(key: string, { windowMs = 60_000, max = 5 } = {}): boolean {
  const now = Date.now()
  if (buckets.size > MAX_TRACKED_KEYS) prune(now)

  const entry = buckets.get(key)
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  entry.count += 1
  return entry.count > max
}

/** How long a caller told they are rate-limited has to wait, for the Retry-After header. */
export function retryAfterSeconds(key: string, nowMs = Date.now()): number {
  const entry = buckets.get(key)
  if (!entry) return 1
  return Math.max(1, Math.ceil((entry.resetAt - nowMs) / 1000))
}

/**
 * Only a failed attempt should cost the caller one of their few, so a call that ended in success
 * spends its budget back.
 */
export function clearBucket(key: string): void {
  buckets.delete(key)
}

function prune(nowMs: number): void {
  for (const [key, entry] of buckets) {
    if (nowMs > entry.resetAt) buckets.delete(key)
  }
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
}
