"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Section, SectionHeading } from "@/components/sections/section"
import { pricingTeaser as defaultTeaser, seatModel as defaultSeatModel } from "@/content/home"
import { cn } from "@/lib/utils"

const usd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)

export function PricingSeats({
  pricingTeaser = defaultTeaser,
  seatModel = defaultSeatModel,
}: {
  pricingTeaser?: typeof defaultTeaser
  seatModel?: typeof defaultSeatModel
}) {
  const [seats, setSeats] = useState(seatModel.defaultSeats)
  const [annual, setAnnual] = useState(true)

  const discount = 1 - seatModel.annualDiscountPct / 100

  return (
    <Section id="pricing" bg="inverse" watermark="$">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          className="mb-0"
          eyebrow="Pricing"
          title={pricingTeaser.title}
          intro={pricingTeaser.intro}
        />
        <Badge variant="outline" className="border-primary-foreground/40 text-primary-foreground">
          {seatModel.trialDays}-day trial, no card
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {pricingTeaser.plans.map((plan) => {
          const perUser = seatModel.perUserMonthly[plan.name] ?? 0
          const effective = annual ? perUser * discount : perUser
          return (
            <article
              key={plan.name}
              className={cn(
                "flex flex-col rounded-lg border p-5",
                plan.featured
                  ? "border-primary-foreground/60 bg-primary-foreground/10"
                  : "border-primary-foreground/25",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-display text-lg font-medium">{plan.name}</h3>
                {plan.featured && (
                  <Badge className="bg-primary-foreground text-primary">Most picked</Badge>
                )}
              </div>
              <p className="text-2xl font-medium tracking-tight">
                ${perUser}
                <span className="font-sans text-xs font-normal text-primary-foreground/70">/user/mo</span>
              </p>
              <p className="prose-body mt-3 text-sm">{plan.blurb}</p>
              <p className="mt-auto border-t border-primary-foreground/20 pt-3 font-mono text-xs text-primary-foreground/80">
                {seats} seats → {usd(effective * seats)}/mo {annual ? "(annual)" : "(monthly)"}
              </p>
            </article>
          )
        })}
      </div>

      <div className="mt-8 grid items-center gap-6 rounded-lg border border-primary-foreground/25 p-6 md:grid-cols-[1fr_auto]">
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-4">
            <label htmlFor="jv-seats" className="text-sm font-medium">
              Team size
            </label>
            <span className="font-mono text-sm">{seats} seats</span>
          </div>
          <Slider
            id="jv-seats"
            min={seatModel.minSeats}
            max={seatModel.maxSeats}
            step={1}
            value={[seats]}
            onValueChange={([v]) => setSeats(v)}
            aria-label="Number of seats"
          />
        </div>
        <div
          role="group"
          aria-label="Billing period"
          className="flex overflow-hidden rounded-full border border-primary-foreground/30"
        >
          {[
            { label: "Monthly", value: false },
            { label: `Annual −${seatModel.annualDiscountPct}%`, value: true },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              aria-pressed={annual === opt.value}
              onClick={() => setAnnual(opt.value)}
              className={cn(
                "min-h-[40px] px-4 text-sm transition-colors",
                annual === opt.value
                  ? "bg-primary-foreground text-primary"
                  : "text-primary-foreground hover:bg-primary-foreground/10",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button asChild size="lg" className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90">
          <Link href="/signup">Start free trial</Link>
        </Button>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
        >
          {pricingTeaser.cta.label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </Section>
  )
}
