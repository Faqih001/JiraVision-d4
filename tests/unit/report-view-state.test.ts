import { describe, expect, it } from "vitest"
import {
  AUTO_TEMPLATE,
  SOURCE_LABEL,
  defaultReportState,
  effectiveTemplate,
  metricsSource,
  parseReportView,
  resolveReportPeriod,
  serializeReportView,
} from "@/lib/reports/view-state"

const TODAY = "2026-10-26"
const search = (raw: string) => new URLSearchParams(raw)

describe("defaults", () => {
  it("opens on the list with a weekly period anchored on today", () => {
    const state = defaultReportState(TODAY)
    expect(state.view).toBe("list")
    expect(state.periodType).toBe("weekly")
    expect(state.anchor).toBe(TODAY)
    expect(state.template).toBe(AUTO_TEMPLATE)
    expect(state.reportId).toBeNull()
    expect(state.open).toBeNull()
    expect(state.q).toBe("")
  })

  it("serialises nothing for the default state, so a clean link stays clean", () => {
    expect(serializeReportView(defaultReportState(TODAY), TODAY)).toBe("")
  })
})

describe("parseReportView", () => {
  it("reads every declared parameter", () => {
    const state = parseReportView(
      search("v=build&p=monthly&d=2026-03-05&tpl=assurance&r=17&open=blocked&q=sprint"),
      TODAY,
    )
    expect(state).toEqual({
      view: "build",
      periodType: "monthly",
      anchor: "2026-03-05",
      customFrom: TODAY,
      customTo: TODAY,
      template: "assurance",
      reportId: 17,
      open: "blocked",
      q: "sprint",
    })
  })

  it("ignores an unknown view, period type, template and section rather than adopting it", () => {
    const fallback = defaultReportState(TODAY)
    expect(parseReportView(search("v=editor"), TODAY).view).toBe(fallback.view)
    expect(parseReportView(search("p=fortnightly"), TODAY).periodType).toBe(fallback.periodType)
    expect(parseReportView(search("tpl=sprint"), TODAY).template).toBe(fallback.template)
    expect(parseReportView(search("open=achievements"), TODAY).open).toBeNull()
    // The guard against a hand-typed value reaching a query, same rule as the work log's ?discipline=.
    expect(parseReportView(search("r=abc"), TODAY).reportId).toBeNull()
    expect(parseReportView(search("r=0"), TODAY).reportId).toBeNull()
    expect(parseReportView(search("r=-4"), TODAY).reportId).toBeNull()
  })

  it("ignores a malformed anchor and keeps today", () => {
    expect(parseReportView(search("d=05/03/2026"), TODAY).anchor).toBe(TODAY)
    expect(parseReportView(search("d=2026-13-40"), TODAY).anchor).toBe(TODAY)
  })

  it("swaps or drops a custom range that cannot be used", () => {
    const swapped = parseReportView(search("p=custom&from=2026-10-20&to=2026-10-10"), TODAY)
    expect(swapped.customFrom).toBe("2026-10-10")
    expect(swapped.customTo).toBe("2026-10-20")
    const missing = parseReportView(search("p=custom&from=2026-10-10"), TODAY)
    expect(missing.customTo).toBe(missing.customFrom)
    expect(parseReportView(search("p=custom&from=yesterday"), TODAY).customFrom).toBe(TODAY)
  })

  it("round-trips every state it can produce", () => {
    for (const raw of [
      "",
      "v=build&p=yearly&d=2026-01-01",
      "v=build&p=custom&from=2026-09-01&to=2026-09-30&tpl=technical",
      "r=8&v=build&open=nextPeriod&q=audit",
    ]) {
      const state = parseReportView(search(raw), TODAY)
      expect(parseReportView(search(serializeReportView(state, TODAY)), TODAY)).toEqual(state)
    }
  })

  it("does not re-emit a parameter the server never reads", () => {
    // The phase-2 lesson: `?view=day` looked meaningful and was ignored. Only declared keys appear.
    const serialised = serializeReportView({ ...defaultReportState(TODAY), view: "build" }, TODAY)
    expect(serialised).toBe("v=build")
    expect(serialised).not.toMatch(/view=/u)
    expect(serialised).not.toMatch(/periodType=/u)
  })
})

describe("resolveReportPeriod", () => {
  it("turns the state into the exact inclusive days the report covers", () => {
    const weekly = resolveReportPeriod({ ...defaultReportState(TODAY), periodType: "weekly" })
    expect([weekly.start, weekly.end]).toEqual(["2026-10-26", "2026-11-01"])
    const custom = resolveReportPeriod({
      ...defaultReportState(TODAY),
      periodType: "custom",
      customFrom: "2026-10-01",
      customTo: "2026-10-15",
    })
    expect([custom.start, custom.end]).toEqual(["2026-10-01", "2026-10-15"])
  })
})

describe("effectiveTemplate", () => {
  const aggregate = (discipline: string | null) =>
    ({
      byDiscipline:
        discipline === null
          ? []
          : [{ key: discipline, label: discipline, minutes: { value: 60, refs: [] }, count: { value: 1, refs: [] } }],
    }) as never

  it("keeps an explicit choice", () => {
    expect(effectiveTemplate({ ...defaultReportState(TODAY), template: "creative" }, aggregate("developer"))).toBe(
      "creative",
    )
  })

  it("follows the discipline with the most logged minutes when set to auto", () => {
    expect(effectiveTemplate(defaultReportState(TODAY), aggregate("technician"))).toBe("technical")
    expect(effectiveTemplate(defaultReportState(TODAY), aggregate("auditor"))).toBe("assurance")
  })

  it("settles on general when there is no logged work to follow", () => {
    expect(effectiveTemplate(defaultReportState(TODAY), null)).toBe("general")
    expect(effectiveTemplate(defaultReportState(TODAY), aggregate(null))).toBe("general")
    expect(effectiveTemplate(defaultReportState(TODAY), aggregate("unassigned"))).toBe("general")
  })
})

describe("metricsSource", () => {
  it("shows the saved snapshot when the draft has one", () => {
    const report = { metrics: { generatedAt: "x" } } as unknown as Parameters<typeof metricsSource>[0]
    expect(metricsSource(report)).toBe("snapshot")
  })

  it("shows the live preview for a new draft and for a stored row with an unreadable blob", () => {
    expect(metricsSource(null)).toBe("live")
    expect(metricsSource({ metrics: null } as unknown as Parameters<typeof metricsSource>[0])).toBe("live")
  })

  it("names the difference in one label the page can render", () => {
    expect(SOURCE_LABEL.snapshot).toContain("saved")
    // The shipped copy capitalises the label as a sentence; the claim is the word, not its case.
    expect(SOURCE_LABEL.live.toLowerCase()).toContain("live")
  })
})
