import type { Metadata } from "next"
import { Hero } from "@/components/sections/hero"
import { ProblemSolution, HowItWorks, Integrations, ResponsibleAi, Outcomes } from "@/components/sections/home-misc"
import { Pillars } from "@/components/sections/pillars"
import { ProductTour, UseCases } from "@/components/sections/home-tabs"
import { SandboxDemo } from "@/components/sections/demo-sandbox"
import { GamificationDemo } from "@/components/sections/demo-gamification"
import { EquityExplorer } from "@/components/sections/demo-equity"
import { CalculatorsDemo } from "@/components/sections/demo-calculators"
import { TemplatesCarousel } from "@/components/sections/templates-carousel"
import { KeyboardFirst } from "@/components/sections/keyboard-first"
import { PricingSeats } from "@/components/sections/pricing-seats"
import { Testimonials } from "@/components/sections/testimonials"
import { FaqTeaser } from "@/components/sections/faq-teaser"
import { CtaBand } from "@/components/sections/home-misc"
import { getPageContent } from "@/lib/cms"

// CMS overrides are read from Postgres per request; never serve a build-time snapshot.
export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const { hero } = await getPageContent("home")
  return {
    title: "JiraVision — AI-native project management",
    description:
      "Capacity-aware sprint planning, mood-aware workload balancing and ethical team metrics — powered by IBM Granite, with a human approving every decision.",
    alternates: { canonical: "/" },
    openGraph: {
      title: hero.title,
      description: hero.subtitle,
      url: "/",
      type: "website",
    },
  }
}

export default async function LandingPage() {
  const cms = await getPageContent("home")
  return (
    <>
      <Hero />
      <ProblemSolution />
      <Pillars />
      <HowItWorks />
      <ProductTour tour={cms.tour} />
      <SandboxDemo />
      <GamificationDemo />
      <EquityExplorer />
      <ResponsibleAi />
      <UseCases useCases={cms.useCases} />
      <Integrations />
      <Outcomes />
      <CalculatorsDemo />
      <TemplatesCarousel />
      <Testimonials />
      <KeyboardFirst />
      <PricingSeats pricingTeaser={cms.pricingTeaser} seatModel={cms.seatModel} />
      <FaqTeaser content={cms.faqTeaser} />
      <CtaBand />
    </>
  )
}
