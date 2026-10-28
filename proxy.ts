import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// The name in lib/auth/session-token.ts, repeated as a literal because this file runs on the
// edge and that module pulls in node:crypto. tests/unit/session-guards.test.ts fails if the two
// ever drift apart.
const SESSION_COOKIE = "jv_session"

// Presence-only, redirect-only: this cannot validate a token, so it is not a security boundary.
// It exists so an anonymous visitor to /dashboard is turned around before a page renders. The
// dashboard layout re-checks the session for real and is the thing that decides who gets in.
export function proxy(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  const path = request.nextUrl.pathname

  const isDevelopment = process.env.NODE_ENV === "development"
  const isTeamPage = path.startsWith("/dashboard/team")
  const isProtectedRoute =
    (path.startsWith("/dashboard") || path.startsWith("/onboarding")) && !(isDevelopment && isTeamPage)

  if (isProtectedRoute && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // No reverse bounce. Sending a signed-in visitor away from /login used to be the second half
  // of a loop: a cookie that was present but dead bounced here, the workspace pushed back to
  // /login, and the two fought each other until the tab was closed. The login page can show a
  // signed-in person an ordinary form; nothing about it is unsafe.
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
}
