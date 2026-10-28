// The single FAQ dataset for /faq — collected from every FAQ that already
// existed across the marketing content, mapped to its source in comments:
//   - the previous inline /faq page (answers rewritten where they contradicted
//     what the product pages actually document — see dedupe notes per entry)
//   - content/home.ts faqTeaser
//   - content/products.ts per-product faq arrays
//   - content/pricing-page.ts pricingFaq
//   - content/about.ts faq (company)
//   - content/solutions.ts per-solution faq arrays
// Near-identical questions are merged into one entry (the merged answer keeps
// every distinct fact from the sources — nothing is invented here).

export type FaqCategory = "Product" | "Pricing" | "Migration" | "Company" | "Security"

export interface FaqEntry {
  id: string
  q: string
  a: string
  category: FaqCategory
  /** Where to send the reader for the longer answer. Only existing routes. */
  relatedHref?: string
}

export const faqCategories: FaqCategory[] = ["Product", "Pricing", "Migration", "Company", "Security"]

type FaqDraft = Omit<FaqEntry, "category">

const productFaqs: FaqDraft[] = [
  {
    // source: old /faq "What is JiraVision?" — aligned with content/products.ts
    id: "what-is-jiravision",
    q: "What is JiraVision?",
    a: "JiraVision is an AI-assisted project management suite for humane delivery: AI Scrum Master (capacity-aware sprint drafts with a written rationale per item), Team Wellbeing (anonymous load and mood signals aggregated before anyone sees them), Gamification (recognition for reviews, mentoring and docs — not speed rankings) and Ethical Metrics (numbers that print their formula). It reads your Jira board read-only and never writes anything without a human approval.",
    relatedHref: "/about",
  },
  {
    // source: old /faq "What is the AI Scrum Master feature?" — rewritten from
    // content/products.ts ai-scrum-master (approval gate, mid-sprint re-planning)
    id: "what-is-ai-scrum-master",
    q: "What is the AI Scrum Master feature?",
    a: "The AI Scrum Master drafts your sprint plan before the meeting: it reads capacity, history and skills, then writes the reason for every suggested item in plain language. It flags bottlenecks and produces mid-sprint re-drafts that name what slips and why — but nothing touches your board until a human approves the draft.",
    relatedHref: "/products/ai-scrum-master",
  },
  {
    // source: old /faq "How does the Team Wellbeing feature work?" — rewritten:
    // the old answer claimed it analyses team communications; the product
    // explicitly never reads message content (content/products.ts wellbeing method).
    id: "how-does-team-wellbeing-work",
    q: "How does the Team Wellbeing feature work?",
    a: "Team Wellbeing combines a 30-second anonymous check-in per cycle with workload signals already in your tools — Jira activity timestamps and calendar meeting load, never message content. Answers are aggregated to team level before anyone sees them, small groups are merged rather than shown, and the thresholds themselves are set by your team.",
    relatedHref: "/products/team-wellbeing",
  },
  {
    // source: old /faq "What gamification elements does JiraVision offer?" —
    // rewritten from content/products.ts gamification (skill trees over leaderboards).
    id: "what-gamification-offers",
    q: "What gamification elements does JiraVision offer?",
    a: "Your team votes on which behaviours earn points — reviews, mentoring, onboarding, tech-debt work — and they map onto skill-tree branches (Craft, Collaboration, Stewardship) instead of speed leaderboards. Points attach to verifiable Jira events, not self-reporting, and individual rankings sit behind an explicit guardrail switch that shows you the consequences first.",
    relatedHref: "/products/gamification",
  },
  {
    // source: old /faq "What are Ethical Metrics?" — rewritten from
    // content/products.ts ethical-metrics (the old answer listed pay-equity
    // reporting, which is not what the product documents).
    id: "what-are-ethical-metrics",
    q: "What are Ethical Metrics?",
    a: "A deliberately small, documented set of team-level indicators — predictability, workload distribution, review equity, after-hours drift — where every card opens to show its formula, source events and exclusions. It ships with a published refusal list: no lines of code, no per-person velocity, no activity or keyboard-time scores.",
    relatedHref: "/products/ethical-metrics",
  },
  {
    // source: content/products.ts gamification faq
    id: "gamification-not-leaderboard",
    q: "Isn't gamification just a leaderboard?",
    a: "The default is the opposite: skill trees and team totals. Individual rankings exist only behind an explicit guardrail switch that shows you the consequences first.",
    relatedHref: "/products/gamification",
  },
  {
    // source: content/products.ts ethical-metrics faq
    id: "metrics-refusal-list",
    q: "Which metrics do you refuse to build?",
    a: "Lines of code, per-person velocity, activity or keyboard-time scores, and any per-person ranking view by default. The full refusal list is part of the product docs.",
    relatedHref: "/products/ethical-metrics",
  },
  {
    // source: merged content/home.ts faqTeaser "Which AI model powers this?" +
    // content/products.ts ai-scrum-master faq "Which model, and can we see the reasoning?"
    id: "which-model",
    q: "Which AI model powers this, and can we see the reasoning?",
    a: "IBM Granite models, chosen for enterprise data handling. In the AI Scrum Master the selection itself is a deterministic algorithm — same inputs, same draft — and Granite turns the selection trace into plain-English rationale. Model confidence and predicted-vs-actual accuracy are displayed, never hidden.",
    relatedHref: "/products/ai-scrum-master",
  },
  {
    // source: merged content/home.ts faqTeaser "How is this different from Jira's
    // own insights?" + content/products.ts ai-scrum-master faq (Advanced Insights)
    id: "vs-jira-insights",
    q: "How is this different from Jira's own Advanced Insights?",
    a: "Jira's insights report the past. JiraVision plans forward — capacity-aware sprint drafts with per-item rationale, wellbeing early warnings and fairness metrics with visible methodology — all behind a human approval gate.",
    relatedHref: "/products/ai-scrum-master",
  },
  {
    // source: old /faq "Is JiraVision suitable for remote teams?" — merged with
    // content/solutions.ts remote-teams faq (async pulse, hybrid views)
    id: "suitable-for-remote-teams",
    q: "Is JiraVision suitable for remote teams?",
    a: "Yes — it's built for distributed teams. The wellbeing pulse is async and runs on your cycle, not a shared meeting slot; fairness views measure activity spread across the day rather than who sits in the room; and recognition runs on async Jira events. The same signals apply to hybrid teams — they don't care where anyone sits.",
    relatedHref: "/solutions/remote-teams",
  },
  {
    // source: content/solutions.ts agencies faq
    id: "billable-hours",
    q: "Do you track billable hours?",
    a: "We don't. JiraVision measures workload and delivery signals, not time for invoicing. If hours-based billing is the gap you need closed, ask us at /contact and we'll tell you honestly whether we help.",
    relatedHref: "/contact",
  },
]

