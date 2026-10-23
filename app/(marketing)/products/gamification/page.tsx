import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { productBySlug } from "@/content/products"
import { changelog } from "@/content/changelog"
import { SkillTreeMock } from "@/components/mockups/product-mockups"
import { GamificationDemo } from "@/components/sections/demo-gamification"
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

export function generateMetadata({ params }: { params: Promise<{ [key: string]: string }> }): Metadata {
  return {
    title: "Gamification — JiraVision",
    description:
      "Ethical gamification for engineering teams: skill trees that count reviews, mentoring and care — opt-in, team-level by default, and nobody ranked on speed.",
    alternates: { canonical: "/products/gamification" },
  }
}

export default async function GamificationPage() {
  const p = productBySlug("gamification")
  if (!p) notFound()

  // products.ts updateTitles reference entries still to be written; also show
  // the real shipped changelog rows that explicitly cover this product.
  const titles = [...p.updateTitles, "Skill trees recognise review and mentoring work"]
  const updates = changelog.filter((e) => titles.includes(e.title))

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
        visual={<SkillTreeMock />}
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
        bg="hatch"
      />
      {/* All progress shown inside is synthetic playground data, labelled DEMO by the component itself. */}
      <GamificationDemo />
      <StepsSection title={p.workflow.title} intro={p.workflow.intro} steps={p.workflow.steps} bg="grid" />
      <HonestFitSection title={p.fit.title} good={p.fit.good} bad={p.fit.bad} bg="band-clay" />
      <AudienceSection title={p.audience.title} intro={p.audience.intro} items={p.audience.items} bg="band-sage" />
      <MethodSection title={p.method.title} intro={p.method.intro} rows={p.method.rows} bg="dots" />
      <PlanIncludeBand bg="grain" />
      <QuotesSection items={p.quotes} bg="contour" />
      {updates.length > 0 && <UpdatesSection entries={updates} bg="stacked" />}
      <FaqSection items={p.faq} bg="shapes" />
      <RelatedSection title="More from JiraVision" items={p.related} bg="band-clay" />
      <CtaSection
        title={p.cta.title}
        body={p.cta.body}
        primary={p.cta.primary}
        secondary={p.cta.secondary}
        bg="inverse"
        watermark="G"
      />
    </>
  )
}
