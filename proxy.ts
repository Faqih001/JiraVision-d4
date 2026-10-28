import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// The name in lib/auth/session-token.ts, repeated as a literal because this file runs on the
// edge and that module pulls in node:crypto. tests/unit/session-guards.test.ts fails if the two
// ever drift apart.
const SESSION_COOKIE = "jv_session"

// Where the visitor was trying to go, handed to the server layouts: they redirect only after
// reading the row, by which time the URL is no longer in reach. Deliberately a header and not a
// cookie — it is a hint for this one request, never state that outlives it.
const PATH_HEADER = "x-jv-path"

// Presence-only, redirect-only: this cannot validate a token, so it is not a security boundary.
// It exists so an anonymous visitor to /dashboard is turned around before a page renders. The
// dashboard layout re-checks the session for real and is the thing that decides who gets in.
export function proxy(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  const path = request.nextUrl.pathname
  const requested = `${path}${request.nextUrl.search}`

  const isDevelopment = process.env.NODE_ENV === "development"
  const isTeamPage = path.startsWith("/dashboard/team")
  const isProtectedRoute =
    (path.startsWith("/dashboard") || path.startsWith("/onboarding")) && !(isDevelopment && isTeamPage)

  if (isProtectedRoute && !hasSessionCookie) {
    // `next` is validated again on the login page (safeNextPath); here it is only carried.
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", requested)
    return NextResponse.redirect(loginUrl)
  }

  // No reverse bounce. Sending a signed-in visitor away from /login used to be the second half
  // of a loop: a cookie that was present but dead bounced here, the workspace pushed back to
  // /login, and the two fought each other until the tab was closed. The login page can show a
  // signed-in person an ordinary form; nothing about it is unsafe.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(PATH_HEADER, requested)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
}