const pricingFaqs: FaqDraft[] = [
  // content/pricing-page.ts pricingFaq carried over verbatim, plus the old
  // /faq "What plans does JiraVision offer?" rewritten to the actual tiers
  // documented in content/home.ts seatModel (Free/Pro/Business never existed
  // in the v2 pricing data, so that claim is dropped).
  {
    id: "what-plans",
    q: "What plans does JiraVision offer?",
    a: "Three: Starter at $9 per user per month, Professional at $19 and Enterprise at $49 — billed per active user seat, with 20% off on annual billing. Every plan ships with the core products; read-only guests and service accounts aren't billed. Current numbers live on /pricing, not in this answer.",
    relatedHref: "/pricing",
  },
  {
    id: "free-trial",
    q: "Is there really a free trial?",
    a: "14 days on any plan, no credit card. If you do nothing on day 15, the workspace goes read-only — you can export data or come back and pick a plan whenever.",
    relatedHref: "/signup",
  },
  {
    id: "change-plans",
    q: "Can I change plans later?",
    a: "Yes. Upgrades take effect immediately and are prorated for the rest of the period; downgrades take effect at the start of your next billing cycle so you keep what you paid for.",
    relatedHref: "/pricing",
  },
  {
    id: "cancel-data",
    q: "What happens to my data if I cancel?",
    a: "Access continues until the end of the period you've paid for. During that window you can export everything; what happens afterwards is governed by the retention terms in our privacy policy.",
    relatedHref: "/privacy",
  },
  {
    id: "nonprofit-education",
    q: "Do you offer discounts for nonprofits or education?",
    a: "We intend to, and the terms are still being finalised. Reach us through the contact page and we'll tell you honestly what applies today rather than quote a discount we haven't set.",
    relatedHref: "/contact",
  },
  {
    id: "annual-billing",
    q: "How does annual billing work?",
    a: "You pre-pay 12 months at 20% off the monthly per-user rate. If seats go up mid-year, the added seats bill at the same discounted rate for the rest of the term.",
    relatedHref: "/pricing",
  },
  {
    id: "payment-methods",
    q: "What payment methods do you accept?",
    a: "Major credit and debit cards self-serve. Bank transfer and purchase orders are available on annual Enterprise agreements — start at /contact.",
    relatedHref: "/contact",
  },
  {
    id: "per-user-or-workspace",
    q: "Are prices per user or per workspace?",
    a: "Per active user seat with a JiraVision login. Read-only guests and service accounts aren't billed.",
    relatedHref: "/pricing",
  },
  {
    id: "tax-included",
    q: "Is tax included in the listed price?",
    a: "Treat the listed prices as excluding tax. Checkout shows the final amount, including any tax that applies in your region, before you pay.",
    relatedHref: "/pricing",
  },
]

