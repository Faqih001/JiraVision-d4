// Content for the printable one-pager at /one-pager.
// Facts are pulled from the live marketing content files — nothing invented.
// NOTE(PLACEHOLDER): onePagerBuildDate is a manual stamp. OWNER MUST UPDATE it to
// the actual build/review date before circulating a printed or PDF copy.

import { pricingTeaser, seatModel } from "@/content/home"
import { contactDetails } from "@/content/site"
import { products } from "@/content/products"

export const onePagerBuildDate = "October 2026"

export const onePager = {
  title: "JiraVision",
  subtitle: "AI-native project management your team can trust",
  asOfLine: `Overview as of ${onePagerBuildDate} — verify details at jiravision.vercel.app`,
  intro:
    "JiraVision brings capacity-aware sprint planning, team wellbeing signals, opt-in recognition and fairness metrics into one workspace. Every AI suggestion arrives with a written rationale you can read, edit and approve — the tool drafts, the team decides.",
  products: products.map((p) => ({ name: p.name, line: p.navSummary })),
  pricing: {
    heading: "Pricing",
    note: `Billed per seat. Every plan includes the AI Scrum Master and wellbeing signals. ${seatModel.trialDays}-day free trial; annual billing saves ${seatModel.annualDiscountPct}%.`,
    plans: pricingTeaser.plans.map((plan) => ({
      name: plan.name,
      price: `${plan.price}${plan.cadence}`,
      blurb: plan.blurb,
    })),
    trialDays: seatModel.trialDays,
  },
  ethics: {
    heading: "Our ethical stance",
    summary:
      "We measure teams, not people, and we publish the lines we won't cross. Metrics that could be used to rank or surveil individual engineers are permanently out of scope — no matter the request. If a number can't show its working, we don't ship it.",
    refusals: [
      "Lines of code as a productivity measure",
      "Per-person velocity comparisons",
      "Activity or keyboard-time tracking",
      "Individual rankings and surveillance-style dashboards",
    ],
    link: { label: "Read the full refusal list", href: "/products/ethical-metrics" },
  },
  contact: {
    heading: "Talk to us",
    email: contactDetails.email,
    supportEmail: contactDetails.supportEmail,
    phone: contactDetails.phone,
    phoneHref: contactDetails.phoneHref,
    address: `${contactDetails.address.line1}, ${contactDetails.address.line2}`,
    web: "jiravision.vercel.app",
    contactHref: "/contact",
  },
  legalLinks: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
    { label: "Cookies", href: "/cookies" },
    { label: "Legal Notice", href: "/legal-notice" },
    { label: "Accessibility", href: "/accessibility" },
  ],
} as const
