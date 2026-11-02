// The onboarding "sample project" is a draft plan tailored to the member's discipline.
// The old version generated three generic items from the pack module; this version reads
// the discipline's seed JSON from public/files/disciplines/ and derives plan items from
// the actual register rows, playbook seeds, task templates and KPIs defined there.
//
// The preview data (the full seed content) is returned alongside the plan items so the
// wizard can show a rich preview — register cards, playbook cards, task list, KPI badges
// — similar to the agent dashboard's preview approach.
//
// If the JSON file is missing or malformed, the function falls back to the generic
// three-item sample so onboarding never breaks.

import { DISCIPLINE_LABEL, type WorkDiscipline } from "@/lib/roles"
import { GENERAL_PACK, SEED_PACKS } from "@/lib/packs/seed"
import { getMethodForDiscipline, type RolePack } from "@/lib/packs/types"
import { loadDisciplineSeed, type DisciplineSeedPreview } from "./sample-seed-reader"

export type SampleItem = { title: string; description: string }

export type DisciplineSample = {
  discipline: WorkDiscipline | null
  title: string
  summary: string
  method: string[]
  items: SampleItem[]
  seed: DisciplineSeedPreview | null
}

/** The pack that owns a discipline; an unknown or unset discipline falls back to `general`. */
function packFor(discipline: WorkDiscipline | null): RolePack {
  if (!discipline) return GENERAL_PACK
  return SEED_PACKS.find((pack) => pack.disciplines.includes(discipline)) ?? GENERAL_PACK
}

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

/**
 * A first-week draft for one discipline. If the seed JSON exists, the items are derived
 * from the actual register rows, playbook seeds, task templates and KPIs defined there.
 * Otherwise, falls back to the generic three-item sample.
 */
export function sampleForDiscipline(discipline: WorkDiscipline | null): DisciplineSample {
  const seed = loadDisciplineSeed(discipline)

  if (seed) {
    return sampleFromSeed(discipline, seed)
  }

  return sampleFromPack(discipline)
}

/**
 * Derive a sample from the discipline's seed JSON. The plan items are a curated subset:
 * - Up to 3 register items (one per kind, from the seed rows)
 * - Up to 2 playbook items (the first two playbook seeds)
 * - Up to 3 task items (the first three recurring templates)
 * - 1 KPI configuration item (the first KPI)
 *
 * This gives ~7-9 items, a manageable first-week scope.
 */
function sampleFromSeed(discipline: WorkDiscipline | null, seed: DisciplineSeedPreview): DisciplineSample {
  const label = discipline ? DISCIPLINE_LABEL[discipline] : "your role"
  const items: SampleItem[] = []

  // Register items: one per kind, up to 3
  const registerKinds = seed.pack.registerKinds.slice(0, 3)
  for (const kind of registerKinds) {
    const row = seed.registers.find((r) => r.kind === kind)
    if (row) {
      items.push({
        title: `Set up ${kind} register: ${row.title}`,
        description: `Add the ${kind.toLowerCase()} row "${row.title}" to your register so the work lives here and not only in your head.`,
      })
    } else {
      items.push({
        title: `Set up ${kind} register`,
        description: `Name the ${kind.toLowerCase()} items you are responsible for.`,
      })
    }
  }

  // Playbook items: up to 2
  const playbookSeeds = seed.playbooks.slice(0, 2)
  for (const pb of playbookSeeds) {
    items.push({
      title: `Review the ${pb.title} procedure`,
      description: pb.stepCount > 0
        ? `A ${pb.stepCount}-step procedure from the seed. Walk through it once to confirm it matches how you actually work.`
        : `A procedure from the seed. Walk through it to confirm it matches how you actually work.`,
    })
  }

  // Task items: up to 3 (mix of daily/weekly)
  const taskTemplates = seed.tasks.slice(0, 3)
  for (const task of taskTemplates) {
    items.push({
      title: `Set up recurring: ${task.title}`,
      description: `A ${task.frequency} task from the seed. Confirm the frequency and assign it to your week.`,
    })
  }

  // KPI item: 1
  if (seed.kpis.length > 0) {
    const kpi = seed.kpis[0]
    items.push({
      title: `Configure ${kpi.label} tracking`,
      description: `The first KPI from the seed. Confirm the source and agree on a target with your admin.`,
    })
  }

  // Fallback: if no items were generated, add a generic one
  if (items.length === 0) {
    items.push({
      title: `Review your ${label} setup`,
      description: "Walk through the seed data and confirm the registers, playbooks and tasks match your reality.",
    })
  }

  return {
    discipline,
    title: `Sample project — a first week in ${label}`,
    summary: `A labelled draft with ${items.length} starter items, built from the ${seed.pack.key} seed data. Nothing here creates tasks.`,
    method: seed.method,
    items,
    seed,
  }
}

/**
 * Fallback: the generic three-item sample from the pack module. Used when the seed JSON
 * is missing or malformed.
 */
function sampleFromPack(discipline: WorkDiscipline | null): DisciplineSample {
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
    seed: null,
  }
}
