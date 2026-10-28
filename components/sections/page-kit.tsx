// Reusable section builders for the v2 marketing pages (products, pricing,
// about, solutions). Compose these with data from /content — no page should
// hand-roll a new layout when one of these fits.
import Link from "next/link"
import Image from "next/image"
import type { ReactNode } from "react"
import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Section, SectionHeading, Reveal } from "@/components/sections/section"
import type { BgVariant as BgProp } from "@/components/sections/section-bg"
import { FaqAccordion } from "@/components/sections/faq-accordion"
import { cn } from "@/lib/utils"

export interface Cta {
  label: string
  href: string
}

export function PhotoCard({ photoId, alt, ratio = "aspect-[4/3]" }: { photoId: string; alt: string; ratio?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg border bg-muted shadow-soft", ratio)}>
      <Image
        src={`https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=80`}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 1023px) 100vw, 50vw"
      />
    </div>
  )
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  bullets,
  primary,
  secondary,
  visual,
  badge,
}: {
  eyebrow: string
  title: string
  subtitle: string
  bullets?: string[]
  primary: Cta
  secondary?: Cta
  visual?: ReactNode
  badge?: string
}) {
  return (
    <section className="border-b bg-surface">
      <div className="container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-clay">
            {eyebrow}
            {badge && (
              <Badge variant="outline" className="normal-case tracking-normal">{badge}</Badge>
            )}
          </div>
          <h1 className="max-w-xl font-display text-4xl font-medium leading-[1.1] tracking-tight md:text-5xl lg:text-[3.25rem]">
            {title}
          </h1>
          <p className="prose-body mt-5 max-w-lg text-base md:text-lg">{subtitle}</p>
          {bullets && bullets.length > 0 && (
            <ul className="mt-6 space-y-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link href={primary.href}>
                {primary.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            {secondary && (
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link href={secondary.href}>{secondary.label}</Link>
              </Button>
            )}
          </div>
        </div>
        {visual && <div className="relative">{visual}</div>}
      </div>
    </section>
  )
}

export function ProblemSection({
  eyebrow = "The problem",
  title,
  intro,
  items,
  bg = "dots",
}: {
  eyebrow?: string
  title: string
  intro?: string
  items: { title: string; body: string }[]
  bg?: BgProp
}) {
  return (
    <Section bg={bg} className="border-y bg-surface">
      <SectionHeading eyebrow={eyebrow} title={title} intro={intro} />
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((item, i) => (
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

export function FeatureGridSection({
  eyebrow,
  title,
  intro,
  items,
  bg = "grain",
}: {
  eyebrow: string
  title: string
  intro?: string
  items: { title: string; body: string }[]
  bg?: BgProp
}) {
  return (
    <Section bg={bg}>
      <SectionHeading eyebrow={eyebrow} title={title} intro={intro} />
      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="bg-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function SplitFeature({
  index,
  title,
  body,
  bullets,
  visual,
  flip,
  bg,
}: {
  index?: string
  title: string
  body: string
  bullets?: string[]
  visual: ReactNode
  flip?: boolean
  bg?: BgProp
}) {
  return (
    <Section bg={bg} className={cn(bg ? undefined : "border-y bg-surface")}>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={cn(flip && "lg:order-2")}>
          {index && <p className="mb-3 font-display text-sm text-clay">{index}</p>}
          <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">{title}</h2>
          <p className="prose-body mt-3">{body}</p>
          {bullets && bullets.length > 0 && (
            <ul className="mt-5 space-y-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cn("relative", flip && "lg:order-1")}>{visual}</div>
      </div>
    </Section>
  )
}

export function StepsSection({
  id,
  eyebrow = "How it works",
  title,
  intro,
  steps,
  bg = "grid",
}: {
  id?: string
  eyebrow?: string
  title: string
  intro?: string
  steps: { title: string; body: string }[]
  bg?: BgProp
}) {
  return (
    <Section id={id} bg={bg}>
      <SectionHeading eyebrow={eyebrow} title={title} intro={intro} />
      <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <li key={step.title} className="relative rounded-lg border bg-card p-5 shadow-soft">
            <span className="font-mono text-xs text-muted-foreground">Step {i + 1}</span>
            <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}

export function AudienceSection({
  eyebrow = "Who it's for",
  title,
  intro,
  items,
  bg = "band-clay",
}: {
  eyebrow?: string
  title: string
  intro?: string
  items: { who: string; body: string; wins: string[] }[]
  bg?: BgProp
}) {
  return (
    <Section bg={bg}>
      <SectionHeading eyebrow={eyebrow} title={title} intro={intro} />
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((a) => (
          <div key={a.who} className="flex flex-col rounded-lg border bg-card p-6 shadow-soft">
            <h3 className="font-display text-lg font-medium tracking-tight">{a.who}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
            <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-xs">
              {a.wins.map((w) => (
                <li key={w} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function MethodSection({
  eyebrow = "No black boxes",
  title,
  intro,
  rows,
  bg = "contour",
}: {
  eyebrow?: string
  title: string
  intro?: string
  rows: { label: string; detail: string }[]
  bg?: BgProp
}) {
  return (
    <Section bg={bg}>
      <SectionHeading eyebrow={eyebrow} title={title} intro={intro} />
      <dl className="divide-y divide-border rounded-lg border bg-card">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-1 px-6 py-5 sm:grid-cols-[14rem_1fr] sm:gap-6">
            <dt className="text-sm font-semibold">{row.label}</dt>
            <dd className="text-sm leading-relaxed text-muted-foreground">{row.detail}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}

export function HonestFitSection({
  title,
  good,
  bad,
  bg = "hatch",
}: {
  title: string
  good: string[]
  bad: string[]
  bg?: BgProp
}) {
  return (
    <Section bg={bg}>
      <SectionHeading eyebrow="Straight talk" title={title} />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-soft">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Works well if</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {good.map((g) => (
              <li key={g} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {g}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-soft">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-clay">Not for teams that</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {bad.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-clay" aria-hidden />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  )
}

export function PlanIncludeBand({
  bg = "band-clay",
}: {
  bg?: BgProp
}) {
  return (
    <Section bg={bg}>
      <div className="flex flex-col items-start justify-between gap-6 rounded-lg border bg-card p-6 shadow-soft md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight">Included in every plan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This product ships with the platform — Starter, Professional and Enterprise all include it.
            Pricing scales by seat, annual billing saves 20%.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/pricing">See pricing</Link>
          </Button>
          <Button asChild className="rounded-full">
            <Link href="/signup">Start free trial</Link>
          </Button>
        </div>
      </div>
    </Section>
  )
}

export function QuotesSection({
  title = "What early teams say",
  items,
  bg = "band-sage",
}: {
  title?: string
  items: { quote: string; name: string; role: string }[]
  bg?: BgProp
}) {
  return (
    <Section bg={bg}>
      <SectionHeading title={title} />
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((q) => (
          <figure key={q.quote} className="rounded-lg border bg-card p-6 shadow-soft">
            <blockquote className="font-display text-lg leading-snug tracking-tight">
              “{q.quote}”
            </blockquote>
            <figcaption className="mt-4 text-xs text-muted-foreground">
              {q.name} — {q.role}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Example quotes from early-access conversations. We publish attributed testimonials only
        with permission.
      </p>
    </Section>
  )
}

export function UpdatesSection({
  title = "Recent updates for this product",
  entries,
  href = "/changelog",
  bg = "hatch",
}: {
  title?: string
  entries: { date: string; version: string; category: string; title: string; body: string }[]
  href?: string
  bg?: BgProp
}) {
  return (
    <Section bg={bg}>
      <SectionHeading eyebrow="Shipped" title={title} />
      <ol className="space-y-4">
        {entries.map((e) => (
          <li key={`${e.version}-${e.title}`} className="flex gap-4 rounded-lg border bg-card p-5">
            <div className="w-24 shrink-0">
              <p className="font-mono text-xs text-muted-foreground">{e.date}</p>
              <p className="mt-1 text-xs font-semibold text-clay">{e.category}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">{e.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{e.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link
        href={href}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        Full changelog
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Section>
  )
}

export function FaqSection({
  title = "Questions about this product",
  items,
  moreHref = "/faq",
  moreLabel = "All questions",
  bg = "dots",
}: {
  title?: string
  items: { q: string; a: string }[]
  moreHref?: string
  moreLabel?: string
  bg?: BgProp
}) {
  return (
    <Section bg={bg}>
      <SectionHeading eyebrow="FAQ" title={title} />
      <FaqAccordion items={items} />
      <Link
        href={moreHref}
        className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        {moreLabel}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </Section>
  )
}

export function RelatedSection({
  eyebrow = "Keep looking",
  title,
  items,
  bg = "shapes",
}: {
  eyebrow?: string
  title: string
  items: { title: string; href: string; summary: string }[]
  bg?: BgProp
}) {
  return (
    <Section bg={bg}>
      <SectionHeading eyebrow={eyebrow} title={title} />
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group rounded-lg border bg-card p-6 shadow-soft transition-colors hover:border-primary"
          >
            <h3 className="flex items-center justify-between font-display text-lg font-medium tracking-tight">
              {r.title}
              <ArrowRight
                className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                aria-hidden
              />
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.summary}</p>
          </Link>
        ))}
      </div>
    </Section>
  )
}

export function CtaSection({
  title,
  body,
  primary,
  secondary,
  bg = "inverse",
  watermark,
}: {
  title: string
  body: string
  primary: Cta
  secondary?: Cta
  bg?: BgProp
  watermark?: string
}) {
  return (
    <Section bg={bg} watermark={watermark}>
      <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-medium tracking-tight md:text-4xl">{title}</h2>
          <p className="mt-3 text-sm leading-relaxed opacity-80 md:text-base">{body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full">
            <Link href={primary.href}>{primary.label}</Link>
          </Button>
          {secondary && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-current bg-transparent"
            >
              <Link href={secondary.href}>{secondary.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </Section>
  )
}
