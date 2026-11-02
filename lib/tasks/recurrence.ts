import { type Cadence, computeNextRun } from "@/lib/cadence"

export const INSTANCE_COUNTS: Record<Cadence, number> = {
  "one-off": 0,
  daily: 30,
  weekly: 12,
  monthly: 12,
  yearly: 4,
}

export function computeInstanceDates(cadence: Cadence, from: Date): string[] {
  const count = INSTANCE_COUNTS[cadence]
  if (count === 0) return []
  const dates: string[] = []
  let cursor = new Date(from)
  for (let i = 0; i < count; i++) {
    dates.push(toIsoDate(cursor))
    const nextIso = computeNextRun(cadence, cursor)
    if (!nextIso) break
    cursor = new Date(nextIso)
  }
  return dates
}

export function nextInstanceDate(cadence: Cadence, after: Date): string | null {
  if (cadence === "one-off") return null
  const next = computeNextRun(cadence, after)
  return next ? next.slice(0, 10) : null
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
