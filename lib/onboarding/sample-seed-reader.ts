// Reads a discipline's seed JSON from public/files/disciplines/ and returns the
// structured preview data the onboarding wizard shows. The JSON files are the same
// content the ops seed script uses — nothing is invented here.
//
// The reader is synchronous because the files are small (5-30 KB each) and shipped
// with the build. A missing or malformed file returns null so the caller can fall
// back to the generic sample.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { WorkDiscipline } from "@/lib/roles"

export type SeedRegisterItem = {
  kind: string
  title: string
  fields: Record<string, string>
}

export type SeedPlaybookItem = {
  key: string
  title: string
  frequency: string
  stepCount: number
  source: string
}

export type SeedTaskTemplate = {
  title: string
  frequency: string
}

export type SeedKpi = {
  id: string
  label: string
  source: string
}

export type DisciplineSeedPreview = {
  discipline: {
    key: string
    label: string
    category: string
    focus: string
  }
  pack: {
    key: string
    registerKinds: string[]
    reportTemplate: string
  }
  method: string[]
  registers: SeedRegisterItem[]
  playbooks: SeedPlaybookItem[]
  tasks: SeedTaskTemplate[]
  kpis: SeedKpi[]
  needsConfirmation: string[]
}

/**
 * Load the seed JSON for a discipline. Returns null if the file is missing or
 * does not parse — the caller falls back to the generic sample.
 */
export function loadDisciplineSeed(discipline: WorkDiscipline | null): DisciplineSeedPreview | null {
  if (!discipline) return null

  try {
    const filePath = resolve(process.cwd(), "public", "files", "disciplines", `${discipline}.json`)
    const raw = readFileSync(filePath, "utf8")
    const json = JSON.parse(raw) as Record<string, unknown>

    if (json.schemaVersion !== 1) return null

    const d = json.discipline as Record<string, string> | undefined
    const p = json.pack as Record<string, unknown> | undefined
    const m = json.method as Record<string, unknown> | undefined
    const s = json.surfaces as Record<string, unknown> | undefined
    if (!d || !p || !s) return null

    const registers = extractRegisters(s)
    const playbooks = extractPlaybooks(s)
    const tasks = extractTasks(s)
    const kpis = extractKpis(s)
    const methodSeq = m?.documentedSequence
    const method = Array.isArray(methodSeq) ? methodSeq.filter((v): v is string => typeof v === "string") : []

    return {
      discipline: {
        key: d.key ?? discipline,
        label: d.label ?? discipline,
        category: d.category ?? "",
        focus: d.focus ?? "",
      },
      pack: {
        key: (p.key as string) ?? "",
        registerKinds: Array.isArray(p.registerKinds) ? p.registerKinds.filter((v): v is string => typeof v === "string") : [],
        reportTemplate: (p.reportTemplate as string) ?? "",
      },
      method,
      registers,
      playbooks,
      tasks,
      kpis,
      needsConfirmation: Array.isArray(json.needsConfirmation)
        ? json.needsConfirmation.filter((v): v is string => typeof v === "string")
        : [],
    }
  } catch {
    return null
  }
}

function extractRegisters(surfaces: Record<string, unknown>): SeedRegisterItem[] {
  const regs = surfaces.registers as Record<string, unknown> | undefined
  if (!regs) return []
  const seedRows = regs.seedRows
  if (!Array.isArray(seedRows)) return []
  return seedRows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row) => ({
      kind: typeof row.kind === "string" ? row.kind : "",
      title: typeof row.title === "string" ? row.title : "",
      fields:
        row.fields && typeof row.fields === "object" && !Array.isArray(row.fields)
          ? Object.fromEntries(
              Object.entries(row.fields as Record<string, unknown>).map(([k, v]) => [k, String(v ?? "")]),
            )
          : {},
    }))
}

function extractPlaybooks(surfaces: Record<string, unknown>): SeedPlaybookItem[] {
  const pbs = surfaces.playbooks as Record<string, unknown> | undefined
  if (!pbs) return []
  const seeds = pbs.seeds
  if (!Array.isArray(seeds)) return []
  return seeds
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => {
      const phases = s.phases
      const stepCount = Array.isArray(phases)
        ? phases.reduce((acc, p) => {
            const steps = (p as Record<string, unknown>)?.steps
            return acc + (Array.isArray(steps) ? steps.length : 0)
          }, 0)
        : 0
      return {
        key: typeof s.key === "string" ? s.key : "",
        title: typeof s.title === "string" ? s.title : "",
        frequency: typeof s.frequency === "string" ? s.frequency : "as_needed",
        stepCount,
        source: typeof s.source === "string" ? s.source : "",
      }
    })
}

function extractTasks(surfaces: Record<string, unknown>): SeedTaskTemplate[] {
  const t = surfaces.tasks as Record<string, unknown> | undefined
  if (!t) return []
  const templates = t.recurringTemplates
  if (!Array.isArray(templates)) return []
  return templates
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      title: typeof item.title === "string" ? item.title : "",
      frequency: typeof item.frequency === "string" ? item.frequency : "",
    }))
}

function extractKpis(surfaces: Record<string, unknown>): SeedKpi[] {
  const overview = surfaces.overview as Record<string, unknown> | undefined
  if (!overview) return []
  const kpis = overview.kpis
  if (!Array.isArray(kpis)) return []
  return kpis
    .filter((k): k is Record<string, unknown> => !!k && typeof k === "object")
    .map((k) => ({
      id: typeof k.id === "string" ? k.id : "",
      label: typeof k.label === "string" ? k.label : "",
      source: typeof k.source === "string" ? k.source : "",
    }))
}
