// Selection math for the config approval screen (PR 11d).
//
// The diff comes out of lib/ops/config/diff.ts; this module turns it into what a reviewer clicks. It is
// kept out of the component so the defaults are testable: what starts checked is the whole safety of the
// screen, because a conflict left checked would let an unread proposal replace a rule people are already
// logging against.

import type { ProposalItem, ProposalSection, ProposalStatus } from "./diff"

export const SECTION_LABELS: Record<ProposalSection, string> = {
  logs: "Log entities",
  kpis: "KPIs",
  playbookSeeds: "Playbook seeds",
  reportTemplates: "Report templates",
  automationTemplates: "Automation templates",
  recommendRules: "Recommendation rules",
}

export const SECTION_ORDER: ProposalSection[] = [
  "logs",
  "kpis",
  "playbookSeeds",
  "reportTemplates",
  "automationTemplates",
  "recommendRules",
]

export const STATUS_LABELS: Record<ProposalStatus, string> = {
  new: "adds",
  conflict: "replaces",
  duplicate: "no change",
}

/**
 * Only an item the pack does not have starts checked. A conflict replaces a definition that rows are
 * already recorded against, and a duplicate changes nothing, so both need to be opted into on purpose.
 */
export function defaultSelection(items: ProposalItem[]): string[] {
  return items.filter((item) => item.status === "new").map((item) => item.ref)
}

export function toggleRef(selected: string[], ref: string): string[] {
  return selected.includes(ref) ? selected.filter((entry) => entry !== ref) : [...selected, ref]
}

export function selectAllInSection(items: ProposalItem[], section: ProposalSection, selected: string[]): string[] {
  const refs = items.filter((item) => item.section === section).map((item) => item.ref)
  const every = refs.length > 0 && refs.every((ref) => selected.includes(ref))
  if (every) return selected.filter((ref) => !refs.includes(ref))
  return [...new Set([...selected, ...refs])]
}

export function itemsInSection(items: ProposalItem[], section: ProposalSection): ProposalItem[] {
  return items.filter((item) => item.section === section)
}

export function sectionsPresent(items: ProposalItem[]): ProposalSection[] {
  return SECTION_ORDER.filter((section) => items.some((item) => item.section === section))
}

export function selectionCounts(items: ProposalItem[], selected: string[]): Record<ProposalStatus, number> {
  const counts: Record<ProposalStatus, number> = { new: 0, conflict: 0, duplicate: 0 }
  for (const item of items) {
    if (selected.includes(item.ref)) counts[item.status]++
  }
  return counts
}

/** One honest sentence about what the button is about to do, including the part people forget to count. */
export function selectionSummary(items: ProposalItem[], selected: string[]): string {
  const counts = selectionCounts(items, selected)
  const skipped = items.length - selected.length
  const parts: string[] = []
  if (counts.new) parts.push(`add ${counts.new} new definition${counts.new === 1 ? "" : "s"}`)
  if (counts.conflict) parts.push(`replace ${counts.conflict}`)
  if (counts.duplicate) parts.push(`restate ${counts.duplicate} that already match${counts.duplicate === 1 ? "es" : ""}`)
  if (!parts.length) return "nothing — select at least one item"
  const tail = skipped > 0 ? `, leaving ${skipped} unselected` : ""
  return `${parts.join(", ")}${tail}`
}
