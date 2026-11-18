// Which activity-module cards a report includes. `null` means all of them — the default, and the
// only state that keeps the link clean. Like the drill-down `open` param, scope is view state: it
// rides in the URL a member shares, not on the stored row, so the numbers behind it stay complete.
//
// The four backbone modules (worklog, tasks, deliverables, planner) are not cards you can deselect;
// they always stay. Scope chooses among the fifteen MODULE_SECTIONS cards only.

import { MODULE_LABEL, type ModuleKey, type SplitBucket, type TimelineRow } from "./aggregate"
import { MODULE_SECTIONS, isModuleSection, type ModuleSectionKey } from "./module-sections"

export type ModuleScope = ModuleSectionKey[] | null

/** Read the `mods` param: recognised keys only, trimmed, deduplicated, in card order. */
export function parseModuleScope(raw: string | null): ModuleScope {
  if (raw === null) return null
  const picked = new Set<ModuleSectionKey>()
  for (const part of raw.split(",")) {
    const key = part.trim()
    if (isModuleSection(key)) picked.add(key)
  }
  if (picked.size === 0) return null
  const ordered = MODULE_SECTIONS.filter((section) => picked.has(section))
  return ordered.length === MODULE_SECTIONS.length ? null : ordered
}

/** Write the `mods` param, or null when the selection is all modules (or empty) so it is omitted. */
export function serializeModuleScope(scope: ModuleScope): string | null {
  if (scope === null) return null
  const ordered = MODULE_SECTIONS.filter((section) => scope.includes(section))
  if (ordered.length === 0 || ordered.length === MODULE_SECTIONS.length) return null
  return ordered.join(",")
}

export function inScope(section: ModuleSectionKey, scope: ModuleScope): boolean {
  return scope === null || scope.includes(section)
}

export function scopedModuleSections(scope: ModuleScope): ModuleSectionKey[] {
  return scope === null ? [...MODULE_SECTIONS] : MODULE_SECTIONS.filter((section) => scope.includes(section))
}

/**
 * Flip one card. From "all" (null) a flip deselects just that card; from a selection it adds or
 * removes. An empty selection is not a report, and a full one is the default — both collapse to null.
 */
export function toggleModuleScope(scope: ModuleScope, section: ModuleSectionKey): ModuleScope {
  const current = new Set<ModuleSectionKey>(scope ?? MODULE_SECTIONS)
  if (current.has(section)) current.delete(section)
  else current.add(section)
  if (current.size === 0 || current.size === MODULE_SECTIONS.length) return null
  return MODULE_SECTIONS.filter((key) => current.has(key))
}

/** A timeline row or mix bucket stays if it is backbone activity or a card still in scope. */
export function moduleInScope(key: ModuleKey, scope: ModuleScope): boolean {
  if (scope === null) return true
  if (!isModuleSection(key)) return true
  return scope.includes(key)
}

export function scopedTimeline(timeline: TimelineRow[], scope: ModuleScope): TimelineRow[] {
  return scope === null ? timeline : timeline.filter((row) => moduleInScope(row.source, scope))
}

export function scopedByModule(byModule: SplitBucket[], scope: ModuleScope): SplitBucket[] {
  return scope === null ? byModule : byModule.filter((bucket) => moduleInScope(bucket.key as ModuleKey, scope))
}

export function scopeSummary(scope: ModuleScope): string {
  if (scope === null) return `All ${MODULE_SECTIONS.length} modules`
  if (scope.length === 1) return `${MODULE_LABEL[scope[0]]} only`
  return `${scope.length} of ${MODULE_SECTIONS.length} modules`
}