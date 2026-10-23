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
import { hero } from "@/content/home"

export const metadata: Metadata = {
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

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ProblemSolution />
      <Pillars />
      <HowItWorks />
      <ProductTour />
      <SandboxDemo />
      <GamificationDemo />
      <EquityExplorer />
      <ResponsibleAi />
      <UseCases />
      <Integrations />
      <Outcomes />
      <CalculatorsDemo />
      <TemplatesCarousel />
      <Testimonials />
      <KeyboardFirst />
      <PricingSeats />
      <FaqTeaser />
      <CtaBand />
    </>
  )
}
