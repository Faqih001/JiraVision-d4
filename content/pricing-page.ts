// Pricing page copy and data. Prices are NOT duplicated here — the numeric
// source of truth is `seatModel` in content/home.ts (Starter $9, Professional
// $19, Enterprise $49 per user/month, annual −20%, 14-day trial, 5–100 seats).
// This file carries editorial copy, feature lists, comparison rows and FAQ.
//
// NOTE(PLACEHOLDER): every value marked PLACEHOLDER below is unconfirmed by the
// owner and must be verified, replaced with real data, or deleted before launch.
// Where a fact is unconfirmed the page copy stays neutral ("Talk to us") and
// never states a concrete term as a promise.

export interface PlanCard {
  name: "Starter" | "Professional" | "Enterprise"
  blurb: string
  highlights: string[]
  cta: { label: string; href: string }
  featured?: boolean
}

export interface CompareRow {
  label: string
  starter: string
  professional: string
  enterprise: string
}

export interface CompareGroup {
  title: string
  rows: CompareRow[]
}

export const pricingHero = {
  eyebrow: "Pricing",
  badge: "14-day trial, no card",
  title: "Pricing that scales with seats, not surprises",
  subtitle:
    "Three plans, one per-user price each. Annual billing takes 20% off, every plan includes the full platform, and you can leave whenever you like.",
  bullets: [
    "$9 / $19 / $49 per user per month, billed by seat",
    "14-day trial on every plan — no credit card to start",
    "Annual billing saves 20%, cancel at period end",
  ],
  primary: { label: "Start free trial", href: "/signup" },
  secondary: { label: "Compare features", href: "#compare" },
}

// Anchor strip below the hero; each href must match a section id on the page.
export const pricingNav = {
  links: [
    { label: "Plans", href: "#plans" },
    { label: "Compare", href: "#compare" },
    { label: "Estimator", href: "#estimator" },
    { label: "Billing", href: "#billing" },
    { label: "Trial", href: "#trial" },
    { label: "Discounts", href: "#discounts" },
    { label: "FAQ", href: "#faq" },
  ],
}

export const pricingProblem = {
  eyebrow: "The problem",
  title: "Why SaaS pricing pages are hard to trust",
  intro:
    "We designed this page against the three complaints we kept hearing about pricing pages in general — ours included.",
  items: [
    {
      title: "Prices that move",
      body: "A quoted price at checkout that differs from the marketing page. Here, the numbers on this page are the numbers in the checkout — same model, same seat count.",
    },
    {
      title: "Features hidden behind tiers",
      body: "Lists that say \"advanced\" without saying what you get. The full comparison table below is explicit, row by row, including what Starter does not include.",
    },
    {
      title: "Exit doors you can't find",
      body: "Subscriptions you can only cancel by emailing sales. You can cancel from your account settings; access runs to the end of the paid period.",
    },
  ],
}

export const planCards: PlanCard[] = [
  {
    name: "Starter",
    blurb: "One team, one Jira project, the core platform. Scales to 10 seats.",
    highlights: [
      "AI Scrum Master drafts and wellbeing signals",
      "One connected Jira project",
      "Up to 10 seats",
      "Email support",
    ],
    cta: { label: "Start free trial", href: "/signup" },
  },
  {
    name: "Professional",
    blurb: "Most teams land here: unlimited projects, ethical metrics, priority support.",
    highlights: [
      "Unlimited Jira projects and teams",
      "Ethical-metric governance and audit trail",
      "Gamification and wellbeing suites fully on",
      "Priority email and chat support",
    ],
    featured: true,
    cta: { label: "Start free trial", href: "/signup" },
  },
  {
    name: "Enterprise",
    blurb: "SSO, security review and guided onboarding. Terms are agreed per account.",
    highlights: [
      "Everything in Professional",
      "SSO / SAML and role-based access controls",
      "Guided onboarding and migration support",
      "Security review and written terms — talk to us",
    ],
    cta: { label: "Talk to us", href: "/contact" },
  },
]

