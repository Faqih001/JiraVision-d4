// The discipline the work-log forms open with for the signed-in member. A convenience read:
// it costs one indexed query on a page load, so a failure here falls back to the signals we
// already have on the user row rather than breaking the page or refusing to render the dialog.

import { and, desc, eq, isNotNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { workLogEntries } from "@/drizzle/schema"
import type { WorkDiscipline } from "@/lib/roles"
import { workDisciplinesOf } from "@/lib/registers/read"
import type { SessionUser } from "@/lib/session"
import { disciplineFromPreferenceList, resolveDisciplineDefault } from "./discipline-default"

/** The discipline from this member's newest log row that carries one. */
async function lastLoggedDiscipline(userId: number): Promise<string | null> {
  const [row] = await db
    .select({ discipline: workLogEntries.discipline })
    .from(workLogEntries)
    .where(and(eq(workLogEntries.userId, userId), isNotNull(workLogEntries.discipline)))
    .orderBy(desc(workLogEntries.workedOn), desc(workLogEntries.id))
    .limit(1)
  return row?.discipline ?? null
}

export async function memberDisciplineDefault(user: SessionUser): Promise<WorkDiscipline | null> {
  let lastLogged: string | null = null
  try {
    lastLogged = await lastLoggedDiscipline(user.id)
  } catch (error) {
    console.error("[worklog] discipline default read failed", (error as Error).message)
  }
  return resolveDisciplineDefault({
    lastLogged,
    jobTitle: user.jobTitle,
    onboarding: disciplineFromPreferenceList(workDisciplinesOf(user)),
  })
}
