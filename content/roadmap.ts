// Roadmap data for /roadmap — now / next / later, commitment levels only, no dates.
// NOTE(owner): "Done" on this page may only ever come from content/changelog.ts.
// Nothing in the Later column is a promise; keep the exploratory wording on every item.

export interface RoadmapItem {
  title: string
  body: string
}

export const roadmapUpdated = "2026-10-28"

// --- Hero -------------------------------------------------------------------

export const hero = {
  eyebrow: "Roadmap",
  badge: "Living document",
  title: "Where JiraVision is going — without pretending we can promise dates",
  subtitle:
    "A now / next / later view of what is being built, what is queued and what we are only thinking about. Updated by hand whenever the work changes — never quietly.",
  bullets: [
    "Three columns, one rule: “Done” only comes from the public changelog.",
    "Commitment levels, not calendars — no dates are promised anywhere on this page.",
    "Items can move backwards, and we say so when they do.",
  ],
  primary: { label: "See what shipped", href: "/changelog" },
  secondary: { label: "Ask about an item", href: "/contact" },
}

// --- How the roadmap works (MethodSection) -----------------------------------

export const method = {
  title: "How to read this roadmap",
  intro:
    "Each column answers one question: how hard are we working on this right now? That is a statement about today, not a forecast. Nothing here is a contract — the only facts on this page are the changelog entries in the Done band.",
  rows: [
    {
      label: "Now",
      detail:
        "Actively being built in the current phase of this project. Code is being written and reviewed now. Still no date — being in progress is not a delivery promise.",
    },
    {
      label: "Next",
      detail:
        "Committed direction, uncommitted shape. Sequenced after the Now work, worth planning around, but the design may change and no date exists yet.",
    },
    {
      label: "Later",
      detail:
        "Exploratory — not a commitment. Things we genuinely consider and have not started. They may never ship, and that is a legitimate outcome.",
    },
    {
      label: "Done",
      detail:
        "Only ever filled from the dated changelog. If you cannot find it on /changelog, it is not done and will not appear in that band.",
    },
  ],
}

// --- Reading rules (ProblemSection) ------------------------------------------

export const readingRules = {
  eyebrow: "Ground rules",
  title: "Three rules this page sticks to",
  intro:
    "Roadmaps are usually the most dishonest page on a vendor site. These rules exist to keep ours from becoming that.",
  items: [
    {
      title: "No dates. On purpose.",
      body: "A small team with external dependencies (Jira's APIs, our hosting, the owner's day job) that publishes public dates eventually sells broken promises. Columns describe effort, not calendars.",
    },
    {
      title: "Done lives elsewhere.",
      body: "The Done band on this page is generated from the changelog, not hand-written. Work gets a dated entry there first; only then does it appear here as shipped.",
    },
    {
      title: "Movement is visible.",
      body: "Items get added, promoted, parked and occasionally dropped. If something that lived in Now or Next disappears, we mark the removal with a reason instead of silently editing.",
    },
  ],
}

// --- Update cadence (StepsSection) --------------------------------------------

export const updateCadence = {
  eyebrow: "Housekeeping",
  title: "How this page gets updated",
  intro: "Every release ends with a pass over this page. Four checks, in order:",
  steps: [
    {
      title: "Review",
      body: "After each release, the owner checks each item against what actually changed in the code — not against optimism in a planning doc.",
    },
    {
      title: "Move",
      body: "Items change columns only when the underlying work changes state. Nothing is promoted for optics and nothing is parked because it got inconvenient.",
    },
    {
      title: "Ship, then announce",
      body: "Shipping earns a changelog entry. The Done band is rebuilt from that changelog, so it can only ever contain verifiable facts.",
    },
    {
      title: "Note removals",
      body: "If an item leaves the board, its last column and the reason get mentioned here before the entry is archived.",
    },
  ],
}

// --- The board ----------------------------------------------------------------

