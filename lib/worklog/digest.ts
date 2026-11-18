// The standup-ready digest: markdown over the summary the page already fetched, so copying it
// can never disagree with the cards on screen. Pure and deterministic — the same buckets always
// produce the same text, which is what makes it testable and safe to paste into a report.

import { DELIVERABLE_LABEL_STATUS, formatMinutes, type DeliverableDto } from "./entries"
import type { WorklogSummary } from "./summary"

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function buildDigest(summary: WorklogSummary, deliverables: readonly DeliverableDto[]): string {
  const { range, totals, streak } = summary
  const lines: string[] = [
    `# Work log — ${range.from} → ${range.to}`,
    "",
    `**${count(totals.entries, "entry", "entries")} · ${formatMinutes(totals.minutes)} · ${count(totals.activeDays, "active day", "active days")} · streak ${count(streak.current, "day", "days")} (longest ${count(streak.longest, "day", "days")})**`,
  ]

  if (totals.entries === 0) {
    lines.push("", "Nothing logged in this range.")
    return lines.join("\n")
  }

  lines.push("", "## Top tasks")
  summary.tasks.slice(0, 3).forEach((task, i) => {
    lines.push(`${i + 1}. ${task.taskTitle ?? "Unlinked entries"} — ${formatMinutes(task.minutes)}`)
  })

  const busiest = summary.days
    .filter((d) => d.count > 0)
    .sort((a, b) => b.minutes - a.minutes || b.count - a.count || a.day.localeCompare(b.day))[0]
  lines.push("", "## Busiest day")
  lines.push(`${busiest.day} — ${count(busiest.count, "entry", "entries")} · ${formatMinutes(busiest.minutes)}`)

  lines.push("", "## Mix of work")
  for (const k of summary.kinds.filter((k) => k.count > 0)) {
    lines.push(`${k.label} ${k.count} · ${formatMinutes(k.minutes)}`)
  }

  lines.push("", "## Blockers")
  lines.push(summary.openBlockers === 0 ? "No open blockers." : `${count(summary.openBlockers, "open blocker", "open blockers")}.`)

  const inRange = deliverables.filter(
    (d) => d.producedOn !== null && d.producedOn >= range.from && d.producedOn <= range.to,
  )
  lines.push("", "## Deliverables")
  if (inRange.length === 0) {
    lines.push("No deliverables dated in this range.")
  } else {
    for (const d of inRange) lines.push(`- ${d.name} (${DELIVERABLE_LABEL_STATUS[d.status]})`)
  }

  lines.push("", "## Gaps")
  if (summary.gaps.length === 0) {
    lines.push("Every day in the range has an entry.")
  } else {
    const shown = summary.gaps.slice(0, 7).map((day) => day.slice(5))
    const more = summary.gaps.length > 7 ? ` (+${summary.gaps.length - 7} more)` : ""
    lines.push(`${count(summary.gaps.length, "day", "days")} with no entry: ${shown.join(", ")}${more}`)
  }

  return lines.join("\n")
}