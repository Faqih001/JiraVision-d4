import { NextResponse } from "next/server"
import { clearBucket, clientIp, rateLimited, retryAfterSeconds } from "@/lib/rate-limit"

// Every auth endpoint answers with one of three things: the action's own result, a 429 for someone
// who has run out of guesses, or a 503 when the database did not answer. The last two are the
// difference between "wrong password" and "we could not check" — the old code returned the first
// for both.

const MINUTE = 60_000
const HOUR = 60 * MINUTE

type Limit = { max: number; windowMs: number }

const BUDGETS: Record<string, Limit> = {
  // Twenty guesses a quarter-hour is generous next to a bcrypt compare and still bounds a spray.
  login: { max: 20, windowMs: 15 * MINUTE },
  signup: { max: 10, windowMs: HOUR },
  // One inbox per hour: the mail is the cost here, not the guess.
  "forgot-password": { max: 5, windowMs: HOUR },
  "reset-password": { max: 10, windowMs: HOUR },
  "verify-token": { max: 20, windowMs: HOUR },
}

/**
 * What an auth action can report. `unavailable` is the one the client must not render as a
 * credential problem.
 */
export type AuthResponseBody = {
  success?: boolean
  valid?: boolean
  message?: string
  unavailable?: boolean
  user?: unknown
}

export type Gate = { blocked: NextResponse | null; keys: string[] }

/**
 * Spends the caller's budget and returns the response to send if it is already gone.
 *
 * `email` is folded into the keys so one address cannot be sprayed from many IPs, and the IP so one
 * IP cannot spray many addresses. The keys come back so a successful login can hand them.
 */
export function gate(request: Request, scope: string, email?: string): Gate {
  const budget = BUDGETS[scope] ?? { max: 20, windowMs: 15 * MINUTE }
  const normalised = email?.trim().toLowerCase()
  const keys = [`auth:${scope}:ip:${clientIp(request)}`]
  if (normalised) keys.push(`auth:${scope}:email:${normalised}`)

  for (const key of keys) {
    if (rateLimited(key, budget)) {
      return {
        blocked: NextResponse.json(
          { success: false, message: "Too many attempts. Please wait before trying again." },
          { status: 429, headers: { "Retry-After": String(retryAfterSeconds(key)) } },
        ),
        keys,
      }
    }
  }

  return { blocked: null, keys }
}

/** A login that succeeded proves the caller was who they said they were; give the guesses back. */
export function refundAttempts(keys: string[]): void {
  for (const key of keys) clearBucket(key)
}

export function authResult(result: AuthResponseBody): NextResponse {
  return NextResponse.json(result, { status: result.unavailable ? 503 : 200 })
}

export function serverError(): NextResponse {
  return NextResponse.json({ success: false, message: "An unexpected error occurred" }, { status: 500 })
}
