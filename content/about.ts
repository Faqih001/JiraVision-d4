// About-page copy and data.
// NOTE(PLACEHOLDER): the items below flagged "unconfirmed" must be replaced with
// owner-verified facts before launch — founding date/story specifics, team member
// names and headcounts, funding history, customer counts. Until then all rendered
// copy is deliberately generic-true ("built by a small team that kept hitting X")
// and never invents names, dates or numbers.
// Real anchors reused from content/site.ts: contact address (Mombasa, Kenya),
// responsible-AI stance from content/home.ts, updates from content/changelog.ts.

import type { Cta } from "@/components/sections/page-kit"

export const hero = {
  eyebrow: "About JiraVision",
  badge: "small team, open book",
  title: "A small team building calmer software for busy teams",
  subtitle:
    "We're on a mission to make project management tools more humane, ethical and effective — tools that put the humans doing the work first. Here's who we are, how we work and what we're honest about.",
  bullets: [
    "Built by a small, independent team that kept hitting the same planning walls",
    "We publish what we ship and how we're doing — changelog and status, in the open",
    "Every AI decision needs a human approval — it's in our code, not just our pitch",
  ],
  primary: { label: "Talk to the team", href: "/contact" } as Cta,
  secondary: { label: "See what we've shipped", href: "/changelog" } as Cta,
  photoId: "photo-1522071820081-009f0129c71c",
  photoAlt: "A small team collaborating around a shared laptop and whiteboard",
}

// Why the product exists — framed from real frustrations the product addresses,
// not a fabricated founding date. NOTE(PLACEHOLDER): specific first-team story unconfirmed.
export const origin = {
  eyebrow: "Why we built this",
  title: "We kept watching good teams break over bad plans",
  intro:
    "Not from a single dramatic moment — from a pattern we kept running into wherever sprint planning happened.",
  items: [
    {
      title: "Plans built on optimism, not capacity",
      body: "Sprints get committed before anyone asks who is actually available, skilled and at capacity this week. The mismatch shows up later as missed commitments and quiet heroics.",
    },
    {
      title: "Burnout that arrives too late to act on",
      body: "Overload hides in after-hours commits and shrinking review quality. By the time it's visible in a retro or an exit interview, the damage is done.",
    },
    {
      title: "Metrics nobody trusts",
      body: "Velocity leaderboards reward the loudest work and punish care, review and mentoring. Teams stop believing the numbers that are used to describe them.",
    },
  ],
}

// Story beats as SplitFeature data. Deliberately no dates, no named founders.
export const story = {
  // NOTE(PLACEHOLDER): exact first-team origin details (dates, names) are unconfirmed — keep this wording generic-true until the owner verifies.
  part1: {
    index: "01",
    title: "It started as a workaround, not a company",
    body:
      "Before JiraVision was a product, it was the thing we kept building by hand for our own teams — capacity spreadsheets, mood check-ins, sprint drafts with the reasoning written next to every item. Every project tool already had a board; none of them could answer 'can this team actually finish this plan, and what is it costing them?'",
    bullets: [
      "We planned against real availability, holidays and history — not gut feel",
      "Every suggestion carried a written rationale, so plans could be argued with",
      "Nothing touched the board without a human approving it first",
    ],
    photoId: "photo-1552664730-d307ca884978",
    photoAlt: "Colleagues reviewing plans together around a meeting table",
  },
  part2: {
    index: "02",
    title: "The workaround became a product because teams kept asking",
    body:
      "The more we shared the spreadsheets and check-in rituals, the more other teams asked for copies of them. JiraVision is that collection of practices turned into software — capacity-aware planning, wellbeing signals that stay anonymous, and metrics that show their formula. We're still small and still early: see our changelog for what's actually shipped and the status page for how it's running right now.",
    bullets: [
      "One product area per pillar: planning, wellbeing, growth and fair metrics",
      "Roadmap items are labelled 'planned' — we don't market what hasn't shipped",
      "Compliance work (SOC 2, GDPR alignment) is in progress, not a badge we claim",
    ],
    photoId: "photo-1600880292203-757bb62b4baf",
    photoAlt: "Two teammates working through a problem on one laptop",
  },
  // Third editorial beat: the philosophy, with its own photo.
  principle: {
    index: "03",
    title: "\"People first\" is an engineering constraint for us",
    body:
      "It isn't a tagline — it's a set of rules the product has to pass. If a feature would show a manager someone's raw mood answer, we don't build it. If a suggestion can't explain itself, it doesn't ship. If a metric's formula can't survive an angry staff engineer, it doesn't get a dashboard. Small teams can move like this because there's no layer between the person who hears the problem and the person who writes the fix.",
    bullets: [
      "Aggregated, anonymous signals by default — individual answers stay private",
      "Every AI suggestion links to the data and reasoning behind it",
      "We'd rather ship a smaller, defensible feature than a loud, vague one",
    ],
    photoId: "photo-1519389950473-47ba0277781c",
    photoAlt: "A team gathered around laptops, reviewing work together",
  },
}

