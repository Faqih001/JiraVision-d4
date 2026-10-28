// The store is the part that decides who is signed in, so these tests drive it with a fake
// database and check the three things that matter: what it writes, what it refuses to write,
// and what it reports when the query fails.

import { beforeEach, describe, expect, it, vi } from "vitest"

const store = vi.hoisted(() => ({
  rows: [] as unknown[],
  updates: [] as Record<string, unknown>[],
  deletes: [] as unknown[],
  inserts: [] as Record<string, unknown>[],
  conditions: [] as unknown[],
  reads: 0,
  failRead: false,
  failFirstRead: false,
  failWrite: false,
}))

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (condition: unknown) => {
          store.conditions.push(condition)
          store.reads += 1
          const stalled = store.failRead || (store.failFirstRead && store.reads === 1)
          return stalled
            ? Promise.reject(new Error("Connection terminated due to connection timeout, code: ETIMEDOUT"))
            : Promise.resolve(store.rows)
        },
      }),
    }),
    insert: () => ({
      values: (value: Record<string, unknown>) => {
        store.inserts.push(value)
        return store.failWrite ? Promise.reject(new Error("write failed")) : Promise.resolve()
      },
    }),
    update: () => ({
      set: (changes: Record<string, unknown>) => ({
        where: (condition: unknown) => {
          store.conditions.push(condition)
          store.updates.push(changes)
          return store.failWrite ? Promise.reject(new Error("write failed")) : Promise.resolve()
        },
      }),
    }),
    delete: () => ({
      where: (condition: unknown) => {
        store.deletes.push(condition)
        return Promise.resolve()
      },
    }),
  },
}))

import { createSession, readSession, revokeSession } from "@/lib/auth/sessions"
import { sessionTokenHash } from "@/lib/auth/session-token"

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const T0 = Date.parse("2026-10-28T09:00:00.000Z")
const at = (ms: number) => new Date(ms)

function row(over: Record<string, unknown> = {}) {
  return {
    id: 7,
    userId: 42,
    createdAt: at(T0),
    lastSeenAt: at(T0),
    expiresAt: at(T0 + DAY),
    revokedAt: null,
    ...over,
  }
}

beforeEach(() => {
  store.rows = []
  store.updates = []
  store.deletes = []
  store.inserts = []
  store.conditions = []
  store.reads = 0
  store.failRead = false
  store.failFirstRead = false
  store.failWrite = false
})

/** The (column, bound value) a drizzle where() clause was built from. */
function bound(condition: unknown): { column: string | undefined; value: unknown } {
  const chunks = (condition as { queryChunks?: { name?: string; value?: unknown }[] }).queryChunks ?? []
  return {
    column: chunks.find((chunk) => typeof chunk?.name === "string")?.name,
    value: chunks.find((chunk) => chunk?.constructor?.name === "Param")?.value,
  }
}

describe("readSession", () => {
  it("reports a live session and writes nothing when the row was just seen", async () => {
    store.rows = [row()]
    const lookup = await readSession("a-token", T0 + 30_000)
    expect(lookup).toEqual({ kind: "active", userId: 42, expiresAtMs: T0 + DAY, renewed: false })
    expect(store.updates).toEqual([])
  })

  it("refreshes last_seen_at without claiming the deadline moved", async () => {
    store.rows = [row()]
    const lookup = await readSession("a-token", T0 + 3 * HOUR)
    expect(lookup).toEqual({ kind: "active", userId: 42, expiresAtMs: T0 + DAY, renewed: false })
    expect(store.updates).toEqual([{ lastSeenAt: at(T0 + 3 * HOUR) }])
  })

  it("slides the window and hands the new deadline back for the cookie", async () => {
    store.rows = [row()]
    const now = T0 + 5 * HOUR
    const lookup = await readSession("a-token", now)
    expect(lookup.kind).toBe("active")
    if (lookup.kind !== "active") return
    expect(lookup.renewed).toBe(true)
    expect(lookup.expiresAtMs).toBe(now + DAY)
    expect((store.updates[0] as { expiresAt: Date }).expiresAt).toEqual(at(now + DAY))
  })

  it("reports unreachable, not signed out, when the query fails", async () => {
    store.failRead = true
    expect(await readSession("a-token", T0)).toEqual({ kind: "unreachable" })
    expect(store.updates).toEqual([])
    expect(store.deletes).toEqual([])
    // One retry for a waking compute, and then it stops rather than looping on a dead table.
    expect(store.reads).toBe(2)
  })

  it("recovers when the first attempt stalls on a cold compute", async () => {
    store.failFirstRead = true
    store.rows = [row()]
    const lookup = await readSession("a-token", T0 + 30_000)
    expect(lookup).toEqual({ kind: "active", userId: 42, expiresAtMs: T0 + DAY, renewed: false })
    expect(store.reads).toBe(2)
  })

  it("keeps a session alive when only the renewal write failed", async () => {
    store.rows = [row()]
    store.failWrite = true
    const lookup = await readSession("a-token", T0 + 5 * HOUR)
    expect(lookup.kind).toBe("active")
  })

  it("reports not_found for a cookie with no row — the deleted-account case", async () => {
    store.rows = []
    expect(await readSession("a-token", T0)).toEqual({ kind: "invalid", reason: "not_found" })
  })

  it("reports expired and drops the dead row", async () => {
    store.rows = [row({ expiresAt: at(T0 - 1) })]
    expect(await readSession("a-token", T0)).toEqual({ kind: "invalid", reason: "expired" })
    expect(store.deletes).toHaveLength(1)
  })

  it("reports revoked and keeps the row as the sign-out record", async () => {
    store.rows = [row({ revokedAt: at(T0 + HOUR) })]
    expect(await readSession("a-token", T0 + 2 * HOUR)).toEqual({ kind: "invalid", reason: "revoked" })
    expect(store.deletes).toEqual([])
  })

  it("looks the row up by digest, never by the raw token", async () => {
    const token = "a-real-looking-token"
    store.rows = [row()]
    await readSession(token, T0)
    expect(bound(store.conditions[0])).toEqual({ column: "token_hash", value: sessionTokenHash(token) })
  })
})

describe("createSession", () => {
  it("stores the digest and a full idle window", async () => {
    const token = "a-token"
    await createSession(42, token, T0)
    expect(store.inserts).toHaveLength(1)
    const inserted = store.inserts[0] as { tokenHash: string; userId: number; expiresAt: Date }
    expect(inserted.userId).toBe(42)
    expect(inserted.tokenHash).toBe(sessionTokenHash(token))
    expect(inserted.tokenHash).not.toContain(token)
    expect(inserted.expiresAt).toEqual(at(T0 + DAY))
  })

  it("lets a failed insert throw — a cookie with no row behind it is a fake session", async () => {
    store.failWrite = true
    await expect(createSession(42, "a-token", T0)).rejects.toThrow("write failed")
  })
})

describe("revokeSession", () => {
  it("stamps revoked_at instead of deleting", async () => {
    await revokeSession("a-token", T0)
    expect(store.updates).toEqual([{ revokedAt: at(T0) }])
    expect(store.deletes).toEqual([])
  })

  it("does not throw when the database is slow; logout still works", async () => {
    store.failWrite = true
    await expect(revokeSession("a-token", T0)).resolves.toBeUndefined()
  })

  it("revokes by digest, so the raw token never reaches the database", async () => {
    const token = "a-real-looking-token"
    await revokeSession(token, T0)
    expect(bound(store.conditions[0])).toEqual({ column: "token_hash", value: sessionTokenHash(token) })
  })
})
