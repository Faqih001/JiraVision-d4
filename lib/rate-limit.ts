// Shared per-IP rate limiting for public form endpoints.
// NOTE(deploy): in-memory only — per serverless instance. Swap for KV/Upstash when multi-instance matters.

type Entry = { count: number; windowStart: number }

const buckets = new Map<string, Entry>()

export function rateLimited(key: string, { windowMs = 60_000, max = 5 } = {}): boolean {
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry || now - entry.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now })
    return false
  }
  entry.count += 1
  return entry.count > max
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
}