// Values — stance imported in spirit from content/home.ts (responsible AI)
// and content/site.ts (positioning). No invented awards or rankings.
export const values = {
  eyebrow: "What we stand for",
  title: "The principles our product is actually built on",
  intro:
    "These aren't posters on a wall. Each one is enforced somewhere in the product, and you can hold us to all of them.",
  items: [
    {
      title: "People first",
      body: "Technology should serve the people doing the work, not the other way around. Plans are sized to humans — availability, skills and load — before they're sized to deadlines.",
    },
    {
      title: "Human-in-the-loop, always",
      body: "JiraVision proposes; your team decides. No sprint, reassignment or message is applied without approval. This is a product rule, not a marketing promise.",
    },
    {
      title: "Anonymity by default",
      body: "Wellbeing and load signals are aggregated at team level before anyone sees them. Individual answers are never surfaced raw to managers.",
    },
    {
      title: "Explained, not magic",
      body: "Every AI suggestion links to the data behind it and the model that produced it (IBM Granite). You can read the reasoning, disagree and edit.",
    },
    {
      title: "Honest about limits",
      body: "We're early-stage. SOC 2 and GDPR alignment are in progress, not certifications we hold today. Planned features are labelled planned. We'd rather say 'not yet'.",
    },
    {
      title: "Ethical excellence in the details",
      body: "Fairness means showing the formula next to the number, and designing metrics that don't quietly punish care, review and mentoring work.",
    },
  ],
}

// How we work — MethodSection rows. NOTE(PLACEHOLDER): cadence specifics
// (weekly ship, monthly calls) are unconfirmed until the owner verifies.
export const howWeWork = {
  eyebrow: "How we work",
  title: "Small team, short loops, written down",
  intro:
    "Being small isn't a weakness to hide — it's the operating model. Here's how the work actually flows.",
  rows: [
    { label: "Small by design", detail: "Everyone who touches the product talks to the teams using it. There's no layer between a customer's problem and the person who fixes it." },
    { label: "One owner, end to end", detail: "Each product area — planning, wellbeing, growth, metrics — has a named internal owner who drafts, builds and supports it." },
    { label: "Ship small, ship visible", detail: "Changes go out in increments we can stand behind, and each one is written up in the public changelog — including fixes." },
    { label: "Decisions on evidence", detail: "Roadmap calls are argued with usage signals and customer conversations, not with the loudest opinion in the room." },
    { label: "Async-first, in the open", detail: "We work across timezones and default to writing things down. What we decide ends up where you can read it." },
    { label: "Ask us anything", detail: "Compliance status, roadmap reasoning, where a number comes from — reach us directly at /contact and a human answers." },
  ],
}

// Team — deliberately NO fake identities. Roles/shape only, with an honest
// "named profiles coming soon". NOTE(PLACEHOLDER): real names/headcount pending owner input.
export const team = {
  eyebrow: "The team",
  title: "The shape of us, before the headshots",
  intro:
    "We're a small, independent team — engineers, designers and researchers who have run the projects we now build software for. Named profiles and photos are genuinely coming soon; until then, here's the honest shape of who does what.",
  items: [
    {
      who: "Product & engineering",
      body: "Own the AI planning and metrics pipeline end to end, from model choice to board writes — always behind an approval step.",
      wins: [
        "Read-only access to your tools until you say otherwise",
        "Every suggestion carries a rationale you can argue with",
        "Fixed and hardened each release, logged in the changelog",
      ],
    },
    {
      who: "Design & research",
      body: "Talk to teams before writing specs, and test that signals actually help before they reach a dashboard.",
      wins: [
        "Wellbeing check-ins designed to stay anonymous by construction",
        "Skill paths built around real engineering work, not arcade points",
        "Every formula reviewable in the UI before launch",
      ],
    },
    {
      who: "Customer & community",
      body: "The people who answer support mail, run onboarding and carry your questions into the next planning session.",
      wins: [
        "Direct line — conversations, not ticket queues",
        "Roadmap items labelled live vs planned, honestly",
        "Status and incidents published at /status",
      ],
    },
  ],
}

// How we decide what to build — StepsSection.
export const decisions = {
  eyebrow: "From problem to shipped",
  title: "How something earns a place in JiraVision",
  intro:
    "Four gates. Anything that can't clear all four — including features that would make demos look better — doesn't ship.",
  steps: [
    { title: "Listen", body: "It starts with a real team hitting a real wall: support conversations, onboarding friction or a workload pattern we can see in aggregate." },
    { title: "Draft in daylight", body: "The idea goes on the roadmap labelled 'planned'. If it touches people's workloads, the privacy and rationale design is settled before code." },
    { title: "Ship the smallest defensible slice", body: "We release the version we can fully explain — methodology visible, human approval intact — and never a black box to fill a gap in marketing." },
    { title: "Write it down", body: "Every release lands in the public changelog with the reasoning; service reality lives on the status page. You can audit us without asking permission." },
  ],
}

