import type { Metadata } from "next"
import { Fragment } from "react"
import {
  PageHero,
  ProblemSection,
  FeatureGridSection,
  StepsSection,
  AudienceSection,
  MethodSection,
  HonestFitSection,
  QuotesSection,
  FaqSection,
  RelatedSection,
  CtaSection,
} from "@/components/sections/page-kit"
import { Section, SectionHeading } from "@/components/sections/section"
import { Check } from "lucide-react"
import { pricingNav, compareGroups } from "@/content/pricing-page"
import { getPageContent } from "@/lib/cms"
import { PricingPlans, CostVsTimeEstimator } from "./pricing-calculator"

// CMS overrides are read from Postgres per request; never serve a build-time snapshot.
export const dynamic = "force-dynamic"

export function generateMetadata(): Metadata {
  return {
    title: "Pricing — JiraVision",
    description:
      "Starter $9, Professional $19, Enterprise $49 per user/month. Annual billing saves 20%, every plan runs on a 14-day trial with no card, and you can cancel from account settings.",
    alternates: { canonical: "/pricing" },
  }
}

function PricingAnchorNav() {
  return (
    <nav aria-label="On this page" className="border-b bg-surface">
      <div className="container flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          On this page
        </span>
        {pricingNav.links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

function CompareTable() {
  return (
    <Section id="compare" bg="grain">
      <SectionHeading
        eyebrow="Compare"
        title="Every feature, every plan, one table"
        intro="No fine print elsewhere: this is the complete tier split. Dashes mean the feature is genuinely not on that plan."
      />
      <div className="overflow-x-auto rounded-lg border bg-card shadow-soft">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <caption className="sr-only">Feature comparison across Starter, Professional and Enterprise</caption>
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th scope="col" className="px-5 py-3 font-semibold">Feature</th>
              <th scope="col" className="px-5 py-3 font-semibold">Starter</th>
              <th scope="col" className="bg-primary/5 px-5 py-3 font-semibold text-primary">Professional</th>
              <th scope="col" className="px-5 py-3 font-semibold">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {compareGroups.map((group) => (
              <Fragment key={group.title}>
                <tr className="border-b bg-muted/20">
                  <td colSpan={4} className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} className="border-b last:border-b-0">
                    <th scope="row" className="px-5 py-3 text-left font-medium">{row.label}</th>
                    <td className="px-5 py-3 text-muted-foreground">{row.starter}</td>
                    <td className="bg-primary/5 px-5 py-3">{row.professional}</td>
                    <td className="px-5 py-3 text-muted-foreground">{row.enterprise}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
          All tiers keep the AI approval gate and aggregated wellbeing data — those are never paywalled.
        </li>
        <li>Enterprise terms (support response times, uptime) are agreed per account — talk to us.</li>
      </ul>
    </Section>
  )
}

export default async function PricingPage() {
  const {
    pricingHero,
    pricingProblem,
    includedEverywhere,
    billingMethod,
    seatEconomics,
    trialSteps,
    chooseAudience,
    discounts,
    pricingPrinciples,
    pricingQuotes,
    pricingFaq,
    pricingRelated,
    pricingCta,
  } = await getPageContent("pricing")
  return (
    <>
      <PageHero
        eyebrow={pricingHero.eyebrow}
        title={pricingHero.title}
        subtitle={pricingHero.subtitle}
        bullets={pricingHero.bullets}
        badge={pricingHero.badge}
        primary={pricingHero.primary}
        secondary={pricingHero.secondary}
        visual={
          <div className="rounded-lg border bg-card p-6 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your bill, in one formula</p>
            <p className="mt-3 font-display text-2xl font-medium tracking-tight">
              seats × plan price <span className="text-clay">× 12</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Annual billing applies a flat 20% off before that ×12. Nothing else is multiplied —
              no onboarding fee, no storage tier, no “contact us for the real price”.
            </p>
            <dl className="mt-4 grid grid-cols-3 divide-x divide-border border-t pt-4 text-center">
              {[
                { name: "Starter", price: "$9" },
                { name: "Professional", price: "$19" },
                { name: "Enterprise", price: "$49" },
              ].map((p) => (
                <div key={p.name} className="px-2">
                  <dt className="text-xs text-muted-foreground">{p.name}</dt>
                  <dd className="mt-1 font-mono text-lg">{p.price}<span className="text-xs text-muted-foreground">/user/mo</span></dd>
                </div>
              ))}
            </dl>
          </div>
        }
      />
      <PricingAnchorNav />
      <ProblemSection
        title={pricingProblem.title}
        intro={pricingProblem.intro}
        items={pricingProblem.items}
        bg="dots"
      />
      <PricingPlans />
      <FeatureGridSection
        eyebrow={includedEverywhere.eyebrow}
        title={includedEverywhere.title}
        intro={includedEverywhere.intro}
        items={includedEverywhere.items}
        bg="band-clay"
      />
      <div id="billing">
        <MethodSection
          eyebrow={billingMethod.eyebrow}
          title={billingMethod.title}
          intro={billingMethod.intro}
          rows={billingMethod.rows}
          bg="contour"
        />
      </div>
      <CompareTable />
      <MethodSection
        eyebrow={seatEconomics.eyebrow}
        title={seatEconomics.title}
        rows={seatEconomics.rows}
        bg="stacked"
      />
      <CostVsTimeEstimator />
      <StepsSection
        id={trialSteps.id}
        eyebrow={trialSteps.eyebrow}
        title={trialSteps.title}
        intro={trialSteps.intro}
        steps={trialSteps.steps}
        bg="dots"
      />
      <AudienceSection
        title={chooseAudience.title}
        intro={chooseAudience.intro}
        items={chooseAudience.items}
        bg="band-sage"
      />
      <HonestFitSection
        title="Is your team the right shape for self-serve?"
        good={[
          "5–100 people who can decide without procurement",
          "One or a few Jira teams that pilot before rolling out",
          "You trust card billing and want to move this week",
        ]}
        bad={[
          "Hundreds of seats with a purchasing department in the loop",
          "Contracts that need custom SLAs or data-residency terms today",
          "Any team that expects per-feature pricing à la carte",
        ]}
        bg="hatch"
      />
      <div id="discounts">
        <MethodSection
          eyebrow={discounts.eyebrow}
          title={discounts.title}
          intro={discounts.intro}
          rows={discounts.rows}
          bg="contour"
        />
      </div>
      <QuotesSection title={pricingQuotes.title} items={pricingQuotes.items} bg="shapes" />
      <MethodSection
        eyebrow={pricingPrinciples.eyebrow}
        title={pricingPrinciples.title}
        intro={pricingPrinciples.intro}
        rows={pricingPrinciples.rows}
        bg="grain"
      />
      <div id="faq">
        <FaqSection
          title={pricingFaq.title}
          items={pricingFaq.items}
          moreHref={pricingFaq.moreHref}
          moreLabel={pricingFaq.moreLabel}
          bg="grid"
        />
      </div>
      <RelatedSection
        eyebrow={pricingRelated.eyebrow}
        title={pricingRelated.title}
        items={pricingRelated.items}
        bg="band-sage"
      />
      <CtaSection
        title={pricingCta.title}
        body={pricingCta.body}
        primary={pricingCta.primary}
        secondary={pricingCta.secondary}
        bg="inverse"
        watermark="$"
      />
    </>
  )
}
