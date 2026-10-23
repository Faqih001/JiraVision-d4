import type { Metadata } from "next"
import { Hero } from "@/components/sections/hero"
import { ProblemSolution, HowItWorks, Integrations, ResponsibleAi, Outcomes, PricingTeaser, CtaBand } from "@/components/sections/home-misc"
import { Pillars } from "@/components/sections/pillars"
import { ProductTour, UseCases } from "@/components/sections/home-tabs"
import { Testimonials } from "@/components/sections/testimonials"
import { FaqTeaser } from "@/components/sections/faq-teaser"
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
      <Integrations />
      <ResponsibleAi />
      <UseCases />
      <Outcomes />
      <Testimonials />
      <PricingTeaser />
      <FaqTeaser />
      <CtaBand />
    </>
  )
}