// Transparency commitments — FeatureGridSection. These are commitments we make,
// explicitly not certifications we hold (labels matter).
export const transparency = {
  eyebrow: "In the open",
  title: "What you can check for yourself",
  intro:
    "Trust us less, verify more — that's the design. Every commitment below has a public artifact you can look at right now.",
  items: [
    { title: "Public changelog", body: "Everything we ship is written up at /changelog — features, improvements and fixes, newest first. No buried bad news." },
    { title: "Live status page", body: "Service health for the site, dashboard, Jira sync and notifications is published at /status, not kept behind a support ticket." },
    { title: "Visible methodology", body: "Every fairness and workload metric links to its exact formula and data window inside the product — numbers with receipts." },
    { title: "Planned vs live labelling", body: "Integrations and roadmap items are marked 'planned' until they genuinely ship. We don't demo vaporware as a feature list." },
    { title: "Responsible-AI stance", body: "Human-in-the-loop approvals, anonymous aggregation and model attribution (IBM Granite) are product defaults. These are our commitments, not certifications." },
    { title: "Honest compliance story", body: "SOC 2 and GDPR alignment are in progress for an early-stage team. Ask us specifics at /contact and get a straight answer." },
  ],
}

// Honest fit — as a company/vendor, not a product feature.
export const honestFit = {
  title: "Whether we're the right team for you",
  good: [
    "You want a vendor that answers directly — the person replying has likely shipped the thing you're asking about",
    "You value privacy-by-construction: anonymous signals and explainable AI over surveillance dashboards",
    "You're fine giving feedback that visibly shapes the roadmap",
    "You want to see the formula, the data window and the changelog before you trust a metric",
  ],
  bad: [
    "You need SOC 2 paperwork or enterprise procurement checklists today — alignment is in progress, certificates aren't",
    "You want a 24/7 follow-the-sun support org; we're a small team in one primary timezone region",
    "You need an unopinionated tool that mirrors whatever you already do — our defaults are deliberately principled",
    "You expect a huge global company; we'd rather be honest about being a small one",
  ],
}

// Milestones — taken from real changelog data (content/changelog.ts), not invented.
export const milestones = {
  title: "What we've actually shipped",
  // href target for the section's built-in "Full changelog" link is /changelog.
}

// Company FAQ (not product FAQ — that lives at /faq).
export const faq = {
  title: "Questions about us as a company",
  items: [
    {
      q: "How big is the team?",
      a: "Small, and deliberately so — engineers, designers and researchers who all talk directly to the teams using the product. Named profiles are coming soon; until then we'd rather show you the shape of the team than fake a headshot wall.",
    },
    {
      q: "Where are you based?",
      a: "Our home is Likoni, Mombasa, Kenya (it's on our contact page with the phone and email to prove it), and we work async with teams across timezones.",
    },
    // NOTE(PLACEHOLDER): if the owner confirms investment or ownership facts, publish them here plainly.
    {
      q: "Are you funded? Who owns JiraVision?",
      a: "We're an early-stage, independent company — and we're not going to show you invented funding rounds or milestone numbers. If ownership or investment facts get confirmed, we'll publish them here plainly.",
    },
    {
      q: "Do you have SOC 2 or GDPR certification?",
      a: "Not yet, and we say so up front: alignment work is in progress. What we do have today are concrete product defaults — human approval on every AI action, anonymous aggregation and visible metric methodology.",
    },
    {
      q: "How do we give feedback or reach a human?",
      a: "Straight to the team: the contact page lists real channels, and support and partnerships both land with people who work on the product. Careers openings live at /careers.",
    },
  ],
}

// Internal links only — every route below exists today.
export const related = {
  eyebrow: "Verify us",
  title: "See the receipts",
  items: [
    { title: "Changelog", href: "/changelog", summary: "Every release, written up newest-first — the real milestone list, not a highlight reel." },
    { title: "Status", href: "/status", summary: "Live service health for the site, dashboard, Jira sync and notifications." },
    { title: "Blog", href: "/resources/blog", summary: "Notes on AI-native project management from the people building it." },
    { title: "Careers", href: "/careers", summary: "Open roles and how a small team works — join us if the honest version appeals." },
    { title: "Pricing", href: "/pricing", summary: "Simple plans, no surprises: pricing scales by seat and every plan includes the core." },
    { title: "FAQ", href: "/faq", summary: "Questions teams ask about the product — data, approvals, models and cost." },
  ],
}

export const cta = {
  title: "Build the humane side of project management with us",
  body:
    "Whether you're a team that wants calmer sprints, a candidate who wants to ship with a small honest crew, or a partner with an idea — the fastest way to reach a human is a direct message.",
  primary: { label: "Talk to us", href: "/contact" } as Cta,
  secondary: { label: "See open roles", href: "/careers" } as Cta,
}