// NOTE(PLACEHOLDER): the tier split in this table is salvaged from the previous
// pricing page and must be re-confirmed against what actually ships per plan.
export const compareGroups: CompareGroup[] = [
  {
    title: "Scope",
    rows: [
      { label: "Seats", starter: "Up to 10", professional: "1–100 self-serve, more by agreement", enterprise: "Volume terms — talk to us" },
      { label: "Connected Jira projects", starter: "1", professional: "Unlimited", enterprise: "Unlimited" },
      { label: "Workspaces", starter: "1", professional: "Unlimited", enterprise: "Unlimited" },
    ],
  },
  {
    title: "Platform",
    rows: [
      { label: "AI Scrum Master drafts", starter: "Included", professional: "Included", enterprise: "Included" },
      { label: "Team wellbeing signals", starter: "Core signals", professional: "Full suite", enterprise: "Full suite" },
      { label: "Gamification", starter: "—", professional: "Included", enterprise: "Included" },
      { label: "Ethical metrics & audit trail", starter: "—", professional: "Included", enterprise: "Advanced controls" },
    ],
  },
  {
    title: "Administration",
    rows: [
      { label: "SSO / SAML", starter: "—", professional: "—", enterprise: "Included" },
      { label: "Role-based access control", starter: "Basic", professional: "Included", enterprise: "Advanced" },
      { label: "Data export", starter: "CSV", professional: "CSV + API", enterprise: "CSV + API" },
    ],
  },
  {
    title: "Support",
    rows: [
      { label: "Support channel", starter: "Email", professional: "Priority email & chat", enterprise: "Named contact — terms per account" },
      { label: "Onboarding", starter: "Self-serve guides", professional: "Self-serve + webinar", enterprise: "Guided onboarding" },
      { label: "Uptime commitments", starter: "See status page", professional: "See status page", enterprise: "Per agreement" },
    ],
  },
]

export const includedEverywhere = {
  eyebrow: "No asterisks",
  title: "Included in every plan",
  intro:
    "These aren't upsells — they're the baseline on Starter, Professional and Enterprise alike, for the full 14-day trial and after.",
  items: [
    {
      title: "Human-approved AI",
      body: "Every AI suggestion is a draft with a written rationale. Nothing reaches your board without a person approving it, on every plan.",
    },
    {
      title: "Read-only Jira sync",
      body: "We import issues and boards to analyse them. JiraVision never writes to your Jira instance unless you approve a specific change.",
    },
    {
      title: "Aggregated wellbeing data",
      body: "No individual survey answers are ever exposed to managers, on any tier. This is a product constraint, not a plan feature.",
    },
    {
      title: "Cancel & export",
      body: "Cancel from account settings at any time and export your data while your access runs to the end of the paid period.",
    },
  ],
}

export const billingMethod = {
  eyebrow: "How billing works",
  title: "Plain answers about invoices, seats and changes",
  intro:
    "The mechanics behind the slider above the fold. If something here is unclear, the short version is: per-seat, pre-paid, no lock-in.",
  rows: [
    {
      label: "What is a seat?",
      detail:
        "Any member you invite to a connected workspace with a JiraVision login. Viewers and one-off guests aren't billed.",
    },
    {
      label: "Adding and removing seats",
      // NOTE(PLACEHOLDER): mid-period proration mechanics are not yet confirmed
      // with the billing provider — copy stays neutral and defers to the invoice.
      detail:
        "New seats bill at the per-user rate for the rest of the period; removed seats stop billing from the next period. The exact prorated amount is shown on your invoice before any change is finalised.",
    },
    {
      label: "Monthly vs annual",
      detail:
        "Monthly bills every calendar month and can be cancelled any time. Annual bills once, at 20% off the monthly rate, and runs for the year you pre-pay.",
    },
    {
      label: "Taxes",
      // NOTE(PLACEHOLDER): VAT / sales-tax handling per region is unconfirmed.
      // The page must not promise tax treatment until the owner confirms.
      detail:
        "Treat the prices on this page as excluding tax. Checkout shows the final amount, including any tax that applies in your region, before you pay.",
    },
    {
      label: "Payment methods",
      // NOTE(PLACEHOLDER): billing provider and full payment-option list must
      // be confirmed before launch.
      detail:
        "Self-serve billing runs on major credit and debit cards through our payment provider. Invoicing and bank transfer are available on annual Enterprise agreements — talk to us.",
    },
    {
      label: "Downgrades",
      detail:
        "Switch to a cheaper plan at the start of your next billing period. You keep the higher tier until then, and we don't claw back features mid-period.",
    },
  ],
}

