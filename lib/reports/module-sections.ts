// The eight activity-module sections of a period report: which rows belong to each module card,
// the one line the card prints as its number, and how many rows are on screen.
//
// Pure and DB-free, like row-sections.ts. The cards read everything from here so a module cannot
// show a total that disagrees with the list under it.

import { type ModuleKey, type ReportAggregate, type ReportRow } from "@/lib/reports/aggregate"
import { ROW_PREVIEW_LIMIT } from "@/lib/reports/row-sections"

export const MODULE_SECTIONS = [
  "operations",
  "registers",
  "serviceDesk",
  "goals",
  "meetings",
  "retros",
  "career",
  "playbooks",
] as const satisfies readonly ModuleKey[]

export type ModuleSectionKey = (typeof MODULE_SECTIONS)[number]

export function isModuleSection(value: unknown): value is ModuleSectionKey {
  return typeof value === "string" && (MODULE_SECTIONS as readonly string[]).includes(value)
}

/**
 * What a module reads when it has no rows. The builder hides an empty card, but the caption still
 * exists so an export or a future surface never prints a bare zero.
 */
const EMPTY_CAPTION: Record<ModuleSectionKey, string> = {
  operations: "No ops event was logged in this period.",
  registers: "No register item is held.",
  serviceDesk: "No ticket was open or resolved in this period.",
  goals: "No goal is being tracked.",
  meetings: "No meeting fell in this period.",
  retros: "No retro note or open action.",
  career: "No sign-off, request or review in this period.",
  playbooks: "No playbook is held.",
}

function plural(value: number, noun: string): string {
  return `${value} ${value === 1 ? noun : `${noun}s`}`
}

/** No `default`: a new module section fails to compile until it is given rows here. */
export function moduleRowsFor(section: ModuleSectionKey, aggregate: ReportAggregate): ReportRow[] {
  switch (section) {
    case "operations":
      return aggregate.opsRows
    case "registers":
      return aggregate.registerRows
    case "serviceDesk":
      return aggregate.ticketRows
    case "goals":
      return aggregate.goalRows
    case "meetings":
      return aggregate.meetingRows
    case "retros":
      return aggregate.retroRows
    case "career":
      return aggregate.careerRows
    case "playbooks":
      return aggregate.playbookRows
  }
}

export function moduleCaption(section: ModuleSectionKey, aggregate: ReportAggregate): string {
  const rows = moduleRowsFor(section, aggregate)
  if (rows.length === 0) return EMPTY_CAPTION[section]

  const { metrics } = aggregate
  switch (section) {
    case "operations":
      return `${plural(rows.length, "ops event")} in this period`
    case "registers":
      return `${plural(rows.length, "item")} held · ${metrics.registerVerifications.value} verified this period`
    case "serviceDesk":
      return `${metrics.ticketsOpen.value} open · ${metrics.ticketsResolved.value} resolved · ${plural(metrics.ticketActions.value, "action")} this period`
    case "goals":
      return `${plural(rows.length, "goal")} held · ${plural(metrics.goalCheckins.value, "check-in")} · ${metrics.goalsAchieved.value} achieved`
    case "meetings":
      return `${plural(rows.length, "meeting")} in this period`
    case "retros":
      return `${plural(metrics.retroNotes.value, "note")} this period · ${plural(metrics.retroActionsOpen.value, "open action")}`
    case "career":
      return `${plural(metrics.careerSignoffs.value, "sign-off")} · ${plural(metrics.careerRequests.value, "request")} · ${plural(metrics.growthReviews.value, "review")}`
    case "playbooks":
      return `${plural(metrics.playbooksPublished.value, "playbook")} published this period · ${plural(metrics.playbookRuns.value, "run")} logged`
  }
}

export function visibleModuleRows(
  section: ModuleSectionKey,
  aggregate: ReportAggregate,
  expanded: boolean,
): ReportRow[] {
  const rows = moduleRowsFor(section, aggregate)
  return expanded ? rows : rows.slice(0, ROW_PREVIEW_LIMIT)
}

export function hiddenModuleRowCount(section: ModuleSectionKey, aggregate: ReportAggregate): number {
  return Math.max(0, moduleRowsFor(section, aggregate).length - ROW_PREVIEW_LIMIT)
}