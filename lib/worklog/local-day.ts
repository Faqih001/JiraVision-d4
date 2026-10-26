// The only place that turns an instant into a member's calendar day, and back again.
// work_log_entries.worked_on is a plain date: it means "the day the member thinks it
// was", so a 23:40 entry must not be pushed to tomorrow by a UTC server. Everything
// that stores or reads a day goes through this file.

const FALLBACK_ZONE = "UTC"
const DAY_MS = 24 * 60 * 60 * 1000

export function safeZone(timeZone?: string | null): string {
  const candidate = (timeZone ?? "").trim()
  if (!candidate) return FALLBACK_ZONE
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate })
    return candidate
  } catch {
    return FALLBACK_ZONE
  }
}

function zoneParts(instant: Date, timeZone: string): Record<string, string> {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
  const out: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") out[part.type] = part.value
  }
  return out
}

/** UTC offset of a zone at one instant, in ms. Truncated to whole seconds. */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = zoneParts(instant, timeZone)
  // Some environments render midnight of a 12-hour-cycle locale as "24".
  const hour = p.hour === "24" ? 0 : Number(p.hour)
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), hour, Number(p.minute), Number(p.second))
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

function dayTriple(dayIso: string): [number, number, number] {
  const [y, m, d] = dayIso.split("-").map(Number)
  return [y, m, d]
}

export function localDay(now: Date, timeZone?: string | null): string {
  const p = zoneParts(now, safeZone(timeZone))
  return `${p.year}-${p.month}-${p.day}`
}

export function shiftDays(dayIso: string, delta: number): string {
  const [y, m, d] = dayTriple(dayIso)
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

export function dayStartUtc(dayIso: string, timeZone?: string | null): Date {
  const zone = safeZone(timeZone)
  const [y, m, d] = dayTriple(dayIso)
  const nominal = Date.UTC(y, m - 1, d)
  // Two passes: the first offset is measured at a guess that can sit on the wrong
  // side of a transition, which would shift the whole day by an hour.
  let ts = nominal - zoneOffsetMs(new Date(nominal), zone)
  ts = nominal - zoneOffsetMs(new Date(ts), zone)
  return new Date(ts)
}

export function dayBoundsUtc(dayIso: string, timeZone?: string | null): { start: Date; end: Date } {
  const zone = safeZone(timeZone)
  return { start: dayStartUtc(dayIso, zone), end: dayStartUtc(shiftDays(dayIso, 1), zone) }
}

export function rangeBoundsUtc(fromIso: string, toIso: string, timeZone?: string | null): { start: Date; end: Date } {
  const zone = safeZone(timeZone)
  return { start: dayStartUtc(fromIso, zone), end: dayStartUtc(shiftDays(toIso, 1), zone) }
}

export function weekStartIso(dayIso: string, weekStartsOn = 1): string {
  const [y, m, d] = dayTriple(dayIso)
  const date = new Date(Date.UTC(y, m - 1, d))
  const offset = (date.getUTCDay() - weekStartsOn + 7) % 7
  return shiftDays(dayIso, -offset)
}

export function weekDays(mondayIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => shiftDays(mondayIso, i))
}

export function rangeDays(fromIso: string, toIso: string, cap = 370): string[] {
  const days: string[] = []
  let cursor = fromIso
  while (cursor <= toIso && days.length < cap) {
    days.push(cursor)
    cursor = shiftDays(cursor, 1)
  }
  return days
}

export function monthBoundsIso(dayIso: string): { from: string; to: string } {
  const [y, m] = dayTriple(dayIso)
  const from = `${y}-${String(m).padStart(2, "0")}-01`
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { from, to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}` }
}

export { DAY_MS }