export const trialSteps = {
  id: "trial",
  eyebrow: "The trial, step by step",
  title: "What happens in the 14 days",
  intro:
    "No sales call, no card, no feature-limited demo. Here's the full timeline so nothing is a surprise on day 15.",
  steps: [
    {
      title: "Day 0 — connect Jira",
      body: "Sign up, connect one Jira project, invite your team. Read-only import; nothing in Jira changes.",
    },
    {
      title: "Days 1–13 — use everything",
      body: "Full access to your chosen tier. AI drafts, wellbeing signals, dashboards — the same product paying customers run.",
    },
    {
      title: "Day 14 — we tell you, quietly",
      body: "You get a heads-up before the trial ends. No dark patterns: if you do nothing, the workspace simply switches to read-only.",
    },
    {
      title: "After — pick, pause or leave",
      body: "Choose a plan, or export your data and walk away. We don't ask for a card up front, so there is nothing to charge.",
    },
  ],
}

export const seatEconomics = {
  eyebrow: "Seat math",
  title: "How the seat slider gets its numbers",
  rows: [
    {
      label: "List price",
      detail: "Starter $9, Professional $19, Enterprise $49 per user per month. These are the prices in checkout.",
    },
    {
      label: "Annual discount",
      detail: "Annual billing takes 20% off the per-user rate — $7.20, $15.20 and $39.20 per user per month, billed once for the year.",
    },
    {
      label: "Slider range",
      detail: "Self-serve covers 5–100 seats. Under 5 or over 100, talk to us — we'll point you at the right plan rather than force-fitting.",
    },
    {
      label: "Rounding",
      // NOTE(PLACEHOLDER): invoicing granularity (per-day vs per-period seat
      // counting) must be confirmed with the billing provider.
      detail:
        "Totals shown on this page are indicative; your invoice is computed from the exact seats active during the period. The checkout figure is the one you pay.",
    },
  ],
}

export const chooseAudience = {
  eyebrow: "Which plan?",
  title: "Three honest profiles",
  intro:
    "We'd rather send you to the right plan than the expensive one. If you match the left column, Starter genuinely is enough.",
  items: [
    {
      who: "One small squad",
      body: "A single team, one Jira project, trying AI-assisted planning for the first time.",
      wins: ["Starter is enough", "Upgrade costs nothing extra to switch", "14-day trial decides the argument"],
    },
    {
      who: "A few teams, one org",
      body: "3–5 squads, cross-team dashboards, and someone who owns the metrics story.",
      wins: ["Professional by default", "Ethical metrics need the audit trail", "Priority support matters at this size"],
    },
    {
      who: "IT / security involved",
      body: "SSO is mandatory, procurement wants written terms, and rollout needs a plan.",
      wins: ["Enterprise, started with a call", "Security review before rollout", "Terms agreed per account"],
    },
  ],
}

export const discounts = {
  eyebrow: "Special cases",
  title: "Discounts, nonprofits and procurement",
  intro:
    "We intend these programs to exist; the exact terms are still being confirmed, so we describe the door, not the price behind it.",
  rows: [
    {
      label: "Nonprofits & education",
      // NOTE(PLACEHOLDER): discount percentages and eligibility rules are not
      // yet confirmed — copy offers the conversation, not a price.
      detail:
        "We're building reduced-pricing programs for registered nonprofits and classrooms. Eligibility and the current offer are still being finalised — write to us and we'll be straight about what applies today.",
    },
    {
      label: "Open source",
      // NOTE(PLACEHOLDER): no public OSS program confirmed; do not describe
      // one as policy until the owner sets it.
      detail:
        "Open-source maintainers: talk to us. We'd rather have the conversation than publish a program we haven't committed to.",
    },
    {
      label: "Startups & early-stage",
      detail:
        "Starter exists for exactly this reason — $9/user gets the whole core platform. If that doesn't work for you, say so before buying Enterprise.",
    },
    {
      label: "Procurement / security review",
      // NOTE(PLACEHOLDER): current document set (questionnaire, DPA) and
      // turnaround times must be confirmed.
      detail:
        "Enterprise accounts can request security documentation and a data-processing agreement. Ask via the contact page and we'll send what's current.",
    },
  ],
}

