"use client"

import { useMemo, useState } from "react"
import { Activity, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Section, SectionHeading } from "@/components/sections/section"
import {
  BURNOUT_FACTORS,
  burnoutRisk,
  type BurnoutInput,
} from "@/lib/calculations/burnout"
import { roiProjection, formatUsd, type RoiInput } from "@/lib/calculations/roi"

function SliderRow({
  label,
  help,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  label: string
  help?: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  format?: (v: number) => string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <label className="text-sm font-medium">{label}</label>
        <span className="font-mono text-xs text-muted-foreground">
          {format ? format(value) : value}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
      />
      {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
    </div>
  )
}

function BurnoutCalculator() {
  const [input, setInput] = useState<BurnoutInput>({
    workload: 6,
    autonomy: 4,
    unclearAsks: 5,
    afterHours: 3,
    recognitionGap: 4,
  })
  const result = useMemo(() => burnoutRisk(input), [input])

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:gap-12">
      <div className="space-y-6">
        {BURNOUT_FACTORS.map((factor) => (
          <SliderRow
            key={factor.key}
            label={factor.label}
            help={factor.help}
            min={0}
            max={10}
            value={input[factor.key]}
            onChange={(v) => setInput((prev) => ({ ...prev, [factor.key]: v }))}
            format={(v) => (v <= 3 ? "Rarely" : v <= 6 ? "Sometimes" : v <= 8 ? "Often" : "Constantly")}
          />
        ))}
        <p className="text-xs text-muted-foreground">
          Rate each for your team, honestly. 0 = never, 10 = constant.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Burnout pressure
        </p>
        <p className="mt-2 font-display text-5xl font-medium tracking-tight">{result.score}</p>
        <p className="mt-1 text-sm font-medium">{result.band}</p>
        <Progress
          value={result.score}
          className="mt-4"
          aria-label={`Burnout risk score ${result.score} of 100`}
        />
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{result.bandAdvice}</p>
        <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
          Biggest single driver: <span className="font-medium text-foreground">{result.topDriver}</span>.
          In the product this view is built from signals your tools already emit — and it is
          aggregated so no individual answer is ever shown raw.
        </p>
      </div>
    </div>
  )
}

function RoiCalculator() {
  const [input, setInput] = useState<RoiInput>({
    teamSize: 12,
    hourlyCostUsd: 65,
    planningHoursPerWeek: 2,
    overrunRate: 0.3,
    recoveryShare: 0.2,
    pricePerUserMonth: 19,
  })
  const result = useMemo(() => roiProjection(input), [input])

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:gap-12">
      <div className="space-y-6">
        <SliderRow
          label="Team size"
          min={3}
          max={60}
          value={input.teamSize}
          onChange={(teamSize) => setInput((p) => ({ ...p, teamSize }))}
        />
        <SliderRow
          label="Average fully-loaded cost"
          help="Per engineer per hour, incl. overheads."
          min={20}
          max={150}
          value={input.hourlyCostUsd}
          onChange={(hourlyCostUsd) => setInput((p) => ({ ...p, hourlyCostUsd }))}
          format={(v) => `$${v}/h`}
        />
        <SliderRow
          label="Hours lost per person per week"
          help="Estimation churn, replanning, firefighting surprises."
          min={0.5}
          max={8}
          step={0.5}
          value={input.planningHoursPerWeek}
          onChange={(planningHoursPerWeek) => setInput((p) => ({ ...p, planningHoursPerWeek }))}
          format={(v) => `${v}h`}
        />
        <SliderRow
          label="Sprints that historically overrun"
          min={0}
          max={100}
          value={Math.round(input.overrunRate * 100)}
          onChange={(pct) => setInput((p) => ({ ...p, overrunRate: pct / 100 }))}
          format={(v) => `${v}%`}
        />
        <SliderRow
          label="Recovery assumption"
          help="Be sceptical. We default to 20% of lost time recovered — a conservative share."
          min={5}
          max={40}
          step={5}
          value={Math.round(input.recoveryShare * 100)}
          onChange={(pct) => setInput((p) => ({ ...p, recoveryShare: pct / 100 }))}
          format={(v) => `${v}%`}
        />
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Projection for {Math.round(input.teamSize)} engineers
        </p>
        <div className="font-display text-3xl font-medium tracking-tight">
          {formatUsd(result.recoverableUsd + result.overrunSavingsUsd)}
          <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">/ year at stake</span>
        </div>
        <dl className="space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Recovered planning time</dt>
            <dd className="font-mono text-xs">{formatUsd(result.recoverableUsd)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Overrun exposure reduced</dt>
            <dd className="font-mono text-xs">{formatUsd(result.overrunSavingsUsd)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">JiraVision cost (annual billing)</dt>
            <dd className="font-mono text-xs">−{formatUsd(result.annualToolingUsdAnnual)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-2 font-medium">
            <dt>Net first year</dt>
            <dd className={result.netSavingsUsd >= 0 ? "font-mono text-xs" : "font-mono text-xs text-clay"}>
              {result.netSavingsUsd >= 0 ? formatUsd(result.netSavingsUsd) : `−${formatUsd(-result.netSavingsUsd)}`}
            </dd>
          </div>
        </dl>
        <p className="border-t border-border pt-4 text-xs text-muted-foreground">
          {result.paybackWeeks > 0
            ? `Break-even in about ${result.paybackWeeks} week${result.paybackWeeks === 1 ? "" : "s"}.`
            : "At these assumptions the tool doesn't pay for itself — raise the inputs or pick a cheaper plan."}
          A projection on your own numbers, not a promise; assumptions are shown beside every figure.
        </p>
      </div>
    </div>
  )
}

export function CalculatorsDemo() {
  return (
    <Section id="calculators" bg="grid" className="border-y bg-surface">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4 md:mb-14">
        <SectionHeading
          className="mb-0"
          eyebrow="Try the models"
          title="Two calculators we'd rather show than describe"
          intro="Burnout pressure for your team, and an ROI projection with every assumption visible. Both run on your inputs, in this tab."
        />
        <Badge variant="outline" className="hidden md:inline-flex">DEMO</Badge>
      </div>

      <Tabs defaultValue="burnout">
        <TabsList className="mb-8">
          <TabsTrigger value="burnout" className="gap-2">
            <Activity className="h-4 w-4" aria-hidden />
            Burnout-risk check
          </TabsTrigger>
          <TabsTrigger value="roi" className="gap-2">
            <TrendingUp className="h-4 w-4" aria-hidden />
            ROI projection
          </TabsTrigger>
        </TabsList>
        <TabsContent value="burnout">
          <BurnoutCalculator />
        </TabsContent>
        <TabsContent value="roi">
          <RoiCalculator />
        </TabsContent>
      </Tabs>

      <p className="mt-8 text-xs text-muted-foreground">
        Illustrative models for a product demo — not a clinical assessment or a financial instrument.
      </p>
    </Section>
  )
}
