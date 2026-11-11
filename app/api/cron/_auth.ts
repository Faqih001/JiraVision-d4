// Vercel calls a path schedule with `Authorization: Bearer <CRON_SECRET>` and no session cookie —
// proxy.ts only matches /dashboard and /onboarding, so nothing else guards this route. Fails closed:
// an unset secret refuses every call rather than opening a public endpoint that mutates tasks and
// sends email.

export function isAuthorizedCron(request: Request, secret: string | undefined = process.env.CRON_SECRET): boolean {
  if (!secret) return false
  return request.headers.get("authorization") === `Bearer ${secret}`
}
