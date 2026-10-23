// Homepage content, separated from components per the redesign plan.
// NOTE(owner): every value marked PLACEHOLDER is unverified and must be
// replaced with real data or deleted before launch. Never ship invented numbers.

export const hero = {
  eyebrow: "AI-native project management",
  title: "Sprints that plan themselves. Teams that don't burn out.",
  subtitle:
    "JiraVision reads your team's capacity, history and workload, then helps you plan sprints and protect wellbeing — with you approving every decision.",
  primaryCta: { label: "Get started", href: "/signup" },
  secondaryCta: { label: "See how it works", href: "/#how-it-works" },
}

// Honest alternative to a "Trusted by" logo bar: what the product runs on and works with.
export const builtOn = {
  statement: "Built on open, accountable foundations",
  items: [
    { name: "IBM Granite", note: "AI models powering sprint insights" },
    { name: "Jira", note: "Two-way sync with your boards" },
    { name: "Human-in-the-loop", note: "Every AI suggestion needs your approval" },
  ],
}

export const problem = {
  title: "Sprint planning is set up to fail",
  intro:
    "Most teams plan against hope, not capacity — and the cost shows up as missed sprints, quiet burnout and metrics nobody trusts.",
  items: [
    {
      title: "Planning by gut feel",
      body: "Sprints get committed on optimism, not on who is actually available, skilled and at capacity this week.",
    },
    {
      title: "Burnout arrives late",
      body: "Overload hides in overtime, after-hours commits and shrinking review quality until someone quits.",
    },
    {
      title: "Metrics that mislead",
      body: "Velocity leaderboards reward the loudest work and quietly punish care, review and mentoring.",
    },
  ],
}

export interface Pillar {
  title: string
  href: string
  summary: string
  points: string[]
  mockup: "sprint" | "wellbeing" | "skill" | "equity"
}

export const pillars: Pillar[] = [
  {
    title: "AI Scrum Master",
    href: "/products/ai-scrum-master",
    summary:
      "Draft sprint plans that account for real capacity, past velocity and skills — then explain the reasoning behind every suggestion.",
    points: ["Capacity-aware drafts", "Transparent rationale", "You approve, it executes"],
    mockup: "sprint",
  },
  {
    title: "Team Wellbeing",
    href: "/products/team-wellbeing",
    summary:
      "Workload and mood signals aggregated anonymously, so you rebalance before burnout instead of after.",
    points: ["Early overload signals", "Anonymised by design", "Suggested re-balances"],
    mockup: "wellbeing",
  },
  {
    title: "Gamification",
    href: "/products/gamification",
    summary:
      "Skill trees and rewards built around real engineering work — reviews, mentoring and reliability count too.",
    points: ["Skills, not just speed", "Team-level recognition", "Opt-in and configurable"],
    mockup: "skill",
  },
  {
    title: "Ethical Metrics",
    href: "/products/ethical-metrics",
    summary:
      "Monitor workload distribution, inclusion and fairness indicators — and see exactly how each number is calculated.",
    points: ["Methodology on every metric", "Drift and imbalance alerts", "No surveillance scoring"],
    mockup: "equity",
  },
]

export const howItWorks = {
  id: "how-it-works",
  title: "How it works",
  intro: "Four steps, no black boxes.",
  steps: [
    {
      title: "Connect",
      body: "Link Jira and your calendar. JiraVision reads boards, issues and cycles — read-only until you say otherwise.",
    },
    {
      title: "Analyse",
      body: "Granite models summarise capacity, history and workload patterns across the team, anonymously aggregated.",
    },
    {
      title: "Plan",
      body: "Get a drafted sprint with per-item rationale. Adjust anything, then approve — nothing changes without you.",
    },
    {
      title: "Improve",
      body: "After each cycle, compare predictions with reality and watch the plan quality — and team load — steady out.",
    },
  ],
}

export interface TourTab {
  id: string
  label: string
  title: string
  body: string
  mockup: "sprint" | "wellbeing" | "skill" | "equity"
}

