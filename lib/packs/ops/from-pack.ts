// Derive a pack's operations config from data the pack already owns: its register kinds,
// its method phases and its report template. This is what lets every discipline light up the
// ops surfaces without inventing domain rules we have no source for. The IT technician pack
// carries a hand-authored config built from its workbook instead; this module produces the
// honest baseline for the rest, and omits recommendRules/automationTemplates entirely because
// those assert domain risk logic (backup SLAs, licence expiry) that no other pack has earned.

import type { RolePack } from "../types"
import type { KpiDefinition, LogEntity, OpsConfig } from "./types"

const OPEN_STATUSES = ["Open", "In progress", "Done"]

function registerLogEntity(label: string): LogEntity {
  return {
    label,
    fields: {
      date: { type: "date", required: true, label: "Date" },
      item: { type: "string", required: true, label: "Item" },
      status: { type: "enum", required: true, label: "Status", values: OPEN_STATUSES, default: "Open" },
      note: { type: "text", label: "Note" },
    },
  }
}

/** A query-time count for each register kind: what was logged this month and what is still open. */
function registerKpis(pack: RolePack): KpiDefinition[] {
  return pack.registerKinds.flatMap((kind): KpiDefinition[] => [
    {
      id: `${kind.key}_logged`,
      label: `${kind.label} logged`,
      source: kind.key,
      filter: { date: "in_month" },
      aggregation: "count",
      unit: "entries",
    },
    {
      id: `${kind.key}_open`,
      label: `${kind.label} still open`,
      source: kind.key,
      filter: { status: ["Open", "In progress"] },
      aggregation: "count",
      unit: "open",
    },
  ])
}

/**
 * A config for a pack that has no hand-authored one. Returns null when the pack has no register
 * kinds, because a config with zero log entities cannot be validated and would only mask a
 * broken pack rather than surface it.
 */
export function opsConfigFromPack(pack: RolePack): OpsConfig | null {
  if (pack.registerKinds.length === 0) return null

  const logs: Record<string, LogEntity> = {}
  for (const kind of pack.registerKinds) {
    logs[kind.key] = registerLogEntity(kind.label)
  }

  const lowerTitle = pack.title.toLowerCase()

  return {
    logs,
    kpis: registerKpis(pack),
    playbookSeeds: [
      {
        id: "monthly_review",
        label: `${pack.title} monthly review`,
        frequency: "monthly",
        method: pack.method,
        phases: pack.method.map((phase) => ({
          name: phase,
          steps: [`Review ${lowerTitle} work in the ${phase.toLowerCase()} step`],
        })),
      },
    ],
    reportTemplates: [
      {
        id: "monthly_report",
        label: `${pack.title} monthly report`,
        period: "monthly",
        sections: pack.registerKinds.map((kind) => ({
          kpiId: `${kind.key}_logged`,
          label: `${kind.label} logged`,
        })),
      },
    ],
  }
}
