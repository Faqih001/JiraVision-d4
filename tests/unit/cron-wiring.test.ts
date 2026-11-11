import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

// The schedule is the only thing that makes the three maintenance jobs run. Two failure modes are
// invisible until production: a `crons` key left beside `schedules` fires the same path twice an hour
// (double reports, double mail), and a sub-15-minute interval is rejected by the Hobby plan at deploy
// time — after the push, not in CI. Both are cheap to assert here.

const repo = path.resolve(__dirname, "..", "..")
const read = (relative: string) => readFileSync(path.join(repo, relative), "utf8")
const config = JSON.parse(read("vercel.json")) as Record<string, unknown>

type Schedule = { schedule?: string; path?: string; function?: string; requestMethod?: string }
const schedules = Object.entries((config.schedules ?? {}) as Record<string, Schedule>)

/** Values a cron field admits: wildcard, single value, range, step and comma lists. */
function field(spec: string, min: number, max: number): Set<number> {
  const out = new Set<number>()
  for (const part of spec.split(",")) {
    const [range, stepRaw] = part.split("/")
    const step = stepRaw === undefined ? 1 : Number(stepRaw)
    const lo = range === "*" ? min : Number(range.split("-")[0])
    const hi = range === "*" ? max : range.includes("-") ? Number(range.split("-")[1]) : lo
    for (let v = lo; v <= hi; v += step) out.add(v)
  }
  return out
}

/** Minutes between consecutive firings over a three-day window. */
function gaps(expression: string): number[] {
  const [minute, hour, dom, month, dow] = expression.trim().split(/\s+/)
  const minutes = field(minute, 0, 59)
  const hours = field(hour, 0, 23)
  const days = field(dom, 1, 31)
  const months = field(month, 1, 12)
  const weekdays = field(dow, 0, 6)
  const bothRestricted = dom !== "*" && dow !== "*"

  const fires: number[] = []
  const start = Date.UTC(2026, 0, 5) // a Monday, so weekday coverage is exercised
  for (let i = 0; i < 3 * 24 * 60; i++) {
    const d = new Date(start + i * 60_000)
    const dayMatch = days.has(d.getUTCDate())
    const weekdayMatch = weekdays.has(d.getUTCDay())
    const calendarMatch = bothRestricted ? dayMatch || weekdayMatch : dayMatch && weekdayMatch
    if (minutes.has(d.getUTCMinutes()) && hours.has(d.getUTCHours()) && months.has(d.getUTCMonth() + 1) && calendarMatch) {
      fires.push(i)
    }
  }
  return fires.slice(1).map((t, i) => t - fires[i])
}

describe("vercel.json declares exactly one maintenance schedule", () => {
  it("uses schedules, not the legacy crons key", () => {
    expect(config.crons).toBeUndefined()
    expect(schedules).toHaveLength(1)
  })

  it("points the hourly entry at the cron route with GET", () => {
    const [name, entry] = schedules[0]
    expect(name).toBe("workspace-maintenance")
    expect(entry.path).toBe("/api/cron/hourly")
    // Vercel defaults a path schedule to POST; the route only exports GET.
    expect(entry.requestMethod).toBe("GET")
    expect(entry.schedule).toBe("0 * * * *")
  })

  it("never fires more often than the Hobby plan allows", () => {
    for (const [name, entry] of schedules) {
      const expression = entry.schedule ?? ""
      expect(expression.split(/\s+/), name).toHaveLength(5)
      const deltas = gaps(expression)
      expect(deltas.length, `${name} never fires`).toBeGreaterThan(0)
      expect(Math.min(...deltas), `${name} fires every ${Math.min(...deltas)} min`).toBeGreaterThanOrEqual(15)
    }
  })
})

describe("each declared schedule resolves to a handler that exists", () => {
  it.each(schedules)("%s targets a real route file exporting the declared method", (_name, entry) => {
    expect(entry.path, "path-targeted schedules only").toBeTruthy()
    const route = path.join(repo, "app", entry.path as string, "route.ts")
    expect(existsSync(route), `no route.ts behind ${entry.path}`).toBe(true)
    const method = entry.requestMethod ?? "POST"
    expect(read(path.join("app", entry.path as string, "route.ts"))).toMatch(
      new RegExp(`export (async )?function ${method}\\b`),
    )
  })
})

describe("the cron secret is documented without being committed", () => {
  const example = read(".env.example")

  it("lists CRON_SECRET with an empty value", () => {
    expect(example).toMatch(/^CRON_SECRET=\s*$/m)
  })

  it("says where it goes and how to generate one", () => {
    const at = example.indexOf("CRON_SECRET")
    expect(at).toBeGreaterThan(-1)
    const block = example.slice(Math.max(0, at - 700), at)
    expect(block.toLowerCase()).toContain("vercel")
    expect(block).toContain("openssl rand -hex 32")
    expect(block.toLowerCase()).toContain("authorization")
  })
})