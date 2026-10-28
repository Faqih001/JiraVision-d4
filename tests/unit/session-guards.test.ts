import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const repo = path.resolve(__dirname, "..", "..")
const src = (relative: string) => readFileSync(path.join(repo, relative), "utf8")

const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

// What these guards hold is one sentence: the browser cannot ask to be anybody. Everything that
// decides who is signed in reads it from the auth_sessions row behind the cookie's token, and
// every other shape of "no user" that a database can produce is a retry, not a sign-out.

describe("no cookie the browser wrote decides who is signed in", () => {
  for (const file of ["lib/auth-actions.ts", "lib/session.ts", "proxy.ts"]) {
    it(`${file} never reads a user id or session id off the request`, () => {
      const code = codeOnly(src(file))
      expect(code).not.toMatch(/\.get\(\s*["'](user_id|session_id)["']/)
    })
  }

  it("clears the two cookies it replaced instead of honouring them", () => {
    const code = codeOnly(src("lib/session.ts"))
    expect(code).toMatch(/LEGACY_SESSION_COOKIES = \["session_id", "user_id"\]/)
    expect(code.match(/store\.delete\(\{ \.\.\.CLEAR_SESSION_COOKIE, name \}\)/g)).toHaveLength(2)
  })
})

describe("no callable sign-in forge", () => {
  // Every export of a "use server" module is callable from the browser with the arguments the
  // browser picks. An exported function that takes a user id is a login endpoint for anybody.
  it("lib/auth-actions.ts exports nothing that accepts a user id", () => {
    const code = codeOnly(src("lib/auth-actions.ts"))
    expect(code).not.toMatch(/export async function \w+\([^)]*\b(userId|user:)\b/)
  })

  it("begins a session through a module-local call, not an exported action", () => {
    const code = codeOnly(src("lib/auth-actions.ts"))
    expect(code).toMatch(/await beginSession\(/)
    expect(code).not.toMatch(/export async function createSession/)
  })
})

describe("a database that did not answer is never a sign-out", () => {
  it("getCurrentUser throws instead of returning null", () => {
    const code = codeOnly(src("lib/session.ts"))
    expect(code).toMatch(/if \(result\.state === "unreachable"\) throw new SessionUnreachableError\(\)/)
  })

  it("an active row with no loadable user is reported as unreachable", () => {
    const code = codeOnly(src("lib/session.ts"))
    expect(code).toMatch(/if \(!user\) return \{ state: "unreachable" \}/)
  })

  it("the session route answers 503 and leaves the cookie alone", () => {
    const code = codeOnly(src("app/api/auth/session/route.ts"))
    expect(code).toMatch(/status: 503/)
    expect(code).toMatch(/Retry-After/)
    expect(code).not.toMatch(/NextResponse\.json\(\{ user: null \}\)/)
  })
})

describe("the edge gate cannot fight the workspace", () => {
  it("proxy.ts only ever sends visitors to /login", () => {
    const code = codeOnly(src("proxy.ts"))
    expect(code.match(/NextResponse\.redirect/g)).toHaveLength(1)
    expect(code).not.toMatch(/new URL\("\/dashboard"/)
  })

  it("proxy.ts uses the cookie the auth layer actually sets", () => {
    // Repeated as a literal because proxy.ts runs on the edge and lib/auth/session-token.ts
    // pulls in node:crypto; this is what stops the two from drifting apart.
    const literal = src("proxy.ts").match(/const SESSION_COOKIE = "([^"]+)"/)?.[1]
    const token = src("lib/auth/session-token.ts").match(/export const SESSION_COOKIE = "([^"]+)"/)?.[1]
    expect(literal).toBe(token)
    expect(literal).toBe("jv_session")
  })
})

describe("the marketing header shows the member, not an invitation", () => {
  const code = codeOnly(src("components/layout/navbar.tsx"))

  it("an avatar menu replaces Log in / Get started once a user is known", () => {
    expect(code).toMatch(/\{user \? \(\s*<AccountMenu \/>/)
    expect(code).toMatch(/aria-label=\{`Account menu for/)
    expect(code).toMatch(/onClick=\{\(\) => void logout\(\)\}/)
  })

  it("the pair only renders for a finished read that found nobody", () => {
    expect(code).toMatch(/: isLoading \? \(\s*<span\s+aria-hidden="true"\s+className="h-8 w-8 animate-pulse rounded-full bg-muted"/)
    expect(code).toMatch(/<Link href="\/login">Log in<\/Link>/)
    expect(code).toMatch(/<Link href="\/signup">Get started<\/Link>/)
  })

  it("the drawer repeats the same three states", () => {
    expect(code).toMatch(/<UserAvatar user=\{user\} className="h-9 w-9" \/>/)
    expect(code).toMatch(/<Link href="\/dashboard">Dashboard<\/Link>/)
    // Two sign-out paths, the menu's and the drawer's, each a real call.
    expect(code.match(/void logout\(\)/g)).toHaveLength(2)
  })

  it("the avatar falls back to initials, never an empty circle", () => {
    expect(code).toMatch(/function initialsOf\(/)
    expect(code).toMatch(/<AvatarFallback className="text-xs font-semibold">\{initialsOf\(user\)\}<\/AvatarFallback>/)
  })
})

describe("the auth layer keeps its own secrets", () => {
  it("no session id or user id is written to the log", () => {
    for (const file of ["lib/auth-actions.ts", "lib/session.ts", "app/api/auth/session/route.ts"]) {
      expect(src(file)).not.toMatch(/console\.log/)
    }
  })

  it("a login writes the row before the cookie", () => {
    const code = codeOnly(src("lib/session.ts"))
    expect(code).toMatch(/await insertSessionRow\(userId, token, nowMs\)[\s\S]*?store\.set\(/)
  })
})

describe("every auth endpoint is rate limited", () => {
  for (const route of ["login", "signup", "forgot-password", "reset-password", "verify-token"]) {
    it(`${route} spends a budget before calling its action`, () => {
      const code = codeOnly(src(`app/api/auth/${route}/route.ts`))
      expect(code).toMatch(/gate\(request, "/)
      expect(code).toMatch(/if \(blocked\) return blocked/)
    })
  }

  it("a successful login hands its attempts back", () => {
    const code = codeOnly(src("app/api/auth/login/route.ts"))
    expect(code).toMatch(/refundAttempts\(keys\)/)
  })

  it("an unavailable database answers 503, not 200", () => {
    const code = codeOnly(src("app/api/auth/_respond.ts"))
    expect(code).toMatch(/result\.unavailable \? 503 : 200/)
  })
})

describe("a 401 stops the polling instead of retrying forever", () => {
  it("the badge poller treats 401 as terminal and asks the server gate to re-decide", () => {
    const code = codeOnly(src("components/dashboard-layout.tsx"))
    expect(code).toMatch(/res\.status === 401/)
    expect(code).toMatch(/setSessionEnded\(true\)/)
    expect(code).toMatch(/router\.refresh\(\)/)
  })

  it("the notifications poller treats 401 as terminal", () => {
    const code = codeOnly(src("components/notifications-bell.tsx"))
    expect(code).toMatch(/res\?\.status === 401/)
    expect(code).toMatch(/setSignedOut\(true\)/)
  })
})

describe("the redirect back into the app is validated", () => {
  it("the login page runs ?next= through safeNextPath", () => {
    const code = codeOnly(src("app/(auth)/login/page.tsx"))
    expect(code).toMatch(/safeNextPath\(searchParams\?\.get\("next"\)\)/)
    expect(code).toMatch(/router\.push\(next\)/)
    expect(code).not.toMatch(/router\.push\("\/dashboard"\)/)
  })

  it("the workspace sends an anonymous visitor to /login with where they were", () => {
    const code = codeOnly(src("components/dashboard-layout.tsx"))
    expect(code).toMatch(/status === "ready" && !user/)
    expect(code).toMatch(/params\.set\("next", target\)/)
    expect(code).toMatch(/window\.location\.search/)
  })

  it("the edge gate carries the deep link into /login", () => {
    const code = codeOnly(src("proxy.ts"))
    expect(code).toMatch(/loginUrl\.searchParams\.set\("next", requested\)/)
    expect(code).toMatch(/requestHeaders\.set\(PATH_HEADER, requested\)/)
    expect(code).toMatch(/const requested = `\$\{path\}\$\{request\.nextUrl\.search\}`/)
    // The query string is part of where they were going: an invite link must survive sign-in.
    expect(code).toMatch(/request\.nextUrl\.search/)
  })

  it("the server layouts validate the recorded path instead of trusting it", () => {
    const dashboard = codeOnly(src("app/dashboard/layout.tsx"))
    expect(dashboard).toMatch(/safeNextPath\(\(await headers\(\)\)\.get\("x-jv-path"\)\)/)
    expect(dashboard).toMatch(/if \(session\.state === "anonymous"\) redirect\(loginHref\(\)\)/)
    expect(dashboard).toMatch(/redirect\(loginHref\(session\.reason\)\)/)

    const onboarding = codeOnly(src("app/onboarding/page.tsx"))
    expect(onboarding).toMatch(/safeNextPath\(\(await headers\(\)\)\.get\("x-jv-path"\)\)/)
    expect(onboarding).toMatch(/redirect\(`\/login\?next=\$\{encodeURIComponent\(requested\)\}`\)/)
  })
})