const migrationFaqs: FaqDraft[] = [
  // Sources: startup/enterprise/remote solution FAQs + the old /faq integration
  // question, rewritten: Asana, Trello and Teams integrations were never
  // documented in content/products.ts, so the honest version names only what
  // is live (Jira, read-only) and what is labelled planned.
  {
    // source: content/solutions.ts startups faq
    id: "setup-time",
    q: "We're tiny and busy — how long does setup actually take?",
    a: "An afternoon, realistically: connect one Jira project (read-only), keep the defaults, and review the first capacity-aware draft before your next planning round. There's no migration because there's nothing to migrate — your board stays yours.",
    relatedHref: "/solutions/startups",
  },
  {
    // source: merged content/products.ts ai-scrum-master "Does it work without
    // Jira?" + content/solutions.ts startups "not on Jira yet… locked out?"
    id: "works-without-jira",
    q: "Does it work without Jira?",
    a: "Jira is the live integration today. GitHub and GitLab support is on the roadmap and labelled planned, not available — we'd rather say that than sell you 'soon'. If the timing matters for you, talk to us at /contact.",
    relatedHref: "/contact",
  },
  {
    // source: content/solutions.ts enterprise faq
    id: "integration-list-short",
    q: "Why is your integration list so short?",
    a: "Because we label things honestly. Jira is live and read-only. GitHub, GitLab and Slack are roadmap items shown as planned, not available — we'd rather under-promise to a procurement team than over-promise.",
    relatedHref: "/solutions/enterprise",
  },
  {
    // source: old /faq "How does JiraVision integrate with existing tools?" —
    // rewritten to documented integrations only (see header note).
    id: "how-integration-works",
    q: "How does JiraVision connect to our existing tools?",
    a: "You point JiraVision at a Jira project and it reads boards, issues, cycles and calendars — read-only. There's no data import to babysit: your board stays the source of truth, and JiraVision only writes the sprint content a human approves. Slack digests and calendar context are roadmap items, labelled planned.",
    relatedHref: "/products/ai-scrum-master",
  },
  {
    // source: content/solutions.ts startups faq
    id: "need-scrum-master",
    q: "Do we need a Scrum master for this to work?",
    a: "No. The draft arrives written and reasoned; whoever leads the plan — founder, tech lead, the team rotating — edits and approves it. It's planning help, not ceremony enforcement.",
    relatedHref: "/products/ai-scrum-master",
  },
]

const companyFaqs: FaqDraft[] = [
  // source: content/about.ts faq (the old /faq "What kind of support…" entry is
  // folded into the last one: it promised community forums, which don't exist).
  {
    id: "team-size",
    q: "How big is the team?",
    a: "Small, and deliberately so — engineers, designers and researchers who all talk directly to the teams using the product. Named profiles are coming soon; until then we'd rather show you the shape of the team than fake a headshot wall.",
    relatedHref: "/about",
  },
  {
    id: "where-based",
    q: "Where are you based?",
    a: "Our home is Likoni, Mombasa, Kenya (it's on our contact page with the phone and email to prove it), and we work async with teams across timezones.",
    relatedHref: "/contact",
  },
  {
    id: "funded-owned",
    q: "Are you funded? Who owns JiraVision?",
    a: "We're an early-stage, independent company — and we're not going to show you invented funding rounds or milestone numbers. If ownership or investment facts get confirmed, we'll publish them plainly.",
    relatedHref: "/about",
  },
  {
    // source: content/about.ts faq "How do we give feedback or reach a human?"
    // merged with the old /faq support answer (forum claim dropped — no forum).
    id: "reach-a-human",
    q: "How do we give feedback, get support, or reach a human?",
    a: "Straight to the team: the contact page lists real channels, and support and partnerships both land with people who work on the product. There's a bookable demo and a quote request on the same page — we don't point you at a community forum we haven't built.",
    relatedHref: "/contact",
  },
]

