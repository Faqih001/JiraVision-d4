import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { EquityMock } from "@/components/mockups/product-mockups"
import { CalculatorsDemo } from "@/components/sections/demo-calculators"
import { Section, SectionHeading } from "@/components/sections/section"
import { compareBySlug, compareRelated } from "@/content/compare"
import {
  PageHero,
  ProblemSection,
  FeatureGridSection,
  SplitFeature,
  PhotoCard,
  StepsSection,
  AudienceSection,
  HonestFitSection,
  MethodSection,
  QuotesSection,
  FaqSection,
  RelatedSection,
  CtaSection,
} from "@/components/sections/page-kit"

export function generateMetadata(): Metadata {
  return {
    title: "JiraVision vs Notion — Built-Your-Own vs Shipped-with-Receipts",
    description:
      "Notion lets you build any system you want; JiraVision ships the delivery methodology — formula-on-card metrics and Jira-native drafts. An honest, qualitative comparison.",
    alternates: { canonical: "/compare/notion" },
  }
}

export default function CompareNotionPage() {
  const c = compareBySlug("notion")
  if (!c) notFound()

  return (
    <>
      <PageHero
        eyebrow={c.hero.eyebrow}
        title={c.hero.title}
        subtitle={c.hero.subtitle}
        bullets={c.hero.bullets}
        primary={c.hero.primary}
        secondary={c.hero.secondary}
        badge={c.hero.badge}
        visual={<EquityMock />}
      />
      <ProblemSection title={c.problem.title} intro={c.problem.intro} items={c.problem.items} bg="grain" />
      <FeatureGridSection
        eyebrow={c.features.eyebrow}
        title={c.features.title}
        intro={c.features.intro}
        items={c.features.items}
        bg="dots"
      />
      <SplitFeature
        index="01"
        title={c.deepDives[0]!.title}
        body={c.deepDives[0]!.body}
        bullets={c.deepDives[0]!.bullets}
        visual={<PhotoCard photoId={c.deepDives[0]!.photoId} alt={c.deepDives[0]!.photoAlt} />}
      />
      <SplitFeature
        index="02"
        title={c.deepDives[1]!.title}
        body={c.deepDives[1]!.body}
        bullets={c.deepDives[1]!.bullets}
        visual={<PhotoCard photoId={c.deepDives[1]!.photoId} alt={c.deepDives[1]!.photoAlt} />}
        flip
        bg="band-sage"
      />
      <SplitFeature
        index="03"
        title={c.deepDives[2]!.title}
        body={c.deepDives[2]!.body}
        bullets={c.deepDives[2]!.bullets}
        visual={<PhotoCard photoId={c.deepDives[2]!.photoId} alt={c.deepDives[2]!.photoAlt} />}
      />
      <CalculatorsDemo />
      <Section id="comparison" bg="contour">
        <SectionHeading eyebrow="Side by side" title={c.table.title} intro={c.table.intro} />
        <div className="overflow-x-auto rounded-lg border bg-card shadow-soft">
          <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
            <caption className="sr-only">{c.table.caption}</caption>
            <thead>
              <tr className="border-b bg-muted/40">
                <th scope="col" className="px-6 py-4 font-semibold">
                  Dimension
                </th>
                <th scope="col" className="px-6 py-4 font-semibold">
                  <Badge variant="outline" className="font-semibold">
                    {c.competitor}
                  </Badge>
                </th>
                <th scope="col" className="px-6 py-4 font-semibold">
                  <Badge className="font-semibold">JiraVision</Badge>
                </th>
              </tr>
            </thead>
            <tbody>
              {c.table.rows.map((row) => (
                <tr key={row.dimension} className="border-t border-border align-top">
                  <th scope="row" className="px-6 py-4 text-left font-semibold">
                    {row.dimension}
                  </th>
                  <td className="px-6 py-4 leading-relaxed text-muted-foreground">{row.them}</td>
                  <td className="px-6 py-4 leading-relaxed">{row.us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{c.table.note}</p>
      </Section>
      <StepsSection
        eyebrow="Getting started"
        title={c.workflow.title}
        intro={c.workflow.intro}
        steps={c.workflow.steps}
        bg="band-clay"
      />
      <AudienceSection title={c.audience.title} intro={c.audience.intro} items={c.audience.items} bg="band-sage" />
      <HonestFitSection title={c.fit.title} good={c.fit.good} bad={c.fit.bad} bg="dots" />
      <MethodSection title={c.method.title} intro={c.method.intro} rows={c.method.rows} bg="hatch" />
      <QuotesSection items={c.quotes} bg="shapes" />
      <FaqSection title="Questions teams ask about Notion" items={c.faq} bg="grain" />
      <RelatedSection title="Other comparisons" items={compareRelated(c.slug)} bg="stacked" />
      <CtaSection
        title={c.cta.title}
        body={c.cta.body}
        primary={c.cta.primary}
        secondary={c.cta.secondary}
        bg="inverse"
        watermark="N"
      />
    </>
  )
}
