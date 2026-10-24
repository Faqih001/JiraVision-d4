import type { Metadata } from "next"
import {
  PageHero,
  ProblemSection,
  FeatureGridSection,
  SplitFeature,
  PhotoCard,
  StepsSection,
  AudienceSection,
  MethodSection,
  HonestFitSection,
  UpdatesSection,
  PlanIncludeBand,
  FaqSection,
  RelatedSection,
  CtaSection,
} from "@/components/sections/page-kit"
import { changelog } from "@/content/changelog"
import { getPageContent } from "@/lib/cms"

// CMS overrides are read from Postgres per request; never serve a build-time snapshot.
export const dynamic = "force-dynamic"

export function generateMetadata(): Metadata {
  return {
    title: "About — JiraVision",
    description:
      "A small, independent team building humane, explainable project management software. How we started, what we stand for, how we work — and everything you can verify ourselves.",
    alternates: { canonical: "/about" },
  }
}

export default async function AboutPage() {
  const {
    hero,
    origin,
    story,
    values,
    howWeWork,
    team,
    decisions,
    transparency,
    honestFit,
    milestones,
    faq,
    related,
    cta,
  } = await getPageContent("about")
  const shipped = changelog.slice(0, 5)

  return (
    <>
      <PageHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        subtitle={hero.subtitle}
        bullets={hero.bullets}
        primary={hero.primary}
        secondary={hero.secondary}
        badge={hero.badge}
        visual={<PhotoCard photoId={hero.photoId} alt={hero.photoAlt} ratio="aspect-[4/3]" />}
      />
      <ProblemSection
        eyebrow={origin.eyebrow}
        title={origin.title}
        intro={origin.intro}
        items={origin.items}
        bg="dots"
      />
      <SplitFeature
        index={story.part1.index}
        title={story.part1.title}
        body={story.part1.body}
        bullets={story.part1.bullets}
        visual={<PhotoCard photoId={story.part1.photoId} alt={story.part1.photoAlt} />}
      />
      <SplitFeature
        index={story.part2.index}
        title={story.part2.title}
        body={story.part2.body}
        bullets={story.part2.bullets}
        visual={<PhotoCard photoId={story.part2.photoId} alt={story.part2.photoAlt} />}
        flip
        bg="contour"
      />
      <FeatureGridSection
        eyebrow={values.eyebrow}
        title={values.title}
        intro={values.intro}
        items={values.items}
        bg="grain"
      />
      <SplitFeature
        index={story.principle.index}
        title={story.principle.title}
        body={story.principle.body}
        bullets={story.principle.bullets}
        visual={<PhotoCard photoId={story.principle.photoId} alt={story.principle.photoAlt} />}
        bg="band-sage"
      />
      <MethodSection
        eyebrow={howWeWork.eyebrow}
        title={howWeWork.title}
        intro={howWeWork.intro}
        rows={howWeWork.rows}
        bg="stacked"
      />
      <AudienceSection
        eyebrow={team.eyebrow}
        title={team.title}
        intro={team.intro}
        items={team.items}
        bg="hatch"
      />
      <StepsSection
        eyebrow={decisions.eyebrow}
        title={decisions.title}
        intro={decisions.intro}
        steps={decisions.steps}
        bg="grid"
      />
      <HonestFitSection
        title={honestFit.title}
        good={honestFit.good}
        bad={honestFit.bad}
        bg="band-clay"
      />
      <FeatureGridSection
        eyebrow={transparency.eyebrow}
        title={transparency.title}
        intro={transparency.intro}
        items={transparency.items}
        bg="grain"
      />
      <UpdatesSection title={milestones.title} entries={shipped} href="/changelog" bg="dots" />
      <PlanIncludeBand bg="band-sage" />
      <FaqSection title={faq.title} items={faq.items} moreHref="/faq" moreLabel="Product questions" bg="contour" />
      <RelatedSection title={related.title} eyebrow={related.eyebrow} items={related.items} bg="shapes" />
      <CtaSection
        title={cta.title}
        body={cta.body}
        primary={cta.primary}
        secondary={cta.secondary}
        bg="inverse"
        watermark="J"
      />
    </>
  )
}
