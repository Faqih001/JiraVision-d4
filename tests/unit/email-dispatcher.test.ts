// The digest outbox has been persisted since the email workspace shipped and nothing has ever
// delivered a row. Wiring it to a real provider turns a stored log into an outbound mail path, so
// this file pins the three rules that keep it from becoming the /api/aitopia open relay again:
//
//   1. POST /api/email/digest accepts ANY address containing "@" from any signed-in member. The
//      dispatcher therefore only delivers to an address that belongs to a user of this app.
//   2. A member who switched an event's digest channel off is not mailed.
//   3. Vercel can deliver one cron run twice, so the row is claimed with a conditional UPDATE
//      before the provider is called — the second delivery sends nothing.
//
// The claim and the queue read are rendered to real SQL; a source guard would pass on an
// unconditional UPDATE that lets a duplicate delivery re-send.

import { beforeEach, describe, expect, it, vi } from "vitest"
import { PgDialect } from "drizzle-orm/pg-core"

const dialect = new PgDialect()
const render = (fragment: Parameters<typeof dialect.sqlToQuery>[0]) => dialect.sqlToQuery(fragment)
const text = (fragment: Parameters<typeof dialect.sqlToQuery>[0]) => render(fragment).sql.toLowerCase()

const state = vi.hoisted(() => ({
  fragments: [] as unknown[],
  answers: [] as unknown[],
  sent: [] as { to: string; subject: string; html: string; text?: string }[],
  sendResult: { ok: true } as { ok: boolean; error?: string },
}))

vi.mock("@/lib/db", () => ({
  db: {
    execute: async (fragment: unknown) => {
      state.fragments.push(fragment)
      return state.answers.shift() ?? []
    },
  },
}))

// Only the provider call is replaced — emailTemplate stays real, so the escaping the member
// actually receives is the escaping under test.
vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>()
  return {
    ...actual,
    sendEmail: async (message: { to: string; subject: string; html: string; text?: string }) => {
      state.sent.push(message)
      return state.sendResult
    },
  }
})

import {
  claimDigestSql,
  failDigestSql,
  flushDigestQueue,
  queuedDigestSql,
} from "@/app/api/email/_dispatcher"

const MEMBER = "owner@aac.co.ke"

const queuedRow = (over: Record<string, unknown> = {}) => ({
  id: 9,
  user_id: 1,
  to_email: MEMBER,
  subject: "Your week in JiraVision",
  body: "3 tasks finished.",
  event_type: "task",
  prefs: null as unknown,
  ...over,
})

const statements = () => state.fragments.map((f) => text(f as Parameters<typeof dialect.sqlToQuery>[0]))
const bound = () => state.fragments.map((f) => render(f as Parameters<typeof dialect.sqlToQuery>[0]).params)

function reset() {
  state.fragments.length = 0
  state.answers.length = 0
  state.sent.length = 0
  state.sendResult = { ok: true }
}

/** The queue read, then the member-address read, then whatever each row needs. */
function queue(rows: unknown[], rest: unknown[] = []) {
  state.answers = [rows, [{ email: MEMBER }], ...rest]
}

describe("the queue read and its claim", () => {
  it("reads only queued rows, oldest first, with the owner's preferences attached", () => {
    const lower = text(queuedDigestSql())
    expect(lower).toContain("from email_digest")
    expect(lower).toMatch(/status = 'queued'/)
    expect(lower).toMatch(/order by .*created_at/)
    expect(lower).toContain("join users")
    expect(lower).toContain("left join email_preferences")
  })

  it("caps the run at 25 rows and binds the cap", () => {
    const { sql, params } = render(queuedDigestSql())
    expect(params).toContain(25)
    expect(sql.toLowerCase()).not.toContain("limit 25")
  })

  it("claims a row only while it is still queued", () => {
    const { sql, params } = render(claimDigestSql(9))
    const lower = sql.toLowerCase()
    expect(lower).toMatch(/^update email_digest set status = /)
    expect(lower).toMatch(/where id = \$\d+ and status = 'queued'/)
    expect(lower).toMatch(/returning id/)
    expect(params).toContain(9)
    expect(params).toContain("delivered")
  })

  it("marks a row failed by id, without requiring it to still be queued", () => {
    // The claim already moved it to 'delivered'; a provider failure has to be able to correct that.
    const { sql, params } = render(failDigestSql(9))
    expect(sql.toLowerCase()).toMatch(/^update email_digest set status = /)
    expect(sql.toLowerCase()).toMatch(/where id = \$\d+$/)
    expect(params).toContain(9)
    expect(params).toContain("failed")
  })
})

