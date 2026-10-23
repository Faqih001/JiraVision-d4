"use client"

// Client island for /pricing: the interactive plan cards (seat slider +
// monthly/annual toggle) and the cost-vs-recovered-time estimator. Prices come
// from seatModel (content/home.ts) — the single source of truth.

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowRight, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Section, SectionHeading } from "@/components/sections/section"
import { seatModel } from "@/content/home"
import { planCards } from "@/content/pricing-page"
import { roiProjection, formatUsd, type RoiInput } from "@/lib/calculations/roi"
import { cn } from "@/lib/utils"

const usd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)

const usdExact = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v)

function BillingToggle({ annual, onChange }: { annual: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      role="group"
      aria-label="Billing period"
      className="flex overflow-hidden rounded-full border"
    >
      {[
        { label: "Monthly", value: false },
        { label: `Annual −${seatModel.annualDiscountPct}%`, value: true },
      ].map((opt) => (
        <button
          key={opt.label}
          type="button"
          aria-pressed={annual === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "min-h-[40px] px-4 text-sm transition-colors",
            annual === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-muted",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function PricingPlans() {
  const [seats, setSeats] = useState(seatModel.defaultSeats)
  const [annual, setAnnual] = useState(true)
  const discount = 1 - seatModel.annualDiscountPct / 100

  return (
    <Section id="plans" bg="grid">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          className="mb-0"
          eyebrow="Plans"
          title="Move the slider, see your bill"
          intro="Pick a seat count and a billing period; every total below updates in place. Self-serve covers 5–100 seats — beyond that, talk to us."
        />
        <Badge variant="outline">{seatModel.trialDays}-day trial, no card</Badge>
      </div>

      <div className="mb-8 grid items-center gap-6 rounded-lg border bg-card p-6 shadow-soft md:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <label htmlFor="pricing-seats" className="text-sm font-medium">
              Team size
            </label>
            <span className="font-mono text-sm">{seats} seats</span>
          </div>
          <Slider
            id="pricing-seats"
            min={seatModel.minSeats}
            max={seatModel.maxSeats}
            step={1}
            value={[seats]}
            onValueChange={([v]) => setSeats(v ?? seatModel.defaultSeats)}
            aria-label="Number of seats"
          />
        </div>
        <BillingToggle annual={annual} onChange={setAnnual} />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {planCards.map((plan) => {
          const perUser = seatModel.perUserMonthly[plan.name] ?? 0
          const effective = annual ? perUser * discount : perUser
          return (
            <article
              key={plan.name}
              className={cn(
                "flex flex-col rounded-lg border bg-card p-6 shadow-soft",
                plan.featured && "border-primary ring-1 ring-primary/30",
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-display text-xl font-medium tracking-tight">{plan.name}</h3>
                {plan.featured && <Badge>Most picked</Badge>}
              </div>
              <p className="font-display text-3xl font-medium tracking-tight">
                {usdExact(effective)}
                <span className="font-sans text-xs font-normal text-muted-foreground">/user/mo</span>
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {annual ? `list $${perUser}, ${seatModel.annualDiscountPct}% annual off` : "billed monthly, cancel anytime"}
              </p>
              <p className="prose-body mt-3 text-sm">{plan.blurb}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-border pt-4 font-mono text-xs text-muted-foreground">
                {seats} seats → {usd(effective * seats)}/mo · {usd(effective * seats * 12)}/yr {annual ? "(annual)" : "(monthly)"}
              </p>
              <div className="mt-4">
                <Button
                  asChild
                  className="w-full rounded-full"
                  variant={plan.featured ? "default" : "outline"}
                >
                  <Link href={plan.cta.href}>{plan.cta.label}</Link>
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
        <Link
          href="#compare"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          Compare every feature row by row
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link href="#estimator" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
          Model the payback on your numbers
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link href="/login" className="text-muted-foreground hover:text-foreground hover:underline">
          Already a customer? Manage seats in your account
        </Link>
      </div>
    </Section>
  )
}

function EstimatorSlider({
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
        <span className="font-mono text-xs text-muted-foreground">{format ? format(value) : value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v ?? min)}
        aria-label={label}
      />
      {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
    </div>
  )
}

export function CostVsTimeEstimator() {
  const [planName, setPlanName] = useState<"Starter" | "Professional" | "Enterprise">("Professional")
  const [input, setInput] = useState<RoiInput>({
    teamSize: seatModel.defaultSeats,
    hourlyCostUsd: 65,
    planningHoursPerWeek: 2,
    overrunRate: 0.3,
    recoveryShare: 0.2,
    pricePerUserMonth: seatModel.perUserMonthly.Professional ?? 19,
  })

  const result = useMemo(() => roiProjection(input), [input])

  const pickPlan = (name: "Starter" | "Professional" | "Enterprise") => {
    setPlanName(name)
    const price = seatModel.perUserMonthly[name] ?? 0
    setInput((p) => ({ ...p, pricePerUserMonth: price }))
  }

  return (
    <Section id="estimator" bg="hatch">
      <SectionHeading
        eyebrow="Estimator"
        title="Cost vs recovered time"
        intro="Your seat count, your hourly cost, one of the three real plan prices. Every assumption is visible and adjustable — the maths runs live in your browser."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:gap-12">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium">Plan price</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Plan">
              {(["Starter", "Professional", "Enterprise"] as const).map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={planName === name}
                  onClick={() => pickPlan(name)}
                  className={cn(
                    "min-h-[40px] rounded-full border px-4 text-sm transition-colors",
                    planName === name
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {name} · ${seatModel.perUserMonthly[name]}/user/mo
                </button>
              ))}
            </div>
          </div>
          <EstimatorSlider
            label="Team size"
            min={seatModel.minSeats}
            max={seatModel.maxSeats}
            value={input.teamSize}
            onChange={(teamSize) => setInput((p) => ({ ...p, teamSize }))}
            format={(v) => `${v} seats`}
          />
          <EstimatorSlider
            label="Average fully-loaded cost"
            help="Per engineer per hour, incl. overheads."
            min={20}
            max={150}
            value={input.hourlyCostUsd}
            onChange={(hourlyCostUsd) => setInput((p) => ({ ...p, hourlyCostUsd }))}
            format={(v) => `$${v}/h`}
          />
          <EstimatorSlider
            label="Hours lost per person per week"
            help="Estimation churn, replanning, firefighting surprises."
            min={0.5}
            max={8}
            step={0.5}
            value={input.planningHoursPerWeek}
            onChange={(planningHoursPerWeek) => setInput((p) => ({ ...p, planningHoursPerWeek }))}
            format={(v) => `${v}h`}
          />
          <EstimatorSlider
            label="Sprints that historically overrun"
            min={0}
            max={100}
            value={Math.round(input.overrunRate * 100)}
            onChange={(pct) => setInput((p) => ({ ...p, overrunRate: pct / 100 }))}
            format={(v) => `${v}%`}
          />
          <EstimatorSlider
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

        <div className="space-y-4 self-start rounded-lg border bg-card p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {planName} for {Math.round(input.teamSize)} engineers
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
              <dt className="text-muted-foreground">JiraVision cost (monthly billing)</dt>
              <dd className="font-mono text-xs">−{formatUsd(result.annualToolingUsd)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">JiraVision cost (annual, −{seatModel.annualDiscountPct}%)</dt>
              <dd className="font-mono text-xs">−{formatUsd(result.annualToolingUsdAnnual)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2 font-medium">
              <dt>Net first year (annual billing)</dt>
              <dd className={cn("font-mono text-xs", result.netSavingsUsd < 0 && "text-clay")}>
                {result.netSavingsUsd >= 0 ? formatUsd(result.netSavingsUsd) : `−${formatUsd(-result.netSavingsUsd)}`}
              </dd>
            </div>
          </dl>
          <p className="border-t border-border pt-4 text-xs text-muted-foreground">
            {result.paybackWeeks > 0
              ? `Break-even in about ${result.paybackWeeks} week${result.paybackWeeks === 1 ? "" : "s"}.`
              : "At these assumptions the tool doesn't pay for itself — that's a real answer, not a fallback."}
          </p>
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <Button asChild size="sm" className="rounded-full">
              <Link href="/signup">Test it for {seatModel.trialDays} days</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href="/contact">Talk to us about volume</Link>
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Illustrative model for a pricing demo — not a financial instrument. Assumptions live in the
        sliders; change them and the projection changes with you.
      </p>
    </Section>
  )
}
