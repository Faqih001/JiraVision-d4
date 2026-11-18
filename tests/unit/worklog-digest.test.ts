import { describe, expect, it } from "vitest"
import { buildDigest } from "@/lib/worklog/digest"
import { buildSummary, type EntryDto } from "@/lib/worklog/summary"
import type { DeliverableDto } from "@/lib/worklog/entries"
import { rangeDays } from "@/lib/worklog/local-day"

const DAYS = rangeDays("2026-11-10", "2026-11-16")

function entry(over: Partial<EntryDto>): EntryDto {
  return {
    id: 1,
    workedOn: "2026-11-10",
    taskId: null,
    taskTitle: null,
    kind: "action",
    title: "Racked a switch",
    body: null,
    discipline: "technician",
    minutes: 30,
    deliverableId: null,
    playbookId: null,
    playbookVersion: null,
    links: [],
    source: "manual",
    redatedAt: null,
    createdAt: "2026-11-10T06:00:00.000Z",
    ...over,
  }
}

function deliverable(over: Partial<DeliverableDto>): DeliverableDto {
  return {
    id: 1,
    name: "Rack layout doc",
    type: "document",
    status: "delivered",
    producedOn: "2026-11-12",
    link: null,
    evidence: null,
    taskId: null,
    taskTitle: null,
    discipline: null,
    entryCount: 2,
    createdAt: "2026-11-12T06:00:00.000Z",
    ...over,
  }
}

function summaryOf(entries: EntryDto[]) {
  return buildSummary({
    entries,
    days: DAYS,
    from: "2026-11-10",
    to: "2026-11-16",
    todayIso: "2026-11-16",
  })
}

describe("buildDigest", () => {
  it("heads the markdown with the range and the totals line", () => {
    const md = buildDigest(summaryOf([entry({ minutes: 90 })]), [])
    expect(md).toContain("# Work log — 2026-11-10 → 2026-11-16")
    expect(md).toContain("1 entry · 1h 30m · 1 active day")
  })

  it("lists the top three tasks by time, unlinked last", () => {
    const md = buildDigest(
      summaryOf([
        entry({ id: 1, taskId: 10, taskTitle: "Alpha", minutes: 10 }),
        entry({ id: 2, taskId: 20, taskTitle: "Beta", minutes: 90 }),
        entry({ id: 3, taskId: 30, taskTitle: "Gamma", minutes: 60 }),
        entry({ id: 4, taskId: 40, taskTitle: "Delta", minutes: 120 }),
        entry({ id: 5, taskId: null, taskTitle: null, minutes: 5 }),
      ]),
      [],
    )
    const section = md.slice(md.indexOf("## Top tasks"), md.indexOf("## Busiest day"))
    expect(section).toContain("1. Delta — 2h")
    expect(section).toContain("2. Beta — 1h 30m")
    expect(section).toContain("3. Gamma — 1h")
    expect(section).not.toContain("Alpha")
    expect(section).not.toContain("Unlinked")
  })

  it("names the busiest day with its own numbers", () => {
    const md = buildDigest(
      summaryOf([
        entry({ id: 1, workedOn: "2026-11-11", minutes: 30 }),
        entry({ id: 2, workedOn: "2026-11-12", minutes: 120 }),
      ]),
      [],
    )
    expect(md).toContain("2026-11-12 — 1 entry · 2h")
  })

  it("says so when nothing was logged instead of inventing a busiest day", () => {
    const md = buildDigest(summaryOf([]), [])
    expect(md).toContain("Nothing logged in this range.")
    expect(md).not.toContain("## Top tasks")
    expect(md).not.toContain("## Busiest day")
  })

  it("splits the mix over the kinds that actually appear", () => {
    const md = buildDigest(
      summaryOf([entry({ kind: "action" }), entry({ id: 2, kind: "blocker", minutes: null })]),
      [],
    )
    expect(md).toContain("Action 1 · 30m")
    expect(md).toContain("Blocker 1 · 0m")
    expect(md).not.toContain("Review 0")
  })

  it("counts open blockers and says when there are none", () => {
    expect(buildDigest(summaryOf([entry({ kind: "blocker" })]), [])).toContain("1 open blocker")
    expect(buildDigest(summaryOf([entry({})]), [])).toContain("No open blockers.")
  })

  it("lists only deliverables dated inside the range", () => {
    const md = buildDigest(
      summaryOf([entry({})]),
      [deliverable({}), deliverable({ id: 2, name: "Old audit", producedOn: "2026-10-01" })],
    )
    expect(md).toContain("- Rack layout doc (Delivered)")
    expect(md).not.toContain("Old audit")
  })

  it("names the gap days, capped and counted", () => {
    const md = buildDigest(summaryOf([entry({})]), [])
    expect(md).toContain("6 days with no entry")
    expect(md).toContain("11-11")
  })

  it("reports the streak the summary computed", () => {
    const md = buildDigest(summaryOf([entry({})]), [])
    expect(md).toMatch(/streak 0 days/)
  })
})