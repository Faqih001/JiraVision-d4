import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EquityMock, SkillTreeMock } from "@/components/mockups/product-mockups"
import { Section, SectionHeading, Reveal } from "@/components/sections/section"
import { compareHub, compares } from "@/content/compare"
import {
  PageHero,
  ProblemSection,
  SplitFeature,
  MethodSection,
  HonestFitSection,
  PlanIncludeBand,
  FaqSection,
  RelatedSection,
  CtaSection,
} from "@/components/sections/page-kit"

export function generateMetadata(): Metadata {
  return {
    title: "Compare — JiraVision vs Jira, Asana, Linear, Trello & Notion",
    description:
      "Honest, qualitative comparisons against plain Jira and four popular tools — published method, no price wars, and a visible note wherever details need re-checking on their sites.",
    alternates: { canonical: "/compare" },
  }
}

export default function CompareHubPage() {
  const hub = compareHub

  return (
    <>
      <PageHero
        eyebrow={hub.hero.eyebrow}
        title={hub.hero.title}
        subtitle={hub.hero.subtitle}
        bullets={hub.hero.bullets}
        primary={hub.hero.primary}
        secondary={hub.hero.secondary}
        badge={hub.hero.badge}
        visual={<EquityMock />}
      />
      <ProblemSection title={hub.problem.title} intro={hub.problem.intro} items={hub.problem.items} bg="dots" />
      <Section bg="grain">
        <SectionHeading eyebrow={hub.cards.eyebrow} title={hub.cards.title} intro={hub.cards.intro} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {compares.map((c) => (
            <Reveal key={c.slug}>
              <Link
                href={`/compare/${c.slug}`}
                className="group flex h-full flex-col rounded-lg border bg-card p-6 shadow-soft transition-colors hover:border-primary"
              >
                <Badge variant="outline" className="w-fit font-semibold">
                  JiraVision vs {c.competitor}
                </Badge>
                <h3 className="mt-3 flex items-center justify-between gap-2 font-display text-lg font-medium tracking-tight">
                  {c.hero.title}
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                    aria-hidden
                  />
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.positioning}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </Section>
      <SplitFeature
        index="00"
        title={hub.angle.title}
        body={hub.angle.body}
        bullets={hub.angle.bullets}
        visual={<SkillTreeMock />}
      />
      <Section id="reading" bg="contour">
        <SectionHeading eyebrow="Reading guide" title={hub.reading.title} intro={hub.reading.intro} />
        <div className="grid gap-6 md:grid-cols-3">
          {hub.reading.items.map((item) => (
            <div key={item.title} className="h-full rounded-lg border bg-card p-6 shadow-soft">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>
      <MethodSection title={hub.method.title} intro={hub.method.intro} rows={hub.method.rows} bg="band-sage" />
      <HonestFitSection title={hub.fit.title} good={hub.fit.good} bad={hub.fit.bad} bg="band-clay" />
      <PlanIncludeBand bg="grid" />
      <FaqSection title="Questions about these pages" items={hub.faq} bg="shapes" />
      <RelatedSection eyebrow={hub.nextSteps.eyebrow} title={hub.nextSteps.title} items={hub.nextSteps.items} bg="stacked" />
      <CtaSection
        title={hub.cta.title}
        body={hub.cta.body}
        primary={hub.cta.primary}
        secondary={hub.cta.secondary}
        bg="inverse"
        watermark="V"
      />
    </>
  )
}
