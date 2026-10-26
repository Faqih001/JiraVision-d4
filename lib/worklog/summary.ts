// The arithmetic behind six sections of the work log page and the /dashboard "Today" strip.
// Pure: it takes rows already read through the ownership filter and returns buckets, so a
// wrong number is a test failure rather than a query nobody can re-run.

import {
  countByKind,
  gapDays,
  groupByDay,
  groupByTask,
  minutesByDiscipline,
  minutesTotal,
  openBlockerCount,
  streakOf,
  unlinkedCount,
  type DayBucket,
  type DisciplineBucket,
  type EntryDto,
  type KindBucket,
  type TaskBucket,
} from "./entries"

// The page and the tests both speak in EntryDto; re-exporting keeps one source of truth.
export type { EntryDto } from "./entries"

export type TransitionDto = {
  id: number
  taskId: number
  taskTitle: string | null
  fromStatus: string
  toStatus: string
  at: string
  source: string
}

export type WorklogSummary = {
  range: { from: string; to: string }
  totals: { entries: number; minutes: number; activeDays: number }
  days: DayBucket[]
  kinds: KindBucket[]
  disciplines: DisciplineBucket[]
  tasks: TaskBucket[]
  gaps: string[]
  streak: { current: number; longest: number }
  unlinked: number
  openBlockers: number
  transitions: TransitionDto[]
}

export function buildSummary(input: {
  entries: readonly EntryDto[]
  days: readonly string[]
  from: string
  to: string
  todayIso: string
  transitions?: readonly TransitionDto[]
}): WorklogSummary {
  const days = groupByDay(input.entries, input.days)
  const activeDays = days.filter((d) => d.count > 0).map((d) => d.day)

  // A day after today cannot be part of a habit yet, and a preset range such as
  // "this month" always contains some.
  const pastActive = activeDays.filter((d) => d <= input.todayIso)

  const transitions = [...(input.transitions ?? [])].sort((a, b) => b.at.localeCompare(a.at))

  return {
    range: { from: input.from, to: input.to },
    totals: { entries: input.entries.length, minutes: minutesTotal(input.entries), activeDays: activeDays.length },
    days,
    kinds: countByKind(input.entries),
    disciplines: minutesByDiscipline(input.entries),
    tasks: groupByTask(input.entries),
    gaps: gapDays(input.days, activeDays),
    streak: streakOf(pastActive, input.todayIso),
    unlinked: unlinkedCount(input.entries),
    openBlockers: openBlockerCount(input.entries),
    transitions,
  }
}
