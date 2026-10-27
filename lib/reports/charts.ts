// The data behind the report's charts, kept out of JSX on purpose: a bar chart is the easiest
// place in a report to say something the work log does not support, so the measure each chart is
// drawn from, the colour of each bucket and the behaviour of an unmapped bucket are tested here.
//
// Pure — it reads a ReportAggregate and never a database.

import { DISCIPLINE_COLOUR } from "@/lib/roles"
import type { ReportAggregate } from "@/lib/reports/aggregate"
import type { ChartKey } from "@/lib/reports/templates"
import { KIND_COLOUR, formatMinutes } from "@/lib/worklog/entries"

export type ChartDatum = {
  key: string
  label: string
  /** The bar's height: minutes for the time charts, a count for the task charts. */
  value: number
  /** What the tooltip and the drill-down print beside it, already in the right unit. */
  display: string
  fill: string
  refs: string[]
}

const token = (name: string): string => `hsl(var(--chart-${name}))`

/**
 * A bucket outside the maps below gets this rather than `undefined`, which recharts paints black:
 * an unmapped bucket is a naming gap, not a reason to hide a bar.
 */
export const FALLBACK_FILL = "hsl(var(--muted-foreground))"

/**
 * Which measure each chart is drawn from, so the axis label, the tooltip unit and the bar itself
 * can never disagree. `CHART_LABEL` names the chart; this says what its numbers mean.
 */
export const CHART_UNIT: Record<ChartKey, "time" | "count"> = {
  discipline: "time",
  kind: "time",
  series: "time",
  taskStatus: "count",
  priority: "count",
}

/**
 * Mirrors `STATUS_COLOR` and `PRIORITY_COLOR` in `components/dashboard-kit.tsx:22-35`, repeated
 * here because `lib/` may not import a client component. The keys are the four `TaskBucketName`s
 * (which is what `byTaskStatus` is split by) and the app's four priorities plus the `none` the
 * aggregate invents for a task with no priority.
 */
export const TASK_BUCKET_FILL: Record<string, string> = {
  completed: token("pine"),
  in_progress: token("moss"),
  blocked: "hsl(var(--destructive))",
  other: token("stone"),
}

export const PRIORITY_FILL: Record<string, string> = {
  urgent: "hsl(var(--destructive))",
  high: token("clay"),
  medium: token("moss"),
  low: token("stone"),
  none: token("slate"),
}

// Spread copies, so an arbitrary bucket key can be looked up without casting it to a union it is
// not provably a member of.
const DISCIPLINE_FILL: Record<string, string> = { ...DISCIPLINE_COLOUR }
const KIND_FILL: Record<string, string> = { ...KIND_COLOUR }

function timeDatum(
  key: string,
  label: string,
  value: number,
  refs: string[],
  fill: string,
): ChartDatum {
  return { key, label, value, display: formatMinutes(value), fill, refs }
}

function countDatum(
  key: string,
  label: string,
  value: number,
  refs: string[],
  fill: string,
): ChartDatum {
  return { key, label, value, display: String(value), fill, refs }
}

export function chartRows(aggregate: ReportAggregate, chart: ChartKey): ChartDatum[] {
  switch (chart) {
    case "discipline":
      return aggregate.byDiscipline.map((bucket) =>
        timeDatum(
          bucket.key,
          bucket.label,
          bucket.minutes.value,
          bucket.minutes.refs,
          DISCIPLINE_FILL[bucket.key] ?? FALLBACK_FILL,
        ),
      )
    case "kind":
      return aggregate.byKind.map((bucket) =>
        timeDatum(
          bucket.key,
          bucket.label,
          bucket.minutes.value,
          bucket.minutes.refs,
          KIND_FILL[bucket.key] ?? FALLBACK_FILL,
        ),
      )
    case "series":
      // Every bucket, including the zero ones: a day with entries but no recorded minutes is the
      // gap the recipient is being told about, and dropping it would draw the quiet days out.
      return aggregate.series.map((bucket) =>
        timeDatum(bucket.key, bucket.label, bucket.minutes.value, bucket.minutes.refs, token("pine")),
      )
    case "taskStatus":
      return aggregate.byTaskStatus.map((bucket) =>
        countDatum(
          bucket.key,
          bucket.label,
          bucket.count.value,
          bucket.count.refs,
          TASK_BUCKET_FILL[bucket.key] ?? FALLBACK_FILL,
        ),
      )
    case "priority":
      return aggregate.byPriority.map((bucket) =>
        countDatum(
          bucket.key,
          bucket.label,
          bucket.count.value,
          bucket.count.refs,
          PRIORITY_FILL[bucket.key] ?? FALLBACK_FILL,
        ),
      )
    default:
      // `TEMPLATE_CHARTS` can only hold declared keys, so reaching this means a chart was added
      // without data for it. A thrown error in a preview route is better than a blank card.
      throw new Error(`no chart data for ${String(chart)}`)
  }
}
