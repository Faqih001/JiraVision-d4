import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const sessionId = request.cookies.get("session_id")?.value
  const userId = request.cookies.get("user_id")?.value

  // Check if the user is authenticated
  const isAuthenticated = sessionId && userId

  // Get the path of the request
  const path = request.nextUrl.pathname

  // Define protected routes
  const isProtectedRoute = path.startsWith("/dashboard")

  // Define authentication routes
  const isAuthRoute =
    path === "/login" || path === "/signup" || path === "/forgot-password" || path.startsWith("/reset-password")

  // If the route is protected and the user is not authenticated, redirect to login
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If the user is authenticated and trying to access auth routes, redirect to dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/forgot-password", "/reset-password"],
}
