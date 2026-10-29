// A role pack is data: what a person is the keeper of, separated from the discipline that
// says how their work is judged. Nothing here imports the database, so a pack resolved from
// an admin-authored row and a pack resolved from the seed are read by the same code.

import type { WorkDiscipline } from "@/lib/roles"

export type RegisterKind = { key: string; label: string }

export type RolePack = {
  packKey: string
  title: string
  disciplines: WorkDiscipline[]
  registerKinds: RegisterKind[]
  sections: string[]
  reportTemplate: string | null
  ladderDiscipline: WorkDiscipline | null
  onboarding: string[]
  method: string[]
  methods?: Partial<Record<WorkDiscipline, string[]>>
  isActive: boolean
}

// The dashboard sections a pack may order. Unknown ids are kept rather than dropped, so a
// pack authored ahead of its section renders its raw key instead of disappearing.
export const DASHBOARD_SECTIONS = [
  { key: "today", label: "Today" },
  { key: "registers", label: "Registers" },
  { key: "tasks", label: "Tasks" },
  { key: "worklog", label: "Work log" },
  { key: "reports", label: "Work reports" },
  { key: "career", label: "Career" },
] as const

export const SECTION_LABEL: Record<string, string> = Object.fromEntries(
  DASHBOARD_SECTIONS.map((section) => [section.key, section.label]),
)

export function sectionLabel(key: string): string {
  return SECTION_LABEL[key] ?? key
}

/**
 * Get the method for a specific discipline from a role pack.
 * Falls back to the pack's default method if no discipline-specific method is defined.
 */
export function getMethodForDiscipline(pack: RolePack, discipline: WorkDiscipline | null): string[] {
  if (discipline && pack.methods && pack.methods[discipline]) {
    return pack.methods[discipline]!
  }
  return pack.method
}
