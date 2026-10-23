import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { solutionBySlug } from "@/content/solutions"
import { WellbeingMock } from "@/components/mockups/product-mockups"
import { CalculatorsDemo } from "@/components/sections/demo-calculators"
import {
  PageHero,
  ProblemSection,
  FeatureGridSection,
  SplitFeature,
  PhotoCard,
  StepsSection,
  HonestFitSection,
  AudienceSection,
  MethodSection,
  PlanIncludeBand,
  QuotesSection,
  UpdatesSection,
  FaqSection,
  RelatedSection,
  CtaSection,
} from "@/components/sections/page-kit"
import { changelog } from "@/content/changelog"

export function generateMetadata({ params }: { params: Promise<{ [key: string]: string }> }): Metadata {
  return {
    title: "Solutions for Remote Teams — JiraVision",
    description:
      "Async rituals, timezone fairness and after-hours load measured as a team signal — distributed delivery without the bossware.",
    alternates: { canonical: "/solutions/remote-teams" },
  }
}

export default async function RemoteTeamsPage() {
  const s = solutionBySlug("remote-teams")
  if (!s) notFound()

  const updates = changelog.filter((e) => s.updateTitles.includes(e.title))

  return (
    <>
      <PageHero
        eyebrow={s.hero.eyebrow}
        title={s.hero.title}
        subtitle={s.hero.subtitle}
        bullets={s.hero.bullets}
        primary={s.hero.primary}
        secondary={s.hero.secondary}
        badge={s.hero.badge}
        visual={<WellbeingMock />}
      />
      <ProblemSection title={s.problem.title} intro={s.problem.intro} items={s.problem.items} bg="grain" />
      <FeatureGridSection
        eyebrow={s.features.eyebrow}
        title={s.features.title}
        intro={s.features.intro}
        items={s.features.items}
        bg="dots"
      />
      <RelatedSection
        eyebrow={s.productMap.eyebrow}
        title={s.productMap.title}
        items={s.productMap.items}
        bg="band-sage"
      />
      <SplitFeature
        index="01"
        title={s.deepDives[0]!.title}
        body={s.deepDives[0]!.body}
        bullets={s.deepDives[0]!.bullets}
        visual={<PhotoCard photoId={s.deepDives[0]!.photoId} alt={s.deepDives[0]!.photoAlt} />}
      />
      <SplitFeature
        index="02"
        title={s.deepDives[1]!.title}
        body={s.deepDives[1]!.body}
        bullets={s.deepDives[1]!.bullets}
        visual={<PhotoCard photoId={s.deepDives[1]!.photoId} alt={s.deepDives[1]!.photoAlt} />}
        flip
        bg="contour"
      />
      <SplitFeature
        index="03"
        title={s.deepDives[2]!.title}
        body={s.deepDives[2]!.body}
        bullets={s.deepDives[2]!.bullets}
        visual={<PhotoCard photoId={s.deepDives[2]!.photoId} alt={s.deepDives[2]!.photoAlt} />}
      />
      <CalculatorsDemo />
      <StepsSection title={s.workflow.title} intro={s.workflow.intro} steps={s.workflow.steps} bg="shapes" />
      <HonestFitSection title={s.fit.title} good={s.fit.good} bad={s.fit.bad} bg="hatch" />
      <AudienceSection title={s.audience.title} intro={s.audience.intro} items={s.audience.items} bg="band-clay" />
      <MethodSection title={s.method.title} intro={s.method.intro} rows={s.method.rows} bg="grain" />
      <PlanIncludeBand bg="dots" />
      <QuotesSection items={s.quotes} bg="band-sage" />
      {updates.length > 0 && <UpdatesSection entries={updates} bg="shapes" />}
      <FaqSection title="Questions distributed teams ask" items={s.faq} bg="contour" />
      <RelatedSection title="Solutions for other teams" items={s.related} bg="hatch" />
      <CtaSection
        title={s.cta.title}
        body={s.cta.body}
        primary={s.cta.primary}
        secondary={s.cta.secondary}
        bg="inverse"
        watermark="R"
      />
    </>
  )
}
