import type { Metadata } from "next"
import {
  PageHero,
  MethodSection,
  ProblemSection,
  FeatureGridSection,
  StepsSection,
  UpdatesSection,
  HonestFitSection,
  FaqSection,
  RelatedSection,
  CtaSection,
} from "@/components/sections/page-kit"
import { changelog } from "@/content/changelog"
import {
  hero,
  method,
  readingRules,
  updateCadence,
  nowItems,
  nextItems,
  laterItems,
  prioritySteps,
  signalSources,
  wontBuild,
  influence,
  related,
  faq,
  finalCta,
} from "@/content/roadmap"

export function generateMetadata(): Metadata {
  return {
    title: "Roadmap — JiraVision",
    description:
      "Where JiraVision is going: a now / next / later roadmap with commitment levels instead of dates. Done only ever comes from the public changelog.",
    alternates: { canonical: "/roadmap" },
  }
}

export default async function RoadmapPage() {
  return (
    <>
      <PageHero
        eyebrow={hero.eyebrow}
        badge={hero.badge}
        title={hero.title}
        subtitle={hero.subtitle}
        bullets={hero.bullets}
        primary={hero.primary}
        secondary={hero.secondary}
      />
      <MethodSection
        eyebrow="How this roadmap works"
        title={method.title}
        intro={method.intro}
        rows={method.rows}
        bg="grain"
      />
      <ProblemSection
        eyebrow={readingRules.eyebrow}
        title={readingRules.title}
        intro={readingRules.intro}
        items={readingRules.items}
        bg="dots"
      />
      <StepsSection
        eyebrow={updateCadence.eyebrow}
        title={updateCadence.title}
        intro={updateCadence.intro}
        steps={updateCadence.steps}
        bg="grid"
      />
      <StepsSection
        eyebrow="Now — being built in this phase"
        title="What we are working on right now"
        intro="Active work in the current phase of this project. In progress is a description of today, not a delivery promise — the changelog is where progress becomes fact."
        steps={nowItems}
        bg="contour"
      />
      <FeatureGridSection
        eyebrow="Next — committed direction, uncommitted shape"
        title="Queued behind the current work, without dates"
        intro="These are sequenced and worth planning around, but the design may change. Nothing here is a contract; ask us on /contact what we would tell you today."
        items={nextItems}
        bg="band-sage"
      />
      <MethodSection
        eyebrow="Later — exploratory, not a commitment"
        title="Things we are genuinely considering"
        intro="The honest bottom of the funnel: real candidates we have thought about and not started. Some will ship, some will quietly die, and none of them entitle anyone to anything."
        rows={laterItems.map((item) => ({ label: item.title, detail: item.body }))}
        bg="hatch"
      />
      <UpdatesSection
        title="Done means shipped — every item below is in the changelog"
        entries={changelog}
        bg="dots"
      />
      <HonestFitSection title={wontBuild.title} good={wontBuild.good} bad={wontBuild.bad} bg="stacked" />
      <StepsSection
        eyebrow={prioritySteps.eyebrow}
        title={prioritySteps.title}
        intro={prioritySteps.intro}
        steps={prioritySteps.steps}
        bg="shapes"
      />
      <MethodSection
        eyebrow={signalSources.eyebrow}
        title={signalSources.title}
        intro={signalSources.intro}
        rows={signalSources.rows}
        bg="grain"
      />
      <CtaSection
        title={influence.title}
        body={influence.body}
        primary={influence.primary}
        secondary={influence.secondary}
        bg="band-clay"
      />
      <RelatedSection eyebrow="Receipts" title={related.title} items={related.items} bg="band-sage" />
      <FaqSection title={faq.title} items={faq.items} moreHref="/faq" bg="hatch" />
      <CtaSection
        title={finalCta.title}
        body={finalCta.body}
        primary={finalCta.primary}
        secondary={finalCta.secondary}
        bg="inverse"
        watermark="R"
      />
    </>
  )
}