// Now = genuinely in flight in this repo (REDESIGN_PLAN phases V2-5 and V2-6).
export const nowItems: RoadmapItem[] = [
  {
    title: "Roadmap & status, rebuilt",
    body: "The two transparency pages you are using — this board and the upgraded /status manifest — are the work in progress. They ship together, and this sentence is the honest way to describe a roadmap item while it is still happening.",
  },
  {
    title: "Comparison pages (/compare)",
    body: "Factual, dated comparisons against the tools teams usually leave behind. Every claim cites a source or is flagged as our own measurement — no invented feature matrices.",
  },
  {
    title: "Migration hub",
    body: "Guided, step-by-step checklists for moving off spreadsheets or another tracker. Checklists save locally in your browser as you work through them.",
  },
  {
    title: "Template library page",
    body: "The working-set templates already shown in the homepage carousel grow into a proper filterable page with previews for each template.",
  },
  {
    title: "Printable one-pagers",
    body: "A one-page summary per product, for teams where the decision needs a document the person who signs the invoice can actually read.",
  },
  {
    title: "Tests & QA pass",
    body: "Smoke tests across the marketing flows, unit tests for the sandbox, gamification and calculator logic that already shipped, plus the final performance and SEO cleanup.",
  },
]

export const nextItems: RoadmapItem[] = [
  {
    title: "Automated health checks for /status",
    body: "Today /status is a hand-maintained manifest. The next step is measured checks per component so the page can report observed reality. Until then it will keep saying it is manual — that caveat is part of the product.",
  },
  {
    title: "GitHub integration",
    body: "PR and review-load signals as a second data source behind the board views. Jira stays the anchor; GitHub has been the first name on our planned-integrations list since we published it.",
  },
  {
    title: "Roadmap feedback loop",
    body: "A way to attach your request or use case directly to an item here, routed through the same validated intake as the contact form. Until it exists, /contact is the door — and every message is read.",
  },
  {
    title: "Translation beyond the chrome",
    body: "Swahili and French are live for navigation and footer strings; body copy is not. Translating the marketing content section by section is queued, not dated.",
  },
]

// Later = exploratory, not a commitment. NOTE(PLACEHOLDER): each item below is
// exploratory positioning, not a plan of record — keep the framing if wording changes.
export const laterItems: RoadmapItem[] = [
  {
    // NOTE(PLACEHOLDER): exploratory — not a commitment.
    title: "GitLab integration",
    body: "Merge and pipeline signals alongside Jira data. Listed as planned in our integrations table; nothing has been started.",
  },
  {
    // NOTE(PLACEHOLDER): exploratory — not a commitment.
    title: "Slack surfaces",
    body: "Digests and check-ins delivered in the channel where the work already happens, instead of a dashboard you have to remember to open.",
  },
  {
    // NOTE(PLACEHOLDER): exploratory — not a commitment.
    title: "Microsoft Teams notifications",
    body: "The same notification idea for the other chat platform enterprise buyers keep asking about. Design not started.",
  },
  {
    // NOTE(PLACEHOLDER): exploratory — not a commitment.
    title: "Meeting-load context from calendars",
    body: "Using Google Calendar meeting load as context for workload signals, so after-hours charts are not blamed for what was actually a meeting-heavy week.",
  },
  {
    // NOTE(PLACEHOLDER): exploratory — not a commitment.
    title: "Hosted data layer",
    body: "Our form and newsletter storage uses a swappable JSON-file adapter with a hosted-database interface already sketched. Moving it to a real database is a when-it-hurts decision, not a roadmap one.",
  },
]

// --- How priorities are made (StepsSection) ------------------------------------

export const prioritySteps = {
  eyebrow: "Prioritisation",
  title: "How priorities are actually made",
  intro:
    "Not a scoring framework designed to look rigorous. This is the real sequence a small team uses, in the order the filters fire:",
  steps: [
    {
      title: "Repeated, specific demand",
      body: "The same problem from several unrelated teams outranks one very loud request. “Nice idea” feedback is thanked and set aside.",
    },
    {
      title: "The ethics filter",
      body: "If a feature requires anything from our refusal list — per-person activity scores, keyboard time, lines of code — it is dead here, permanently, no matter how much demand there is.",
    },
    {
      title: "Does it make the core loop true?",
      body: "Work that makes the Jira sync, the sprint drafts or the wellbeing signals more trustworthy outranks polish, always.",
    },
    {
      title: "Can we maintain it?",
      body: "A small team owns this forever. Anything that needs new infrastructure, a new vendor or dedicated operations has to prove it survives that question.",
    },
  ],
}

// --- Where signals come from (MethodSection) -----------------------------------

