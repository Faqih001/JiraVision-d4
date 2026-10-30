// The onboarding "sample project" is one draft plan with three starter items. The old
// version hard-coded an IT-support project for everyone; this derives a tailored sample
// from the role pack that already claims the member's discipline, so each of the 75
// disciplines shows its own first-week plan. Everything here is authored data (labels,
// methods, register kinds) from lib/packs/seed.ts — nothing is invented, and no operational
// metric is fabricated. A member who wants their own scope still uses the import step.

import { DISCIPLINE_LABEL, type WorkDiscipline } from "@/lib/roles"
import { GENERAL_PACK, SEED_PACKS } from "@/lib/packs/seed"
import { getMethodForDiscipline, type RolePack } from "@/lib/packs/types"

export type SampleItem = { title: string; description: string }

export type DisciplineSample = {
  discipline: WorkDiscipline | null
  title: string
  summary: string
  method: string[]
  items: SampleItem[]
}

/** The pack that owns a discipline; an unknown or unset discipline falls back to `general`. */
function packFor(discipline: WorkDiscipline | null): RolePack {
  if (!discipline) return GENERAL_PACK
  return SEED_PACKS.find((pack) => pack.disciplines.includes(discipline)) ?? GENERAL_PACK
}

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

/**
 * A first-week draft for one discipline: name what you keep, work one thing through your
 * method, and leave a handover note. The method and register kind come straight from the
 * pack, so the preview is the same content the plan is actually written with.
 */
export function sampleForDiscipline(discipline: WorkDiscipline | null): DisciplineSample {
  const pack = packFor(discipline)
  const method = getMethodForDiscipline(pack, discipline)
  const label = discipline ? DISCIPLINE_LABEL[discipline] : "your role"
  const register = pack.registerKinds[0]?.label ?? "Responsibilities"

  const items: SampleItem[] = [
    {
      title: `Add what you keep under ${register}`,
      description: `Name the ${register.toLowerCase()} you are responsible for, so the work lives here and not only in your head.`,
    },
    {
      title: `Work one task through: ${method.join(" → ")}`,
      description: "Take a single real piece of work through your role's steps and note where each one lands.",
    },
    {
      title: "Write a short handover note",
      description: `One paragraph on your ${lower(label)} work that a colleague could pick up and act on.`,
    },
  ]

  return {
    discipline,
    title: `Sample project — a first week in ${label}`,
    summary: `A labelled draft with three starter items, built around the ${pack.title.toLowerCase()} way of working. Nothing here creates tasks.`,
    method,
    items,
  }
}