export const tour: TourTab[] = [
  {
    id: "planning",
    label: "Sprint planning",
    title: "A draft plan you can defend",
    body: "Every suggested item carries a reason: who has capacity, which skills match, what the last three sprints actually finished.",
    mockup: "sprint",
  },
  {
    id: "wellbeing",
    label: "Wellbeing signals",
    title: "Load, seen before it breaks",
    body: "Team-level workload heat, after-hours activity trends and check-in moods — aggregated so individuals stay private.",
    mockup: "wellbeing",
  },
  {
    id: "growth",
    label: "Skills & growth",
    title: "Progress mapped as a tree",
    body: "Visible skill paths for engineering practices, with recognition for review, pairing and knowledge sharing.",
    mockup: "skill",
  },
  {
    id: "fairness",
    label: "Fairness view",
    title: "Numbers with receipts",
    body: "Distribution of work, recognition and load across the team — each metric opens to show its exact formula.",
    mockup: "equity",
  },
]

// status: "live" = genuinely supported today; "planned" = roadmap, label it as such.
export const integrations = {
  title: "Works with your stack",
  intro: "Live integrations are available today; planned items are labelled and not yet shipped.",
  items: [
    { name: "Jira", status: "live" as const, note: "Issues, boards and sprints" },
    { name: "GitHub", status: "planned" as const, note: "PR and commit signals" },
    { name: "GitLab", status: "planned" as const, note: "Merge and pipeline signals" },
    { name: "Slack", status: "planned" as const, note: "Digests and check-ins" },
    { name: "Microsoft Teams", status: "planned" as const, note: "Notifications" },
    { name: "Google Calendar", status: "planned" as const, note: "Meeting-load context" },
  ],
}

export const responsibleAi = {
  title: "Security, privacy and responsible AI",
  intro:
    "AI that manages people's workloads has to answer for its decisions. Here is where we stand — plainly.",
  points: [
    {
      title: "Human-in-the-loop, always",
      body: "JiraVision proposes; your team decides. No sprint, reassignment or message is applied without approval.",
    },
    {
      title: "Anonymity by default",
      body: "Wellbeing and load signals are aggregated at team level. Individual answers are never shown to managers raw.",
    },
    {
      title: "Explained, not magic",
      body: "Every AI suggestion links to the data behind it and the model that produced it (IBM Granite). You can read the reasoning, disagree and edit.",
    },
    {
      title: "Honest about compliance",
      body: "We are early-stage: SOC 2 and GDPR alignment are in progress, not certifications we hold today. Ask us about specifics.",
    },
  ],
  link: { label: "Read our responsible-AI approach", href: "/about" },
}

export const useCases = {
  title: "Built for the people who carry the outcome",
  tabs: [
    {
      id: "eng-lead",
      label: "Engineering leads",
      headline: "Stop defending sprint commitments you didn't choose",
      body: "Walk into planning with a capacity-true draft, the evidence behind it, and a live view of who is quietly overloaded.",
      bullets: ["Draft plans with per-item rationale", "Load alerts before the retro", "Estimate quality tracked over time"],
    },
    {
      id: "people-ops",
      label: "People ops",
      headline: "See burnout risk without surveilling people",
      body: "Team-level wellbeing trends, anonymous check-ins and fairness indicators — designed so trust survives the dashboard.",
      bullets: ["Aggregated, privacy-first signals", "Workload distribution over months", "Early-warning thresholds you set"],
    },
    {
      id: "exec",
      label: "Executives",
      headline: "Delivery health you can act on",
      body: "Portfolio-level view of predictability, load balance and ethical metrics across teams — with methodology one click away.",
      bullets: ["Predictability per team", "Fairness and load across org", "No vanity metrics"],
    },
  ],
}

