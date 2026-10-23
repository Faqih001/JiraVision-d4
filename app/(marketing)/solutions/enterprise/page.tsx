import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { solutionBySlug } from "@/content/solutions"
import { SprintBoardMock } from "@/components/mockups/product-mockups"
import { SandboxDemo } from "@/components/sections/demo-sandbox"
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
    title: "Solutions for Enterprise — JiraVision",
    description:
      "Approval-gated AI, formula-transparent metrics and an honest compliance posture: delivery intelligence your security review can actually sign off on.",
    alternates: { canonical: "/solutions/enterprise" },
  }
}

export default async function EnterprisePage() {
  const s = solutionBySlug("enterprise")
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
        visual={<SprintBoardMock />}
      />
      <ProblemSection title={s.problem.title} intro={s.problem.intro} items={s.problem.items} bg="dots" />
      <FeatureGridSection
        eyebrow={s.features.eyebrow}
        title={s.features.title}
        intro={s.features.intro}
        items={s.features.items}
        bg="grain"
      />
      <RelatedSection
        eyebrow={s.productMap.eyebrow}
        title={s.productMap.title}
        items={s.productMap.items}
        bg="grid"
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
        bg="hatch"
      />
      <SplitFeature
        index="03"
        title={s.deepDives[2]!.title}
        body={s.deepDives[2]!.body}
        bullets={s.deepDives[2]!.bullets}
        visual={<PhotoCard photoId={s.deepDives[2]!.photoId} alt={s.deepDives[2]!.photoAlt} />}
      />
      <SandboxDemo />
      <StepsSection title={s.workflow.title} intro={s.workflow.intro} steps={s.workflow.steps} bg="dots" />
      <HonestFitSection title={s.fit.title} good={s.fit.good} bad={s.fit.bad} bg="band-sage" />
      <AudienceSection title={s.audience.title} intro={s.audience.intro} items={s.audience.items} bg="shapes" />
      <MethodSection title={s.method.title} intro={s.method.intro} rows={s.method.rows} bg="grain" />
      <PlanIncludeBand bg="band-clay" />
      <QuotesSection items={s.quotes} bg="contour" />
      {updates.length > 0 && <UpdatesSection title="Shipped against this page's claims" entries={updates} bg="grid" />}
      <FaqSection title="Questions procurement asks" items={s.faq} bg="band-sage" />
      <RelatedSection title="Solutions for other teams" items={s.related} bg="shapes" />
      <CtaSection
        title={s.cta.title}
        body={s.cta.body}
        primary={s.cta.primary}
        secondary={s.cta.secondary}
        bg="inverse"
        watermark="E"
      />
    </>
  )
}
