// The standup-ready digest: markdown over the summary the page already fetched, so copying it
// can never disagree with the cards on screen. Pure and deterministic — the same buckets always
// produce the same text, which is what makes it testable and safe to paste into a report.

import { formatMinutes, type DeliverableDto } from "./entries"
import { DELIVERABLE_LABEL_STATUS } from "./entries"
import type { WorklogSummary } from "./summary"

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

export function buildDigest(summary: WorklogSummary, deliverables: readonly DeliverableDto[]): string {
  const { range, totals, streak } = summary
  const lines: string[] = [
    `# Work log — ${range.from} → ${range.to}`,
    "",
    `**${plural(totals.entries, "entry").replace("entrys", "entries")} · ${formatMinutes(totals.minutes)} · ${plural(totals.activeDays, "active day")} · streak ${plural(streak.current, "day")} (longest ${plural(streak.longest, "day")})**`,
  ]

  if (totals.entries === 0) {
    lines.push("", "Nothing logged in this range.")
    return lines.join("\n")
  }

  const top = summary.tasks.slice(0, 3)
  lines.push("", "## Top tasks")
  top.forEach((task, i) => {
    lines.push(`${i + 1}. ${task.taskTitle ?? "Unlinked entries"} — ${formatMinutes(task.minutes)}`)
  })

  const busiest = summary.days
    .filter((d) => d.count > 0)
    .sort((a, b) => b.minutes - a.minutes || b.count - a.count || a.day.localeCompare(b.day))[0]
  lines.push("", "## Busiest day")
  lines.push(`${busiest.day} — ${plural(busiest.count, "entry").replace("entrys", "entries")} · ${formatMinutes(busiest.minutes)}`)

  const kinds = summary.kinds.filter((k) => k.count > 0)
  lines.push("", "## Mix of work")
  for (const k of kinds) lines.push(`${k.label} ${k.count} · ${formatMinutes(k.minutes)}`)

  lines.push("", "## Blockers")
  lines.push(summary.openBlockers === 0 ? "No open blockers." : `${plural(summary.openBlockers, "open blocker")}.`)

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
    lines.push(`${plural(summary.gaps.length, "day").replace("days", summary.gaps.length === 1 ? "day" : "days")} with no entry: ${shown.join(", ")}${more}`)
  }

  return lines.join("\n")
}