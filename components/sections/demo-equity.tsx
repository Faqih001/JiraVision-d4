"use client"

import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Section, SectionHeading } from "@/components/sections/section"
import {
  buildMetricInsight,
  equityEngineers,
  formatMetricNumber,
  isMetricKey,
  metricDefinition,
  metricDefinitions,
  teamMean,
  type MetricKey,
  type WatchedEngineer,
} from "@/content/equity-demo"

interface ChartBar {
  name: string
  /** Category-axis label; flagged engineers also carry a "*" so meaning isn't color-only. */
  label: string
  value: number
  flagged: boolean
}

export function EquityExplorer() {
  const [metric, setMetric] = useState<MetricKey>("sprintPoints")
  const [whyOpen, setWhyOpen] = useState(false)

  const def = metricDefinition(metric)
  const insight = useMemo(() => buildMetricInsight(metric), [metric])
  const mean = useMemo(() => teamMean(metric), [metric])

  const watchedNames = useMemo(
    () => new Set(insight.watched.map((entry: WatchedEngineer) => entry.engineer.name)),
    [insight],
  )

  const chartData = useMemo<ChartBar[]>(
    () =>
      equityEngineers.map((engineer) => {
        const flagged = watchedNames.has(engineer.name)
        return {
          name: engineer.name,
          label: flagged ? `${engineer.name} *` : engineer.name,
          value: engineer[def.field],
          flagged,
        }
      }),
    [def, watchedNames],
  )

  const chartConfig = {
    value: { label: def.chartLabel, color: "hsl(var(--chart-pine))" },
    watch: { label: "Past watch threshold", color: "hsl(var(--chart-clay))" },
    mean: { label: "Team mean", color: "hsl(var(--chart-stone))" },
  } satisfies ChartConfig

  const handleMetricChange = (value: string) => {
    if (isMetricKey(value)) setMetric(value)
  }

  return (
    <Section id="equity" bg="band-sage">
      <div className="mx-auto max-w-3xl">
        <Badge variant="outline" className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]">
          Demo data
        </Badge>
        <SectionHeading
          eyebrow="Ethical metrics"
          title="Workload & equity explorer"
          intro="Which engineer is quietly overloaded? Switch metrics and watch the same six-person team through four lenses."
          className="mb-3"
        />
        <p className="mb-8 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Synthetic numbers. The point is the pattern: every metric here opens to show exactly how it's calculated.
        </p>

        <div className="rounded-lg border bg-card p-5 shadow-soft md:p-6">
          <Tabs value={metric} onValueChange={handleMetricChange}>
            <TabsList className="flex w-full flex-wrap justify-start">
              {metricDefinitions.map((option) => (
                <TabsTrigger key={option.key} value={option.key} className="text-xs">
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-5">
            <ChartContainer config={chartConfig} className="h-64 w-full md:h-72">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(tick: number) => formatMetricNumber(metric, tick)}
                />
                <YAxis type="category" dataKey="label" width={104} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
                <ReferenceLine
                  x={mean}
                  stroke="var(--color-mean)"
                  strokeDasharray="4 3"
                  label={{
                    value: `Team mean ${formatMetricNumber(metric, mean)}`,
                    position: "top",
                    fontSize: 11,
                    fill: "var(--color-mean)",
                  }}
                />
                <Bar dataKey="value" name="value" radius={[0, 2, 2, 0]} barSize={16}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.flagged ? "var(--color-watch)" : "var(--color-value)"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-chart-pine" aria-hidden="true" />
              Within watch band
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-chart-clay" aria-hidden="true" />
              Past watch threshold (marked *)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t border-dashed border-chart-stone" aria-hidden="true" />
              Team mean
            </span>
          </div>

          <p aria-live="polite" className="mt-4 rounded-md bg-muted/60 px-3 py-2 text-xs leading-relaxed">
            {insight.headline} <span className="text-muted-foreground">({insight.thresholdDescription}.)</span>
          </p>

          <div className="mt-5 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={whyOpen}
              aria-controls="equity-why-panel"
              onClick={() => setWhyOpen((open) => !open)}
            >
              {whyOpen ? (
                <ChevronUp className="size-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-3.5" aria-hidden="true" />
              )}
              Why this number?
            </Button>
            {/* Rows trick keeps the disclosure animated without JS timers; hidden from AT when collapsed. */}
            <div
              id="equity-why-panel"
              aria-hidden={!whyOpen}
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                whyOpen ? "mt-3 grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <dl className="space-y-3 rounded-md bg-muted/50 px-4 py-3 text-xs leading-relaxed">
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">Formula</dt>
                    <dd className="mt-0.5 font-mono text-foreground">{def.why.formula}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">Data source</dt>
                    <dd className="mt-0.5 text-foreground">{def.why.source}</dd>
                  </div>
                  <div className="flex items-start gap-2 pt-1 text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-chart-pine" aria-hidden="true" />
                    <span>{def.why.guardrail}</span>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Visible semantic table: same numbers, text-accessible. */}
        <div className="mt-6 overflow-x-auto rounded-lg border bg-card p-4 shadow-soft md:p-5">
          <table className="w-full min-w-[520px] text-xs">
            <caption className="mb-2 text-left text-xs text-muted-foreground">
              Synthetic demo dataset — six anonymised engineers. Active metric: {def.chartLabel} ·{" "}
              {insight.thresholdDescription.toLowerCase()}.
            </caption>
            <thead>
              <tr className="border-b text-left">
                <th scope="col" className="py-1.5 pr-3 font-semibold">
                  Engineer
                </th>
                <th scope="col" className="py-1.5 pr-3 font-semibold">
                  Band
                </th>
                {metricDefinitions.map((option) => (
                  <th
                    key={option.key}
                    scope="col"
                    className={cn("py-1.5 pr-3 font-semibold", option.key === metric && "text-foreground underline underline-offset-4")}
                  >
                    {option.chartLabel}
                    <span className="block font-normal text-muted-foreground">{option.unit}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equityEngineers.map((engineer) => {
                const flaggedHere = watchedNames.has(engineer.name)
                return (
                  <tr key={engineer.id} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="py-1.5 pr-3 font-medium">
                      {engineer.name}
                      {flaggedHere && (
                        <span className="ml-1.5 text-clay" title="Past the watch threshold for the active metric">
                          watch *
                        </span>
                      )}
                    </th>
                    <td className="py-1.5 pr-3 text-muted-foreground">{engineer.roleBand}</td>
                    {metricDefinitions.map((option) => (
                      <td key={option.key} className="py-1.5 pr-3 tabular-nums">
                        {formatMetricNumber(option.key, engineer[option.field])}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  )
}