// PLACEHOLDER: outcomes must be replaced with verified numbers or removed.
// Until then, copy stays qualitative and the stat block renders the text as-is.
export const outcomes = {
  title: "What changes",
  intro: "We will publish measured results once we have them. Until then, here is what teams tell us they feel first.",
  qualitative: [
    "Planning meetings get shorter because the draft is ready before them.",
    "Rebalancing happens mid-sprint, not after a resignation.",
    "Metric disputes shrink when the formula is visible next to the number.",
  ],
  stats: [
    { value: "PLACEHOLDER", label: "reduction in sprint over-commitment" },
    { value: "PLACEHOLDER", label: "teams hitting predictable cadence" },
    { value: "PLACEHOLDER", label: "earlier burnout signals caught" },
  ],
}

// PLACEHOLDER testimonials: fictional examples for layout only. Replace with
// real, attributed customer quotes (or delete) before launch.
export const testimonials = {
  title: "What early teams say",
  items: [
    {
      quote:
        "The sprint draft was the first plan in two years my team didn't immediately argue with. It had already counted holidays.",
      name: "PLACEHOLDER — Engineering manager",
      role: "Series B fintech",
      initials: "EM",
    },
    {
      quote:
        "We caught a colleague carrying three sprints' worth of load mid-cycle and rebalanced. That used to surface in the exit interview.",
      name: "PLACEHOLDER — People ops lead",
      role: "Product studio",
      initials: "PO",
    },
    {
      quote:
        "Opening a metric and seeing its formula ended a standing argument with my staff engineers. That alone was worth it.",
      name: "PLACEHOLDER — CTO",
      role: "Health-tech startup",
      initials: "CT",
    },
  ],
}

// Mirrors /pricing (owner: confirm current prices before launch).
export const pricingTeaser = {
  title: "Simple plans, no surprises",
  intro: "Every plan includes the AI Scrum Master and wellbeing signals. Team size scales the rest.",
  plans: [
    { name: "Starter", price: "$9", cadence: "/user/month", blurb: "Up to 10 users, one Jira project", featured: false },
    { name: "Professional", price: "$19", cadence: "/user/month", blurb: "Unlimited projects, ethical metrics, priority support", featured: true },
    { name: "Enterprise", price: "$49", cadence: "/user/month", blurb: "SSO, advanced controls, dedicated onboarding", featured: false },
  ],
  cta: { label: "Compare all features", href: "/pricing" },
}

// Numeric mirror of pricingTeaser for the interactive seat slider (components/sections/pricing-seats.tsx).
export const seatModel = {
  annualDiscountPct: 20,
  trialDays: 14,
  perUserMonthly: { Starter: 9, Professional: 19, Enterprise: 49 } as Record<string, number>,
  defaultSeats: 12,
  minSeats: 5,
  maxSeats: 100,
}

export const faqTeaser = {
  title: "Questions teams ask us",
  items: [
    {
      q: "Does the AI change my boards on its own?",
      a: "No. JiraVision drafts and suggests; a human approves every change before it touches your tools.",
    },
    {
      q: "Will my manager see my individual wellbeing answers?",
      a: "Never raw. Check-ins and load signals are aggregated to team level before anyone sees them.",
    },
    {
      q: "Which AI model powers this?",
      a: "IBM Granite models, chosen for enterprise data handling. Each suggestion links to the reasoning behind it.",
    },
    {
      q: "How is this different from Jira's own insights?",
      a: "JiraVision plans forward — capacity-aware drafts, wellbeing early warnings and fairness metrics with visible methodology.",
    },
    {
      q: "What does it cost to start?",
      a: "Plans start at $9 per user per month, billed per seat. Annual billing saves 20%. See pricing for detail.",
    },
    {
      q: "What happens to our data?",
      a: "Your workspace data stays in your database. We never train public models on it, and you can export or delete at any time.",
    },
  ],
  moreLink: { label: "All questions", href: "/faq" },
}

export const finalCta = {
  title: "Plan sprints your team can actually finish",
  body: "Connect Jira, get your first capacity-aware draft in minutes, and approve every step yourself.",
  primary: { label: "Get started free", href: "/signup" },
  secondary: { label: "Talk to us", href: "/contact" },
}