const securityFaqs: FaqDraft[] = [
  // The old /faq "How secure is JiraVision?" claimed SOC 2 Type II compliance;
  // content/about.ts and content/solutions.ts both state it isn't certified
  // yet, so the honest entry below replaces that answer.
  {
    // source: merged content/home.ts "Does the AI change my boards on its own?" +
    // content/products.ts ai-scrum-master "Does it write to my Jira on its own?" +
    // content/solutions.ts enterprise "Can the AI change anything on its own?"
    id: "ai-writes-alone",
    q: "Does the AI change anything in our tools on its own?",
    a: "No. JiraVision is read-only until a human approves a draft, and every applied change is logged with who approved it and when. Reads are automated; writes are not — and a whole draft can be reverted in one action.",
    relatedHref: "/products/ai-scrum-master",
  },
  {
    // source: merged content/home.ts "Will my manager see my individual answers?" +
    // content/products.ts team-wellbeing faq
    id: "manager-sees-answers",
    q: "Can my manager see my individual wellbeing answers?",
    a: "Never raw. Check-ins are aggregated to team level before display, and small groups are merged. The team sees the same aggregate leadership does.",
    relatedHref: "/products/team-wellbeing",
  },
  {
    // source: merged content/products.ts team-wellbeing "Isn't after-hours
    // tracking just surveillance?" + content/solutions.ts remote-teams bossware faq
    id: "after-hours-surveillance",
    q: "Isn't after-hours tracking just surveillance waiting to happen?",
    a: "We track the team's trend, not a person's timesheet, and the team sets the threshold. Manager-facing drill-down stops at the team boundary — there is no per-person overtime or activity report to enable. If you want per-person activity reports, this is the wrong product — deliberately.",
    relatedHref: "/products/team-wellbeing",
  },
  {
    // source: merged content/about.ts faq + content/solutions.ts enterprise faq
    // (same question, same honest present-tense answer)
    id: "soc2-gdpr",
    q: "Do you have SOC 2 or GDPR certification?",
    a: "Not yet, and we say so up front: alignment work is in progress. What we do have today are concrete product defaults — human approval on every AI action, anonymous aggregation and visible metric methodology. Contact us with your specific requirements and you'll get a direct answer: yes, no, or a date.",
    relatedHref: "/contact",
  },
  {
    // source: merged content/home.ts "What happens to our data?" +
    // content/solutions.ts enterprise "Where does our data live and go?"
    id: "where-data-lives",
    q: "Where does our data live, and what happens to it?",
    a: "Your workspace data stays in your database. It's never used to train public models, and you can export or delete it at any time. IBM Granite powers the reasoning layer, and each output links back to its source data.",
    relatedHref: "/privacy",
  },
  {
    // source: content/products.ts team-wellbeing faq
    id: "what-data-read",
    q: "What data does JiraVision actually read?",
    a: "Check-in answers (anonymous by default), Jira activity timestamps and calendar meeting load. No message content, no screen capture, no keystrokes — the full list is in each product's method section.",
    relatedHref: "/products/team-wellbeing",
  },
]

export const faqEntries: FaqEntry[] = [
  ...productFaqs.map((e) => ({ ...e, category: "Product" as const })),
  ...pricingFaqs.map((e) => ({ ...e, category: "Pricing" as const })),
  ...migrationFaqs.map((e) => ({ ...e, category: "Migration" as const })),
  ...companyFaqs.map((e) => ({ ...e, category: "Company" as const })),
  ...securityFaqs.map((e) => ({ ...e, category: "Security" as const })),
]

export interface FaqCategoryGuide {
  blurb: string
  links: { label: string; href: string }[]
}

// blurb + where-to-look-next chips per category. All routes exist today.
export const faqCategoryGuide: Record<FaqCategory, FaqCategoryGuide> = {
  Product: {
    blurb: "What the four products actually do — drafts, signals, recognition and metrics — and what they don't.",
    links: [
      { label: "AI Scrum Master", href: "/products/ai-scrum-master" },
      { label: "Team Wellbeing", href: "/products/team-wellbeing" },
      { label: "Gamification", href: "/products/gamification" },
      { label: "Ethical Metrics", href: "/products/ethical-metrics" },
    ],
  },
  Pricing: {
    blurb: "Seats, trials, billing cycles and the tax questions — answered in the present tense.",
    links: [
      { label: "Pricing page", href: "/pricing" },
      { label: "Start free trial", href: "/signup" },
      { label: "Talk to us", href: "/contact" },
    ],
  },
  Migration: {
    blurb: "Getting connected: what's live (Jira, read-only), what's planned, and why there's no migration to do.",
    links: [
      { label: "For startups", href: "/solutions/startups" },
      { label: "AI Scrum Master setup", href: "/products/ai-scrum-master" },
      { label: "Ask about timing", href: "/contact" },
    ],
  },
  Company: {
    blurb: "Who we are, where we're based, how funding actually stands — and how to reach a human.",
    links: [
      { label: "About us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Service status", href: "/status" },
    ],
  },
  Security: {
    blurb: "Approval gates, aggregation before display, refusal lists and certification status — said plainly.",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Enterprise answers", href: "/solutions/enterprise" },
    ],
  },
}

export const faqCountByCategory: Record<FaqCategory, number> = faqCategories.reduce(
  (acc, category) => {
    acc[category] = faqEntries.filter((e) => e.category === category).length
    return acc
  },
  {} as Record<FaqCategory, number>,
)

// Editorial picks for the "most asked" band on /faq.
export const faqPopularIds: string[] = [
  "ai-writes-alone",
  "manager-sees-answers",
  "which-model",
  "what-plans",
  "free-trial",
  "vs-jira-insights",
]