export const signalSources = {
  eyebrow: "Inputs",
  title: "Where the items on this page come from",
  intro: "Five sources, weighted. If something gets here from anywhere else, it does not belong here.",
  rows: [
    {
      label: "Contact & demo requests",
      detail:
        "Every submission through /contact is stored, read and themed. Requests are the loudest honest signal a pre-scale product has.",
    },
    {
      label: "Early-access conversations",
      detail:
        "What broke, what disappointed and what got quietly worked around in real usage. These become Now and Next items more often than feature requests do.",
    },
    {
      label: "Our own dogfooding",
      detail: "We run our boards through JiraVision. Items born from our own friction skip the debate about whether the problem is real.",
    },
    {
      label: "The refusal list",
      detail:
        "We publish what we will not build (see below). Repeated requests against that list become an explanation task, not a backlog item.",
    },
    {
      label: "The changelog itself",
      detail: "Follow-through we promised in earlier entries. A shipped feature that created a gap is due a closing item here.",
    },
  ],
}

// --- What we won't build (HonestFitSection) ------------------------------------

export const wontBuild = {
  title: "What will never reach this roadmap — ever",
  good: [
    "You judge a roadmap by what the vendor refuses to promise, not by how long the list is",
    "You want team data to stay aggregate-by-default — that stance has never wavered and will not",
    "You would rather we ship ten features you can audit than forty that need surveillance to work",
  ],
  bad: [
    "Per-person activity scores, keyboard time or lines of code — our published refusal list applies to the roadmap too",
    "Individual velocity leaderboards — they will not ship in any configuration, on any plan",
    "Dated public commitments — we will not trade honesty for a roadmap that looks decisive in a sales call",
  ],
}

// --- Influence band (mid-page CtaSection) --------------------------------------

export const influence = {
  title: "This page is a conversation starter, not a suggestion box that eats mail",
  body:
    "The strongest signal is not a vote — it is your specific story. What are you trying to do, what does it cost you today, and what would make you wrong for us? Write that to us and it lands in the same intake that built this page.",
  primary: { label: "Tell us what you need", href: "/contact" },
  secondary: { label: "See what we actually shipped", href: "/changelog" },
}

// --- Related (RelatedSection) ---------------------------------------------------

export const related = {
  title: "Check the receipts",
  items: [
    {
      title: "Changelog",
      href: "/changelog",
      summary: "The only source for anything claimed as Done. Dated entries describing real shipped work, newest first.",
    },
    {
      title: "Status",
      href: "/status",
      summary: "How every component of the service is doing right now, maintained by hand and labelled as such.",
    },
    {
      title: "Ethical Metrics",
      href: "/products/ethical-metrics",
      summary: "Where the refusal list lives as a product feature — the boundary this roadmap is built on.",
    },
  ],
}

// --- FAQ (FaqSection) — written inline here, roadmap-specific -------------------

export const faq = {
  title: "Questions about this roadmap",
  items: [
    {
      q: "Why don't you publish dates?",
      a: "Because publishing dates turns a planning document into an implied contract, and a small team with external dependencies cannot honestly hold one. The changelog gives you dated facts after the fact, which is the only date anyone here will commit to.",
    },
    {
      q: "If I ask for something, will it appear here?",
      a: "Not automatically. Requests flow through the same intake described above, and repeated, specific demand is what moves things — but plenty of good ideas never make the board. You will always get an answer via /contact, even when the answer is the refusal list.",
    },
    {
      q: "Can an item move backwards, from Now to Later or gone entirely?",
      a: "Yes, and that is a feature of the honesty rules, not a bug: work happens, reality changes, and pretending otherwise is how roadmaps end up as fiction. Movement gets noted on this page rather than silently edited.",
    },
    {
      q: "Is anything on this page a commitment?",
      a: "No. Now means we are actively building; Next means committed direction with an uncommitted shape; Later means we are thinking about it. The only facts on this page are the changelog entries in the Done band.",
    },
  ],
}

// --- Final CTA (CtaSection) -----------------------------------------------------

export const finalCta = {
  title: "The only roadmap that matters is what shipped",
  body:
    "If this page convinced you of anything, go check it against the changelog. That comparison is the point of building it this way.",
  primary: { label: "Read the changelog", href: "/changelog" },
  secondary: { label: "Talk to us", href: "/contact" },
}
