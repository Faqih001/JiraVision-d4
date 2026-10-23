import Link from "next/link"
import { ArrowRight, CalendarClock, CircleDot, Plug, ShieldCheck, TrendingUp, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Section, SectionHeading, Reveal } from "@/components/sections/section"
import {
  finalCta,
  faqTeaser,
  howItWorks,
  integrations,
  problem,
  pricingTeaser,
  responsibleAi,
} from "@/content/home"

export function ProblemSolution() {
  return (
    <Section className="border-y bg-surface">
      <SectionHeading eyebrow="The problem" title={problem.title} intro={problem.intro} />
      <div className="grid gap-6 md:grid-cols-3">
        {problem.items.map((item, i) => (
          <Reveal key={item.title}>
            <div className="h-full rounded-lg border bg-card p-6 shadow-soft">
              <span className="font-display text-sm text-clay">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

const stepIcons = [Plug, CircleDot, CalendarClock, TrendingUp]

export function HowItWorks() {
  return (
    <Section id={howItWorks.id}>
      <SectionHeading eyebrow="How it works" title={howItWorks.title} intro={howItWorks.intro} />
      <ol className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {howItWorks.steps.map((step, i) => {
          const Icon = stepIcons[i]
          return (
            <Reveal key={step.title} as-child>
              <li className="relative">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold">
                  <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            </Reveal>
          )
        })}
      </ol>
    </Section>
  )
}

export function Integrations() {
  return (
    <Section className="border-y bg-surface">
      <SectionHeading eyebrow="Integrations" title={integrations.title} intro={integrations.intro} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.items.map((item) => (
          <li
            key={item.name}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-soft"
          >
            <div>
              <div className="text-sm font-medium">{item.name}</div>
              <div className="text-xs text-muted-foreground">{item.note}</div>
            </div>
            <span
              className={
                item.status === "live"
                  ? "shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary"
                  : "shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              }
            >
              {item.status}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function ResponsibleAi() {
  return (
    <Section>
      <SectionHeading eyebrow="Trust" title={responsibleAi.title} intro={responsibleAi.intro} />
      <div className="grid gap-6 md:grid-cols-2">
        {responsibleAi.points.map((point) => (
          <Reveal key={point.title}>
            <div className="flex h-full gap-4 rounded-lg border bg-card p-6 shadow-soft">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h3 className="text-base font-semibold">{point.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{point.body}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <Link href={responsibleAi.link.href} className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        {responsibleAi.link.label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Section>
  )
}

export function Outcomes() {
  return (
    <Section className="border-y bg-surface">
      <SectionHeading eyebrow="Results" title={outcomes.title} intro={outcomes.intro} />
      <ul className="grid gap-4 md:grid-cols-3">
        {outcomes.qualitative.map((line) => (
          <li key={line} className="rounded-lg border bg-card p-5 text-sm leading-relaxed shadow-soft">
            {line}
          </li>
        ))}
      </ul>
      {/* PLACEHOLDER stat row: renders only once content/home.ts stats stop being PLACEHOLDER. */}
      {outcomes.stats.some((s) => s.value === "PLACEHOLDER") && (
        <p className="mt-6 text-xs text-muted-foreground">
          Measured outcomes coming soon — we publish numbers only after we can verify them.
        </p>
      )}
    </Section>
  )
}

export function PricingTeaser() {
  return (
    <Section>
      <SectionHeading eyebrow="Pricing" title={pricingTeaser.title} intro={pricingTeaser.intro} className="mx-auto text-center" />
      <div className="grid gap-5 md:grid-cols-3">
        {pricingTeaser.plans.map((plan) => (
          <div
            key={plan.name}
            className={
              "flex flex-col rounded-lg border bg-card p-6 " +
              (plan.featured ? "border-primary shadow-soft-md" : "shadow-soft")
            }
          >
            {plan.featured && (
              <span className="mb-2 self-start rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                Most popular
              </span>
            )}
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{plan.name}</h3>
            <p className="mt-2">
              <span className="font-display text-4xl font-medium">{plan.price}</span>
              <span className="ml-1 text-sm text-muted-foreground">{plan.cadence}</span>
            </p>
            <p className="mt-3 flex-1 text-sm text-muted-foreground">{plan.blurb}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Button asChild variant="outline" size="lg">
          <Link href={pricingTeaser.cta.href}>
            {pricingTeaser.cta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Section>
  )
}

export function FaqMoreLink() {
  return (
    <Link href={faqMoreLink.href} className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
      {faqMoreLink.label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

export function CtaBand() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="container flex flex-col items-start gap-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">{finalCta.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/80 md:text-base">{finalCta.body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
            <Link href={finalCta.primary.href}>
              {finalCta.primary.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
            <Link href={finalCta.secondary.href}>
              <Users className="h-4 w-4" />
              {finalCta.secondary.label}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
