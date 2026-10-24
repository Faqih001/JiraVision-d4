// Neon Functions: the `hello` function is a long-running Hono/JS endpoint
// with a public HTTPS URL. It is optional — the app degrades gracefully when
// NEON_FUNCTION_HELLO_BASE_URL is not configured for the current branch.

export function neonFunctionsEnabled(): boolean {
  return Boolean(process.env.NEON_FUNCTION_HELLO_BASE_URL)
}

export async function callHelloFunction(
  path = "/",
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const base = process.env.NEON_FUNCTION_HELLO_BASE_URL
  if (!base) throw new Error("NEON_FUNCTION_HELLO_BASE_URL is not set")
  const url = `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) })
  const text = await res.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    /* keep raw text */
  }
  return { ok: res.ok, status: res.status, body }
}
