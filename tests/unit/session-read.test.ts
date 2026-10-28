import { beforeEach, describe, expect, it, vi } from "vitest"

// lib/session.ts is the only thing in this app that turns a cookie into a person, so this file
// is the contract roughly 140 route handlers rest on: who is signed in, and what happens when
// the database is slow instead of absent.

type StoredUser = {
  id: number
  name: string
  email: string
  passwordHash: string
  role: string
  avatar: string | null
  emailVerified: boolean
  jobTitle: string | null
  department: string | null
  location: string | null
  bio: string | null
  language: string | null
  timezone: string | null
  skills: string[] | null
  preferences: Record<string, unknown>
  status: string | null
  createdAt: Date
  updatedAt: Date | null
}

const store = vi.hoisted(() => ({
  jar: {} as Record<string, string>,
  calls: [] as string[],
  deleted: [] as string[],
  set: [] as { name: string; value: string; options: Record<string, unknown> }[],
  lookup: undefined as unknown,
  user: undefined as unknown,
  insertFails: false,
}))

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (store.jar[name] === undefined ? undefined : { name, value: store.jar[name] }),
    set: (name: string, value: string, options: Record<string, unknown>) => {
      store.calls.push("set-cookie")
      store.set.push({ name, value, options })
    },
    delete: (options: { name?: string }) => {
      store.deleted.push(options?.name ?? "?")
    },
  }),
}))

vi.mock("@/lib/auth/sessions", () => ({
  readSession: async () => {
    store.calls.push("read-session")
    return store.lookup
  },
  createSession: async () => {
    store.calls.push("insert-session")
    if (store.insertFails) throw new Error("write failed")
  },
  revokeSession: async () => {
    store.calls.push("revoke-session")
  },
}))

vi.mock("@/lib/db", () => ({
  getUserById: async (id: number) => {
    store.calls.push("load-user")
    return id === 7 ? store.user : null
  },
}))

import { beginSession, clearSessionCookies, endSession, getCurrentUser, resolveSession } from "@/lib/session"
import { MAX_SESSION_AGE_MS } from "@/lib/auth/expiry"
import { SESSION_COOKIE } from "@/lib/auth/session-token"
import { SessionUnreachableError } from "@/lib/auth/session-state"

const T0 = Date.UTC(2026, 10, 28, 12)

const mira = {
  id: 7,
  name: "Mira",
  email: "mira@example.com",
  passwordHash: "$2a$10$notarealhash",
  role: "user",
  avatar: null,
  emailVerified: true,
  jobTitle: null,
  department: null,
  location: null,
  bio: null,
  language: "en-US",
  timezone: "Africa/Nairobi",
  skills: null,
  preferences: {},
  status: null,
  createdAt: new Date(T0),
  updatedAt: null,
} satisfies StoredUser

beforeEach(() => {
  store.jar = { [SESSION_COOKIE]: "a-live-token" }
  store.calls = []
  store.deleted = []
  store.set = []
  store.lookup = { kind: "active", userId: 7, expiresAtMs: T0 + 3600_000, renewed: false }
  store.user = mira
  store.insertFails = false
})

