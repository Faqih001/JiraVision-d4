// The rule behind the discipline a work-log form opens with. Kept pure — no db, no next —
// so the ordering is testable and the same answer serves the entry dialog and the
// deliverable dialog. A value outside the 75-discipline vocabulary is never returned: it
// would pre-fill a select whose label lookup gives `undefined` and write a string no
// report can group.

import { getDisciplineForJobTitle } from "@/lib/job-titles"
import { isWorkDiscipline, type WorkDiscipline } from "@/lib/roles"

export type DisciplineSignals = {
  /** The discipline on this member's most recent log row. */
  lastLogged?: string | null
  /** The member's job title, as stored on the user row. */
  jobTitle?: string | null
  /** The single discipline saved at onboarding, or null. */
  onboarding?: string | null
}

function known(value: string | null | undefined): WorkDiscipline | null {
  return isWorkDiscipline(value) ? value : null
}

/**
 * Onboarding used to store every discipline when it could not map the job title, so a long
 * saved list is "no choice made" rather than a preference. Only a one-entry list is a choice.
 */
export function disciplineFromPreferenceList(list: readonly unknown[]): WorkDiscipline | null {
  const entries = list.filter((entry): entry is string => typeof entry === "string")
  if (entries.length !== 1) return null
  return known(entries[0])
}

/**
 * What the member actually logged outranks what they once told us about themselves, which
 * outranks their job title. Nothing is invented when all three are missing or unusable: an
 * unclassified draft is honest, a wrong default is not.
 */
export function resolveDisciplineDefault(signals: DisciplineSignals): WorkDiscipline | null {
  const lastLogged = known(signals.lastLogged)
  if (lastLogged) return lastLogged

  const fromJobTitle = known(getDisciplineForJobTitle(signals.jobTitle ?? null))
  if (fromJobTitle) return fromJobTitle

  return known(signals.onboarding)
}