describe("flushing the outbox", () => {
  beforeEach(reset)

  it("asks the provider nothing when the queue is empty", async () => {
    state.answers = [[]]
    expect(await flushDigestQueue()).toEqual({ ok: true, due: 0, delivered: 0, failed: 0, refused: 0 })
    expect(state.fragments).toHaveLength(1)
    expect(state.sent).toEqual([])
  })

  it("delivers a queued row to its member and claims it first", async () => {
    queue([queuedRow()], [[{ id: 9 }]])
    expect(await flushDigestQueue()).toEqual({ ok: true, due: 1, delivered: 1, failed: 0, refused: 0 })

    expect(state.sent).toHaveLength(1)
    expect(state.sent[0].to).toBe(MEMBER)
    expect(state.sent[0].subject).toBe("Your week in JiraVision")
    expect(state.sent[0].html).toContain("3 tasks finished.")
    expect(state.sent[0].text).toContain("3 tasks finished.")

    const sql = statements()
    expect(sql[2]).toMatch(/^update email_digest set status = /)
    expect(sql[2]).toContain("and status = 'queued'")
    // The claim precedes the send: nothing is written after a successful delivery.
    expect(sql).toHaveLength(3)
  })

  it("escapes the body it renders into the email", async () => {
    // The body is text a member typed into the outbox, not markup the app authored.
    queue([queuedRow({ body: `<img src=x onerror="alert(1)">` })], [[{ id: 9 }]])
    await flushDigestQueue()
    expect(state.sent[0].html).not.toContain("<img")
    expect(state.sent[0].html).toContain("&lt;img")
  })

  it("refuses an address that belongs to nobody in this app", async () => {
    // The relay shape: a member queues a row to a stranger, the hour mails it for them.
    queue([queuedRow({ to_email: "stranger@example.com" })], [])
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await flushDigestQueue()).toEqual({ ok: true, due: 1, delivered: 0, failed: 0, refused: 1 })
    expect(state.sent).toEqual([])
    expect(bound()[2]).toContain("failed")
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })

  it("refuses a row with no address at all", async () => {
    queue([queuedRow({ to_email: null })], [])
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(await flushDigestQueue()).toEqual({ ok: true, due: 1, delivered: 0, failed: 0, refused: 1 })
    expect(state.sent).toEqual([])
    logged.mockRestore()
  })

  it("matches the member's address regardless of case or surrounding space", async () => {
    queue([queuedRow({ to_email: `  ${MEMBER.toUpperCase()} ` })], [[{ id: 9 }]])
    expect(await flushDigestQueue()).toEqual({ ok: true, due: 1, delivered: 1, failed: 0, refused: 0 })
    expect(state.sent[0].to).toBe(MEMBER)
  })

  it("does not mail a member who switched this event's digest off", async () => {
    queue([queuedRow({ prefs: { task: { digest: false, inApp: true } } })], [])
    const logged = vi.spyOn(console, "info").mockImplementation(() => {})
    expect(await flushDigestQueue()).toEqual({ ok: true, due: 1, delivered: 0, failed: 0, refused: 1 })
    expect(state.sent).toEqual([])
    expect(bound()[2]).toContain("failed")
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })

  it("still mails an event the member has no preference row for", async () => {
    queue([queuedRow({ event_type: "sprint", prefs: { task: { digest: false, inApp: true } } })], [[{ id: 9 }]])
    expect(await flushDigestQueue()).toEqual({ ok: true, due: 1, delivered: 1, failed: 0, refused: 0 })
    expect(state.sent).toHaveLength(1)
  })

  it("records a provider failure instead of leaving the row delivered", async () => {
    queue([queuedRow()], [[{ id: 9 }], []])
    state.sendResult = { ok: false, error: "domain not verified" }
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await flushDigestQueue()).toEqual({ ok: false, due: 1, delivered: 0, failed: 1, refused: 0 })
    expect(bound()[3]).toContain("failed")
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })

  it("sends nothing when another delivery already claimed the row", async () => {
    queue([queuedRow()], [[]])
    expect(await flushDigestQueue()).toEqual({ ok: true, due: 1, delivered: 0, failed: 0, refused: 0 })
    expect(state.sent).toEqual([])
    expect(statements()).toHaveLength(3)
  })

  it("delivers the rest of the queue when one row is refused", async () => {
    queue([queuedRow(), queuedRow({ id: 10, to_email: "stranger@example.com" })], [[{ id: 9 }], []])
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(await flushDigestQueue()).toEqual({ ok: true, due: 2, delivered: 1, failed: 0, refused: 1 })
    expect(state.sent).toHaveLength(1)
    logged.mockRestore()
  })
})