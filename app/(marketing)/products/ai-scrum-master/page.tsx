import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { productBySlug } from "@/content/products"
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
    title: "AI Scrum Master — JiraVision",
    description:
      "Capacity-aware sprint planning drafts with a written rationale for every suggested item. You edit, you approve — JiraVision never writes to your board alone.",
    alternates: { canonical: "/products/ai-scrum-master" },
  }
}

export default async function AiScrumMasterPage() {
  const p = productBySlug("ai-scrum-master")
  if (!p) notFound()

  const updates = changelog.filter((e) => p.updateTitles.includes(e.title))

  return (
    <>
      <PageHero
        eyebrow={p.hero.eyebrow}
        title={p.hero.title}
        subtitle={p.hero.subtitle}
        bullets={p.hero.bullets}
        primary={p.hero.primary}
        secondary={p.hero.secondary}
        badge={p.hero.badge}
        visual={<SprintBoardMock />}
      />
      <ProblemSection title={p.problem.title} intro={p.problem.intro} items={p.problem.items} bg="dots" />
      <FeatureGridSection
        eyebrow={p.features.eyebrow}
        title={p.features.title}
        intro={p.features.intro}
        items={p.features.items}
        bg="grain"
      />
      <SplitFeature
        index="01"
        title={p.deepDives[0]!.title}
        body={p.deepDives[0]!.body}
        bullets={p.deepDives[0]!.bullets}
        visual={<PhotoCard photoId={p.deepDives[0]!.photoId} alt={p.deepDives[0]!.photoAlt} />}
      />
      <SplitFeature
        index="02"
        title={p.deepDives[1]!.title}
        body={p.deepDives[1]!.body}
        bullets={p.deepDives[1]!.bullets}
        visual={<PhotoCard photoId={p.deepDives[1]!.photoId} alt={p.deepDives[1]!.photoAlt} />}
        flip
        bg="contour"
      />
      <SplitFeature
        index="03"
        title={p.deepDives[2]!.title}
        body={p.deepDives[2]!.body}
        bullets={p.deepDives[2]!.bullets}
        visual={<PhotoCard photoId={p.deepDives[2]!.photoId} alt={p.deepDives[2]!.photoAlt} />}
      />
      <SandboxDemo />
      <StepsSection title={p.workflow.title} intro={p.workflow.intro} steps={p.workflow.steps} bg="grid" />
      <HonestFitSection title={p.fit.title} good={p.fit.good} bad={p.fit.bad} bg="hatch" />
      <AudienceSection title={p.audience.title} intro={p.audience.intro} items={p.audience.items} bg="band-sage" />
      <MethodSection title={p.method.title} intro={p.method.intro} rows={p.method.rows} bg="grain" />
      <PlanIncludeBand bg="band-clay" />
      <QuotesSection items={p.quotes} bg="shapes" />
      {updates.length > 0 && <UpdatesSection entries={updates} bg="dots" />}
      <FaqSection items={p.faq} bg="band-sage" />
      <RelatedSection title="More from JiraVision" items={p.related} bg="shapes" />
      <CtaSection
        title={p.cta.title}
        body={p.cta.body}
        primary={p.cta.primary}
        secondary={p.cta.secondary}
        bg="inverse"
        watermark="A"
      />
    </>
  )
}