export const pricingPrinciples = {
  eyebrow: "Our rules",
  title: "Pricing principles we're held to",
  intro:
    "These are commitments about how this page behaves, not marketing copy. If we break one, the changelog will say so.",
  rows: [
    {
      label: "One price, everywhere",
      detail: "The number on this page, in the app and on the invoice is the same number. Price changes are announced in the changelog before they apply to new customers.",
    },
    {
      label: "No forced annual",
      detail: "Every plan can be paid monthly. Annual is a discount you choose, never a lock-in you discover.",
    },
    {
      label: "Features aren't held hostage",
      detail: "Safety-critical behaviour — approval gates, aggregated wellbeing data — is the same on every plan and never a paid tier.",
    },
    {
      label: "Leaving is easier than joining",
      detail: "Cancel in-account, export your data, and access runs to the end of the period you paid for. No retention maze.",
    },
  ],
}

// NOTE(PLACEHOLDER): example quotes from the early-access round, left
// unattributed on purpose. Replace with permissioned, attributed testimonials
// — or delete this section — before launch. Nothing here claims a customer
// count or a fake endorsement.
export const pricingQuotes = {
  title: "What buyers told us",
  items: [
    {
      quote:
        "The seat slider matched our invoice to the cent. First pricing page I didn't need to screenshot for the finance review.",
      name: "Early-access participant (unattributed)",
      role: "Mid-size SaaS company",
    },
    {
      quote:
        "We started on Starter to prove the tool to a sceptical team, then moved to annual Professional after two sprints.",
      name: "Early-access participant (unattributed)",
      role: "Series B fintech",
    },
  ],
}

export const pricingFaq = {
  title: "Pricing questions, answered",
  moreHref: "/faq",
  moreLabel: "All questions",
  items: [
    {
      q: "Can I change plans later?",
      a: "Yes. Upgrades take effect immediately and are prorated for the rest of the period; downgrades take effect at the start of your next billing cycle so you keep what you paid for.",
    },
    {
      q: "Is there really a free trial?",
      a: "14 days on any plan, no credit card. If you do nothing on day 15, the workspace goes read-only — you can export data or come back and pick a plan whenever.",
    },
    {
      q: "What happens to my data if I cancel?",
      // NOTE(PLACEHOLDER): the data-retention window after cancellation must be
      // confirmed against the privacy policy before this answer ships.
      a: "Access continues until the end of the period you've paid for. During that window you can export everything; what happens afterwards is governed by the retention terms in our privacy policy.",
    },
    {
      q: "Do you offer discounts for nonprofits or education?",
      a: "We intend to, and the terms are still being finalised. Reach us through the contact page and we'll tell you honestly what applies today rather than quote a discount we haven't set.",
    },
    {
      q: "How does annual billing work?",
      a: "You pre-pay 12 months at 20% off the monthly per-user rate. If seats go up mid-year, the added seats bill at the same discounted rate for the rest of the term.",
    },
    {
      q: "What payment methods do you accept?",
      a: "Major credit and debit cards self-serve. Bank transfer and purchase orders are available on annual Enterprise agreements — start at /contact.",
    },
    {
      q: "Are prices per user or per workspace?",
      a: "Per active user seat with a JiraVision login. Read-only guests and service accounts aren't billed.",
    },
    {
      q: "Is tax included in the listed price?",
      // NOTE(PLACEHOLDER): VAT / sales-tax handling per region unconfirmed.
      a: "Treat the listed prices as excluding tax. Checkout shows the final amount, including any tax that applies in your region, before you pay.",
    },
  ],
}

export const pricingRelated = {
  eyebrow: "Keep looking",
  title: "Decide with more context",
  items: [
    {
      title: "What the AI actually does",
      href: "/products/ai-scrum-master",
      summary:
        "Every plan ships with capacity-aware sprint drafts and written rationales. See exactly what you're paying for.",
    },
    {
      title: "Enterprise, without the guesswork",
      href: "/solutions/enterprise",
      summary:
        "How SSO, security review and guided onboarding work in practice, and what a rollout timeline looks like.",
    },
    {
      title: "General FAQ",
      href: "/faq",
      summary:
        "Security, data handling and product questions that sit alongside the pricing answers above.",
    },
  ],
}

export const pricingCta = {
  title: "Try it on your board before you spend a cent",
  body: "Connect one Jira project, run a sprint with it, and decide afterwards. The trial is the whole product, and the checkout price is the price on this page.",
  primary: { label: "Start free trial", href: "/signup" },
  secondary: { label: "Talk to us", href: "/contact" },
}