describe("who the cookie proves", () => {
  it("treats an absent cookie as a visitor without touching the database", async () => {
    store.jar = {}
    await expect(resolveSession()).resolves.toEqual({ state: "anonymous" })
    expect(store.calls).toEqual([])
  })

  it("asks the row, not the cookie jar, who is signed in", async () => {
    // The bug this replaces: a user_id cookie was read straight off the request, so anyone could
    // name whichever account they wanted. The token's row is the only identity here.
    store.jar = { [SESSION_COOKIE]: "a-live-token", user_id: "999", session_id: "whatever" }
    store.lookup = { kind: "active", userId: 7, expiresAtMs: T0 + 3600_000, renewed: false }

    const result = await resolveSession()

    expect(result.state).toBe("active")
    if (result.state !== "active") throw new Error("unreachable")
    expect(result.user.id).toBe(7)
  })

  it("keeps the password hash out of the session", async () => {
    const result = await resolveSession()
    if (result.state !== "active") throw new Error("expected an active session")
    expect(result.user).not.toHaveProperty("passwordHash")
  })

  it("reports the reason a session ended", async () => {
    store.lookup = { kind: "invalid", reason: "revoked" }
    await expect(resolveSession()).resolves.toEqual({ state: "invalid", reason: "revoked" })
  })

  it("reports a failed read as unreachable", async () => {
    store.lookup = { kind: "unreachable" }
    await expect(resolveSession()).resolves.toEqual({ state: "unreachable" })
  })

  it("calls an active row with no loadable user unreachable, not gone", async () => {
    // The foreign key cascades, so a live row always has a user. A null here means the pool
    // stalled between the two reads — and answering "signed out" to that is the fake 401.
    store.user = undefined
    await expect(resolveSession()).resolves.toEqual({ state: "unreachable" })
  })
})

describe("what the routes get", () => {
  it("returns the person for a live session", async () => {
    const user = await getCurrentUser()
    expect(user?.email).toBe("mira@example.com")
  })

  it("returns null for a visitor and for a dead session", async () => {
    store.jar = {}
    await expect(getCurrentUser()).resolves.toBeNull()

    store.jar = { [SESSION_COOKIE]: "gone" }
    store.lookup = { kind: "invalid", reason: "expired" }
    await expect(getCurrentUser()).resolves.toBeNull()
  })

  it("throws when the database did not answer, so a route cannot answer 401", async () => {
    store.lookup = { kind: "unreachable" }
    await expect(getCurrentUser()).rejects.toBeInstanceOf(SessionUnreachableError)
  })
})

describe("beginning a login", () => {
  it("writes the row before the cookie exists", async () => {
    await beginSession(7, T0)
    expect(store.calls).toEqual(["insert-session", "set-cookie"])
  })

  it("sets no cookie when the row could not be written", async () => {
    store.insertFails = true
    await expect(beginSession(7, T0)).rejects.toThrow("write failed")
    expect(store.set).toEqual([])
  })

  it("hands the browser a token and keeps the digest out of it", async () => {
    await beginSession(7, T0)
    const cookie = store.set[0]
    expect(cookie.name).toBe(SESSION_COOKIE)
    expect(cookie.value).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(cookie.value).not.toMatch(/^\$2a\$/)
    expect(cookie.value.length).toBe(43)
  })

  it("carries the 30-day backstop and the flags that keep it server-read-only", async () => {
    await beginSession(7, T0)
    const { options } = store.set[0]
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" })
    expect((options.expires as Date).getTime()).toBe(T0 + MAX_SESSION_AGE_MS)
  })

  it("clears the cookies this replaced, which are still sitting in browsers", async () => {
    store.jar = { [SESSION_COOKIE]: "t", user_id: "999", session_id: "old" }
    await beginSession(7, T0)
    expect(store.deleted.sort()).toEqual(["session_id", "user_id"])
  })
})

describe("ending a login", () => {
  it("revokes the row and removes every session cookie", async () => {
    store.jar = { [SESSION_COOKIE]: "t", user_id: "999", session_id: "old" }
    await endSession()
    expect(store.calls).toEqual(["revoke-session"])
    expect(store.deleted.sort()).toEqual(["jv_session", "session_id", "user_id"])
  })

  it("does not reach for the database when there is nothing to revoke", async () => {
    store.jar = { user_id: "999", session_id: "old" }
    await endSession()
    expect(store.calls).toEqual([])
    expect(store.deleted.sort()).toEqual(["jv_session", "session_id", "user_id"])
  })

  it("removes the cookie even when clearSessionCookies is called on its own", async () => {
    await clearSessionCookies()
    expect(store.deleted).toContain(SESSION_COOKIE)
  })
})
