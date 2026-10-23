// Content for the four /solutions/* audience pages. Composed by components/sections/page-kit.tsx.
// Honesty rules (REDESIGN_PLAN): no invented numbers, no fake customers or logos, nothing
// uncertified claimed as certified. Unverified quotes are flagged NOTE(PLACEHOLDER).
// Exact prices live in content/home.ts seatModel / the /pricing page — never restated here.

export interface SolutionCta {
  label: string
  href: string
}

export type SolutionDemo = "sandbox" | "gamification" | "equity" | "calculators" | "none"

export interface SolutionContent {
  slug: string
  name: string
  navSummary: string
  hero: {
    eyebrow: string
    title: string
    subtitle: string
    bullets: string[]
    primary: SolutionCta
    secondary: SolutionCta
    badge?: string
  }
  problem: { title: string; intro: string; items: { title: string; body: string }[] }
  features: { eyebrow: string; title: string; intro: string; items: { title: string; body: string }[] }
  /** Maps this audience's jobs to the product pages (/products/*) that do them. */
  productMap: { eyebrow: string; title: string; items: { title: string; href: string; summary: string }[] }
  deepDives: { title: string; body: string; bullets: string[]; photoId: string; photoAlt: string }[]
  demo: SolutionDemo
  workflow: { title: string; intro: string; steps: { title: string; body: string }[] }
  audience: { title: string; intro: string; items: { who: string; body: string; wins: string[] }[] }
  fit: { title: string; good: string[]; bad: string[] }
  method: { title: string; intro: string; rows: { label: string; detail: string }[] }
  quotes: { quote: string; name: string; role: string }[]
  updateTitles: string[]
  faq: { q: string; a: string }[]
  related: { title: string; href: string; summary: string }[]
  cta: { title: string; body: string; primary: SolutionCta; secondary: SolutionCta }
}

const solutionRelated = (self: string) =>
  [
    {
      title: "For agencies",
      href: "/solutions/agencies",
      summary: "Multi-client workloads, honest client reporting and utilization that counts recovery.",
    },
    {
      title: "For enterprise",
      href: "/solutions/enterprise",
      summary: "Approval-gated AI, audit-friendly metrics and a compliance story without theatre.",
    },
    {
      title: "For remote teams",
      href: "/solutions/remote-teams",
      summary: "Async rituals, timezone fairness and after-hours load treated as a team signal.",
    },
    {
      title: "For startups",
      href: "/solutions/startups",
      summary: "Founder-led planning, small-team focus and per-seat pricing that scales when you do.",
    },
  ].filter((r) => r.href !== `/solutions/${self}`)

export const solutions: SolutionContent[] = [
  {
    slug: "agencies",
    name: "For agencies",
    navSummary: "Multi-client delivery without the 2am scramble or the rosy status deck.",
    hero: {
      eyebrow: "Solutions · Agencies",
      title: "Run five client accounts without running your team flat",
      subtitle:
        "The same developer is the best fit on three accounts this week. JiraVision puts that fight on a capacity map, drafts sprints per account against real availability, and reports to clients from the live board — not from hope.",
      bullets: [
        "Portfolio-wide load view across every client project",
        "Sprint drafts per account, with a written rationale",
        "Client updates built from the same numbers you plan with",
      ],
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "See plans and seats", href: "/pricing" },
      badge: "One Jira connect per account",
    },
    problem: {
      title: "Agency delivery breaks between the accounts, not inside them",
      intro:
        "Each client project looks fine in isolation. The trouble starts in the overlaps — shared people, competing Thursdays, and status reports written after the slide template but before the truth.",
      items: [
        {
          title: "The priority fight is decided by volume",
          body: "When three account leads need the same senior dev on the same day, whoever asks loudest wins. Nobody can see the fourth thing that quietly slips.",
        },
        {
          title: "Utilization hides its own cost",
          body: "100% booked is 0% resilient. Padded weeks don't show up as over-utilisation — they show up as weekend commits, review quality drift and a resignation two months later.",
        },
        {
          title: "Status decks drift from the board",
          body: "The client update says 'on track' because someone wrote it from memory on Friday afternoon. The board said 'three items stuck in review'. Both can't be true for long.",
        },
      ],
    },
    features: {
      eyebrow: "What changes",
      title: "One evidence base for resourcing, planning and reporting",
      intro:
        "Nothing here is a new spreadsheet to maintain. Every view reads from the Jira projects you already run per account.",
      items: [
        { title: "Cross-account capacity", body: "See each person's load summed over every client project they touch, before anyone commits them to another one." },
        { title: "Per-account sprint drafts", body: "The AI Scrum Master drafts each account's sprint against that shared availability — holidays and all the other accounts included." },
        { title: "Rationale on every call", body: "Why Priya got the fintech spike instead of the launch fix is written down, in plain language, and attached to the item." },
        { title: "Reports from live data", body: "Client-facing progress draws on the same committed-versus-delivered figures the team works from, with the formula on the card." },
        { title: "Care work counted", body: "Handover notes, client rescue sessions and careful reviews land on skill trees — the glue work that never appears in a status column." },
        { title: "Portfolio burnout drift", body: "After-hours and load-spread signals are tracked across all accounts as a team trend, so the crunch shows up before the exit interview." },
      ],
    },
    productMap: {
      eyebrow: "Your toolkit",
      title: "Which JiraVision product does which agency job",
      items: [
        { title: "AI Scrum Master", href: "/products/ai-scrum-master", summary: "Drafts each client sprint against real, cross-account capacity — a proposal until a producer approves it." },
        { title: "Ethical Metrics", href: "/products/ethical-metrics", summary: "Predictability and load numbers with the calculation printed next to them. Useful when a client asks 'how do you know?'" },
        { title: "Team Wellbeing", href: "/products/team-wellbeing", summary: "The crunch between three launches registers as a team-level signal, not a person-by-person timesheet." },
        { title: "Gamification", href: "/products/gamification", summary: "Reviews, handovers and mentoring count on opt-in skill trees — so client-hero behaviour isn't the only thing rewarded." },
      ],
    },
    deepDives: [
      {
        title: "Settle the resourcing fight with the map, not the volume",
        body: "Account leads stop racing to your production lead's Slack channel. Everyone looks at the same cross-account load view: who is stretched, which week it peaks, what a new commitment actually displaces. Decisions get made with the fourth project's name on the screen.",
        bullets: [
          "One person, all their accounts, one honest bar",
          "New commitments priced in displaced work, not enthusiasm",
          "Account leads and production see the same view",
        ],
        photoId: "photo-1600880292203-757bb62b4baf",
        photoAlt: "Colleagues reviewing project boards together on a laptop",
      },
      {
        title: "Client updates that don't need a translator",
        body: "'On track' has to mean something. Because reports are generated from the committed-versus-delivered data the team actually works to — and every metric expands to show its formula — the number in the client deck is the number in the retro. When something slips, the slip is in the report, with the reason, before the client finds it.",
        bullets: [
          "Same figures internally and client-facing",
          "Methodology visible on every card — no black-box percentages",
          "Rationale text from the sprint draft reuses in the update",
        ],
        photoId: "photo-1460925895917-afdab827c52f",
        photoAlt: "Charts on a laptop screen during a client review",
      },
      {
        title: "Utilization that counts recovery, because 100% is a lie",
        body: "Booking people to the hairline isn't efficiency, it's a loan against next quarter. JiraVision's load view treats past-threshold weeks as a signal, not a badge: the team's after-hours trend and pulse feed the same picture, so you can plan a bench that survives a scope change without a hero week.",
        bullets: [
          "Over-capacity flagged at team level before the sprint breaks",
          "Recovery time is visible slack, not wasted billable air",
          "Crunch patterns surface as drift, weeks before attrition",
        ],
        photoId: "photo-1554224155-6726b3ff858f",
        photoAlt: "A desk with a calculator and scheduling notes",
      },
    ],
    demo: "equity",
    workflow: {
      title: "From five accounts to one plan of record",
      intro: "No migration, no new tool for the team to log into twice. Connect what's already in Jira.",
      steps: [
        { title: "Connect each account's project", body: "One read-only Jira connection per client project. Everything rolls up into a cross-account capacity view for your team." },
        { title: "Draft per-account sprints", body: "Before each planning round, get a capacity-aware draft for every account — with the shared-people conflicts already priced in." },
        { title: "A human approves, always", body: "A producer or lead edits and approves each draft. Nothing writes to any client's board without that named approval." },
        { title: "Report from the same numbers", body: "Generate the client update from delivered-versus-committed data, rationale included. The deck and the board finally agree." },
      ],
    },
    audience: {
      title: "Three seats around the accounts",
      intro: "The people who own delivery, the people who own the relationship, and the people who own the evenings.",
      items: [
        {
          who: "Production leads",
          body: "Stop arbitrating by who pings first. The load map turns 'I need Priya all week' into 'this is what that displaces — agree?'",
          wins: ["Cross-account conflict view", "Commitments priced in trade-offs", "Approval log for every change"],
        },
        {
          who: "Account managers",
          body: "Walk into reviews with receipts. Every status line traces to live board data and a published formula, so 'on track' is defensible.",
          wins: ["Reports from live data", "Slips named with reasons", "No Friday-afternoon guesswork"],
        },
        {
          who: "The team in the middle",
          body: "The person on three accounts at once gets counted as one person with a capacity, not three 100% allocations. Care work shows up too.",
          wins: ["Load summed, not sliced", "Burnout drift caught early", "Invisible glue work recognised"],
        },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: [
        "Agencies running client work in Jira (one project per account is ideal)",
        "Leads who want resourcing disputes settled with evidence, not volume",
        "Shops that'd rather tell a client 'we slipped' early than sell it late",
      ],
      bad: [
        "Agencies that need client portals or white-labelling — JiraVision doesn't ship those; you send reports instead",
        "Teams looking for time-tracking and invoicing — we measure workload, not billable hours",
        "Shops not on Jira yet — GitHub/GitLab signals are roadmap, labelled planned",
      ],
    },
    method: {
      title: "How agency data is handled",
      intro: "Client work is other people's confidential roadmap. Here is exactly what JiraVision reads and does.",
      rows: [
        { label: "What it reads", detail: "Issue history, sprint cycles, boards and calendars from each connected Jira project — read-only. No message content, no documents, no screen activity." },
        { label: "What it proposes", detail: "Sprint drafts, capacity flags and report figures. Nothing is written to any project — client's or yours — until a named human approves it." },
        { label: "What clients see", detail: "Whatever you choose to send them. Reports are exports you control; there is no live client-facing dashboard to accidentally over-share from." },
        { label: "What we don't build", detail: "Per-person billable surveillance and timesheet policing. Load is shown at team level; individuals always see their own detail." },
      ],
    },
    // NOTE(PLACEHOLDER): example quotes — replace when permissioned testimonials exist
    quotes: [
      {
        quote: "The resourcing map ended the account-lead shouting match. Now the argument is about what the fourth project loses — in writing.",
        name: "Early-access participant — Head of Production",
        role: "Digital agency",
      },
      {
        quote: "Our client updates stopped being a genre of fiction. Same numbers as the retro, formula included. They noticed.",
        name: "Early-access participant — Account director",
        role: "Brand & product studio",
      },
    ],
    updateTitles: [
      "AI sprint reports",
      "Ethical metrics methodology view",
      "Skill trees recognise review and mentoring work",
    ],
    faq: [
      { q: "Can we manage several client accounts at once?", a: "Yes — connect one Jira project per account and the capacity, load and reporting views roll up across them. Each account's data stays within its own project scope." },
      { q: "Is there a client portal?", a: "No, and we'd rather say so than promise it. You generate reports from live data and send them yourself; clients never get direct dashboard access." },
      { q: "Do you track billable hours?", a: "We don't. JiraVision measures workload and delivery signals, not time for invoicing. If hours-based billing is the gap you need closed, ask us at /contact and we'll tell you honestly whether we help." },
      { q: "Does the AI reprioritise across accounts by itself?", a: "No. It drafts per-account plans that account for cross-account load, and a human approves each one. Conflicts between accounts get surfaced, not silently traded." },
      { q: "How does this price for an agency of 20?", a: "It's per seat, so you pay for the people who use it, and annual billing saves money. Current tiers and numbers are on /pricing." },
    ],
    related: solutionRelated("agencies"),
    cta: {
      title: "Make 'on track' a number again",
      body: "Connect one account's Jira project and see your first cross-account load view and capacity-aware sprint draft. 14-day trial, no card, nothing writes without approval.",
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Talk to us about multi-account setup", href: "/contact" },
    },
  },
  {
    slug: "enterprise",
    name: "For enterprise",
    navSummary: "Delivery intelligence your security review can actually sign off on.",
    hero: {
      eyebrow: "Solutions · Enterprise",
      title: "AI your governance committee doesn't have to fear",
      subtitle:
        "Large organisations don't have an AI problem, they have an AI-approval problem. JiraVision was built for that gate: read-only until a named human approves, every metric opens to show its formula, and a compliance story told in the present tense — including the parts that are 'in progress'.",
      bullets: [
        "No autonomous writes — approvals are logged and attributable",
        "Wellbeing and load signals aggregated before anyone sees them",
        "SOC 2 and GDPR alignment in progress; ask us specifics, get straight answers",
      ],
      primary: { label: "Talk to us first", href: "/contact" },
      secondary: { label: "Review the plans", href: "/pricing" },
      badge: "Human-approval architecture",
    },
    problem: {
      title: "Enterprise delivery tools get blocked three ways",
      intro:
        "Not by features — by trust. The AI that touches production systems, the metric that ends up in a compensation review, the vendor whose compliance page says more than it can prove.",
      items: [
        {
          title: "Autonomy is the non-starter",
          body: "An AI that changes sprint scope or reassigns work unilaterally fails security review on principle, before anyone reads a feature list. Correctly.",
        },
        {
          title: "Metrics get weaponised downstream",
          body: "Per-person numbers leak from dashboards into performance conversations nobody authorised. Once that happens, the team games the metric and the data dies.",
        },
        {
          title: "Compliance theatre wastes everyone's time",
          body: "Vendors claim badges they don't hold; procurement burns a week discovering it. We'd rather hand you an honest 'in progress, here's what we can show you today'.",
        },
      ],
    },
    features: {
      eyebrow: "What you can vet",
      title: "Controls, not promises",
      intro: "Every claim on this page maps to a behaviour you can test during a pilot. If it isn't shipped, it's labelled planned.",
      items: [
        { title: "Approval-gated writes", body: "JiraVision drafts; nothing reaches your Atlassian tools until a named approver acts — and the approval is recorded with who and when." },
        { title: "Read-only connections", body: "Today the live integration is Jira, read-only. GitHub, GitLab and Slack are roadmap items and are labelled as planned, not available." },
        { title: "Team-level aggregation", body: "Wellbeing check-ins merge into team figures before display; small groups are combined, never shown raw. Individuals see their own data." },
        { title: "Formula-on-card metrics", body: "Predictability, load and fairness numbers expand to numerator, denominator, source events and exclusions — built for the question 'how do we know?'" },
        { title: "Data stays yours", body: "Workspace data stays in your database, is never used to train public models, and can be exported or deleted on your schedule." },
        { title: "Straight answers on compliance", body: "SOC 2 and GDPR alignment are in progress for an early-stage team, not certificates we hold. Bring specifics to /contact and get a yes, a no, or a date." },
      ],
    },
    productMap: {
      eyebrow: "The stack",
      title: "Four products, one governance model",
      items: [
        { title: "AI Scrum Master", href: "/products/ai-scrum-master", summary: "Capacity-aware planning drafts with per-item rationale — a proposal workflow, never an autopilot." },
        { title: "Ethical Metrics", href: "/products/ethical-metrics", summary: "A deliberately small metric set with published formulas and a refusal list of what we won't measure." },
        { title: "Team Wellbeing", href: "/products/team-wellbeing", summary: "Early-warning load signals that stop at the team boundary by design." },
        { title: "Gamification", href: "/products/gamification", summary: "Opt-in recognition with guardrails that make the surveillance trade-off visible before you can turn it on." },
      ],
    },
    deepDives: [
      {
        title: "Human approval is the only write path",
        body: "Treat this as an architectural property you can test, not a policy promise. Every mutation — sprint content, reassignment, report publication — terminates in a human approval in your workspace. The draft itself is reversible in one action, and the log names the approver. When your auditors ask 'what did the AI do?', the answer is 'nothing, on its own — here is who did, and why'.",
        bullets: [
          "Read-only until a named approver acts",
          "Approval log attributable to people, not tooling",
          "One-click revert of a whole draft, including mid-sprint",
        ],
        photoId: "photo-1600880292089-90a7e086ee0c",
        photoAlt: "Two professionals completing an approval handshake",
      },
      {
        title: "Metrics that survive an audit",
        body: "Delivery numbers inside big companies face two audiences: the team who must trust them and the review that must defend them. Every metric opens to its formula, source events, exclusions and last recalculation. That makes disputes editable — you argue about a definition, log the change, and everyone sees it — instead of political.",
        bullets: [
          "Numerator, denominator and caveats printed on the card",
          "Definition changes are logged and visible to the org",
          "A published refusal list: no lines-of-code, no per-person velocity",
        ],
        photoId: "photo-1517245386807-bb43f82c33c4",
        photoAlt: "Auditors reviewing methodology documentation",
      },
      {
        title: "The compliance conversation, held honestly",
        body: "We are an early-stage team. SOC 2 and GDPR alignment are underway — that is the present tense, and we won't sell you the future tense. What we can show you today: the data-flow diagram behind this page's method section, the approval logs, the aggregation model, and a working session where your security questions get a direct answer or a real date.",
        bullets: [
          "Certification status stated plainly, in progress and named",
          "Pilot scoped to one value stream while paperwork catches up — honestly",
          "Sub-processors, retention and DPA specifics via /contact",
        ],
        photoId: "photo-1573164713988-8665fc963095",
        photoAlt: "A security review meeting in an office",
      },
    ],
    demo: "sandbox",
    workflow: {
      title: "A procurement-shaped pilot, not a science fair",
      intro: "Most enterprise deployments fail in the gap between the demo and the review. Start from the review.",
      steps: [
        { title: "Bring the hard questions early", body: "Start at /contact with your security and data-flow questions. You get answers in the present tense, including what isn't available yet." },
        { title: "Scope one value stream", body: "Pick one team or programme. Read-only Jira access, one approval workflow, a defined exit. Nothing else enters production." },
        { title: "Run the controls check", body: "Test what this page promises: approval logs, aggregation behaviour, formula transparency, export and delete. Bring your own auditors." },
        { title: "Decide on evidence", body: "Expand per division or walk away with the export. Predictability and load trends from the pilot are yours to keep either way." },
      ],
    },
    audience: {
      title: "Who has to say yes",
      intro: "Enterprise adoption is three signatures. This product was designed at each of their desks.",
      items: [
        {
          who: "Security & risk",
          body: "A vendor whose AI cannot write without approval, whose integrations are read-only, and whose compliance gaps are admitted before you find them.",
          wins: ["Approval-gated architecture", "Data never trains public models", "Export/delete on your schedule"],
        },
        {
          who: "Procurement",
          body: "Claims you can verify in a pilot, roadmap items labelled planned instead of implied, and per-seat terms listed on /pricing.",
          wins: ["Testable claims", "Honest status language", "No mystery line items"],
        },
        {
          who: "Engineering leadership",
          body: "Portfolio predictability and load balance with methodology one click away — and signals that stop at the team boundary so metrics don't poison trust.",
          wins: ["Defensible numbers", "Team-level by default", "Drift alerts before incidents"],
        },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: [
        "Organisations on the Atlassian stack wanting forward planning and fairness signals, not another reporting layer",
        "Buyers who prefer an early-stage vendor's straight answers over a slide of borrowed logos",
        "Governance models that require human-in-the-loop AI as a hard constraint",
      ],
      bad: [
        "Anyone who needs a SOC 2 report or signed DPA this quarter — alignment is in progress; we won't pretend otherwise",
        "Programmes requiring on-premise deployment today — ask us via /contact before assuming",
        "Teams whose actual requirement is HR case management or therapy services — this is workload instrumentation, not care",
      ],
    },
    method: {
      title: "What your security review will read",
      intro: "The relevant facts, in one place, present tense.",
      rows: [
        { label: "Access model", detail: "Jira is the live integration and it is read-only. Writes occur only through an approval executed in your workspace, and each approval is logged with approver and timestamp." },
        { label: "Data handling", detail: "Workspace data stays in your database. It is never used to train public models. The AI layer is IBM Granite, chosen for enterprise data handling; every suggestion links to the reasoning and source data behind it." },
        { label: "Privacy model", detail: "Wellbeing and load signals aggregate to team level before display; groups below the minimum size merge. Individuals always see their own detail; nobody else's manager does." },
        { label: "Compliance status", detail: "SOC 2 and GDPR alignment in progress — not certifications held today. Full status, specifics and dates: /contact. Planned features across the site are labelled planned." },
      ],
    },
    // NOTE(PLACEHOLDER): example quotes — replace when permissioned testimonials exist
    quotes: [
      {
        quote: "The approval log is what got us past the architecture review. 'The AI did it' is not a sentence our audit trail can contain — here it structurally can't happen.",
        name: "Early-access participant — Director of IT assurance",
        role: "Financial services group",
      },
      {
        quote: "They told us SOC 2 wasn't done, told us when it would be, and let our pilot proceed with those limits written down. That honesty is why we're still talking.",
        name: "Early-access participant — Procurement lead",
        role: "Manufacturing enterprise",
      },
    ],
    updateTitles: [
      "Ethical metrics methodology view",
      "Wellbeing signals move to team-level aggregation",
      "AI sprint reports",
    ],
    faq: [
      { q: "Do you have SOC 2 or GDPR certification?", a: "Not yet, and we won't claim otherwise. Alignment work is in progress for an early-stage team. Contact us at /contact with your specific requirements and you'll get a direct answer — yes, no, or a date." },
      { q: "Can the AI change anything in our systems on its own?", a: "No. Reads are automated; writes are not. Every change requires a named human approval inside your workspace, and approvals are logged with who and when." },
      { q: "What about SSO and admin controls?", a: "The Enterprise tier on /pricing lists SSO and advanced controls. Current availability and rollout order can vary — confirm specifics with us at /contact before you build the checklist around them." },
      { q: "Where does our data live and go?", a: "Workspace data stays in your database, is never used to train public models, and is exportable or deletable on your schedule. IBM Granite powers the reasoning layer; each output links to its source data." },
      { q: "Why is your integration list so short?", a: "Because we label things honestly. Jira is live and read-only. GitHub, GitLab and Slack are roadmap items shown as planned, not available — we'd rather under-promise to a procurement team than over-promise." },
    ],
    related: solutionRelated("enterprise"),
    cta: {
      title: "Bring your hardest questions first",
      body: "Start the working session at /contact: security model, compliance status in the present tense, and a single value-stream pilot you can evaluate on evidence.",
      primary: { label: "Talk to our team", href: "/contact" },
      secondary: { label: "Compare plans", href: "/pricing" },
    },
  },
  {
    slug: "remote-teams",
    name: "For remote teams",
    navSummary: "Async-first delivery where no timezone is the permanent loser.",
    hero: {
      eyebrow: "Solutions · Remote & distributed teams",
      title: "Distributed teams shouldn't run on whose evening gets colonised",
      subtitle:
        "In a remote team, fairness isn't a feeling — it's measurable. Who reviews at 10pm, whose standup lands mid-evening, which region quietly inherits every overdue task. JiraVision turns those into team-level signals with formulas, and plans the work so the load stops concentrating by geography.",
      bullets: [
        "After-hours load tracked as a team trend, never a timesheet trap",
        "Async check-ins that respect sleep windows",
        "Sprint drafts that account for handover gaps and holidays per region",
      ],
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "See plans and seats", href: "/pricing" },
      badge: "Aggregated by design",
    },
    problem: {
      title: "Remote work fails distributed teams in quiet ways",
      intro:
        "It isn't camera-off Fridays that break remote teams. It's the structural unfairness nobody's dashboard shows — until the person in the unlucky timezone quits.",
      items: [
        {
          title: "One zone always loses the meeting",
          body: "Sync rituals are scheduled for head-office hours. The 8pm reviewer and the 6am standup take turns paying for it, every week, forever.",
        },
        {
          title: "Out-of-sight work goes out-of-mind late",
          body: "Distributed work hides its overload: evening commits to 'keep up with the handover', weekend reviews so Monday looks fine. It reads as dedication until it reads as burnout.",
        },
        {
          title: "Async decays into radio silence",
          body: "Handovers lose context, reviews stall while a region sleeps, and status becomes archaeology. Teams respond with more meetings — taxing the wrong people again.",
        },
      ],
    },
    features: {
      eyebrow: "What you get",
      title: "Fairness you can point at",
      intro: "Each capability is designed around one rule: make the invisible timezone tax visible, then plan against it.",
      items: [
        { title: "Async pulse, any hour", body: "A 30-second check-in that runs on your cycle, not a meeting slot. Answers aggregate to team level before display — sleep windows included as context." },
        { title: "After-hours drift, as a team line", body: "Evening and weekend activity trends at team level with the threshold set by the team — early warning without anyone's name on the spike." },
        { title: "Capacity that knows about Auckland", body: "Sprint drafts factor regional holidays, on-call rotas and handover gaps, so the plan doesn't assume everyone is online and awake at once." },
        { title: "Review equity across zones", body: "Review load shown as distribution — so the 'whoever is awake' default stops silently taxing one region every quarter." },
        { title: "Rationale beats archaeology", body: "Every planning decision and re-scope carries a written reason, readable at 7am by whoever logs in next. Status stops living in one person's memory." },
        { title: "Recognition that crosses zones", body: "Opt-in skill trees credit handover notes, careful reviews and unblocking the next shift — the async glue that never shows in commits." },
      ],
    },
    productMap: {
      eyebrow: "The stack",
      title: "Which product handles which remote failure mode",
      items: [
        { title: "Team Wellbeing", href: "/products/team-wellbeing", summary: "Anonymous check-ins and after-hours trends — the instrument that catches the 10pm-reviewer problem as data." },
        { title: "AI Scrum Master", href: "/products/ai-scrum-master", summary: "Drafts sprints against real availability per region, with written rationale async teammates can read on their own clock." },
        { title: "Ethical Metrics", href: "/products/ethical-metrics", summary: "Load balance and predictability with the formula on the card — settles 'your numbers don't count my timezone' arguments." },
        { title: "Gamification", href: "/products/gamification", summary: "Skill trees that count the handover-and-care work remote teams run on, opt-in and team-level by default." },
      ],
    },
    deepDives: [
      {
        title: "Timezone fairness, measured and then planned around",
        body: "The first step is admitting the schedule has a winner and a loser. JiraVision shows when work actually happens across the team's day — evening reviews, early-morning standups — and the sprint draft uses that shape: items sequenced along handover lines, commitments that don't require anyone to be awake twice at once.",
        bullets: [
          "Activity patterns visible as a team curve, not personal reports",
          "Handover gaps priced into the draft, not patched with overtime",
          "Meeting-free rituals: pulse and drafts run on your clock",
        ],
        photoId: "photo-1506784983877-45594efa4cbe",
        photoAlt: "Clocks showing different world clocks on a wall",
      },
      {
        title: "The after-hours number that actually protects people",
        body: "Remote burnout doesn't look like a tired office; it looks like a quiet 11pm commit streak from someone trying to stay synchronous with another continent. The workload risk model turns that into a trend line with a threshold the team chose — so 'I'm fine' can be checked against arithmetic, not vibes. Open the calculator below: same inputs your workspace produces.",
        bullets: [
          "Thresholds set by the team, changes visible to the team",
          "Small-group merging keeps individuals unidentifiable",
          "A tripped wire comes with moves: re-scope, reassign, recovery week",
        ],
        photoId: "photo-1543269865-cbf427effbad",
        photoAlt: "A distributed team laughing on a video call",
      },
      {
        title: "Async rituals that don't rely on guilt",
        body: "Most async cultures survive on the conscientious subsidising the inconsiderate: the person who writes the detailed handover because the other one won't. Making written rationale a first-class artifact — attached to drafts, re-scopes and reports — flips the economics. Good async work becomes visible, countable, and expected of everyone equally, across every shift.",
        bullets: [
          "Rationale travels with the item, readable on any clock",
          "Recognition branches for documentation and unblocking",
          "No ritual requires simultaneous presence to pass",
        ],
        photoId: "photo-1573497620053-ea5300f94f21",
        photoAlt: "A remote worker at a home desk with headphones",
      },
    ],
    demo: "calculators",
    workflow: {
      title: "Set it up across zones in one week",
      intro: "No return-to-office strategy required. Everything runs on the Jira projects and calendars you already share.",
      steps: [
        { title: "Choose thresholds together", body: "What counts as after-hours, what team size merges a group, which pulse cadence fits every zone. The team decides; defaults are sane." },
        { title: "Run the first async pulse", body: "30 seconds, any hour, answers aggregated before display. The whole team sees the same aggregate leadership does." },
        { title: "Draft with the day-shape", body: "The AI Scrum Master plans against per-region availability and handover gaps. A human approves before anything moves." },
        { title: "Review drift at retro", body: "After-hours trend and review distribution come to the retro with their formulas. Whatever the data says, the team changes — visibly." },
      ],
    },
    audience: {
      title: "Who stops subsidising the schedule",
      intro: "Three seats in every distributed team, three different ways the timezone tax lands on them.",
      items: [
        {
          who: "The trailing timezone",
          body: "The region that reviews, waits and answers at odd hours stops being the default absorber. The curve shows who's paying, in numbers.",
          wins: ["Evening load visible as data", "Reviews redistributed by evidence", "Holidays respected in drafts"],
        },
        {
          who: "Distributed engineering leads",
          body: "You can't walk the floor and notice. Signals arrive as team trends with a playbook attached — before the resignation, not after.",
          wins: ["Mid-cycle early warning", "Concrete rebalance moves", "One shared aggregate, no rumour mill"],
        },
        {
          who: "People ops without a head-office bias",
          body: "Engagement data that isn't skewed toward whoever lives closest to HQ's working hours. Aggregated, defensible, boring in the best way.",
          wins: ["Zone-fair pulse cadence", "Privacy-safe by design", "Trends you can take to the board"],
        },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: [
        "Teams genuinely distributed across timezones who plan in Jira",
        "Leads who want after-hours load treated as a team signal, not a productivity score",
        "Async-first cultures that need rationale and status to travel without meetings",
      ],
      bad: [
        "Managers wanting online-status or keyboard activity tracking — not on the roadmap, by principle",
        "Teams whose real need is a meeting scheduler — JiraVision plans work, it doesn't find calendar slots",
        "Fully co-located teams who'd get more from the planning tools alone (that's fine, but skip this pitch)",
      ],
    },
    method: {
      title: "What we measure about your evenings",
      intro: "Because 'we respect work-life balance' means nothing without the exact mechanics.",
      rows: [
        { label: "Signals", detail: "Check-in answers (anonymous), Jira activity timestamps, calendar meeting load and regional holidays. No message content, no screen capture, no online/away status." },
        { label: "Aggregation", detail: "Individual activity rolls into team-level trends before display. Groups below the team-set minimum size merge with neighbours, shown as merged." },
        { label: "After-hours", detail: "Evening and weekend activity counts against a threshold the team configures. It is reported as a trend line — there is no per-person overtime report to enable." },
        { label: "Retention", detail: "Raw check-in text is deleted after aggregation on a schedule you set. Timezone data is used for fairness views; exports and deletion stay available any time." },
      ],
    },
    // NOTE(PLACEHOLDER): example quotes — replace when permissioned testimonials exist
    quotes: [
      {
        quote: "The after-hours curve ended the argument that our APAC engineers were 'just more dedicated'. They were awake at 10pm. Now it's on the retro agenda.",
        name: "Early-access participant — Engineering manager",
        role: "Remote-first SaaS",
      },
      {
        quote: "Sprint drafts that know about the handover gap meant my Monday stopped arriving half-finished by someone else's Friday.",
        name: "Early-access participant — Staff engineer",
        role: "Distributed product team",
      },
    ],
    updateTitles: [
      "Wellbeing signals move to team-level aggregation",
      "Skill trees recognise review and mentoring work",
    ],
    faq: [
      { q: "Does this turn into bossware for my remote team?", a: "Structurally, no. After-hours and load signals are team-level aggregates with merged small groups; there is no per-person overtime or activity report to enable. Manager-facing drill-down stops at the team boundary." },
      { q: "How is fairness across timezones actually measured?", a: "Three team-level views: when activity happens across the day, how review load distributes, and whether regional holidays and handover gaps were counted in the sprint draft. Each opens to show its formula." },
      { q: "Can we run check-ins without forcing everyone online?", a: "Yes — the pulse is async and runs on your cycle, not a shared meeting slot. It takes about 30 seconds and aggregates before display, so nobody's timezone gates the ritual." },
      { q: "What integrations does a remote team get today?", a: "Jira (read-only, live) is the core. Slack digests and Google Calendar context are on the roadmap and labelled planned — we don't ship 'available' that means 'coming'." },
      { q: "Does it help hybrid teams too?", a: "The same signals apply when part of the room is in-person and part is dialling in from the wrong hour. The fairness views don't care where anyone sits." },
    ],
    related: solutionRelated("remote-teams"),
    cta: {
      title: "Make the invisible shift visible",
      body: "Set the thresholds with your team, run the first async pulse, and see whose evenings the current schedule has been taxing. 14-day trial, no card.",
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Read the privacy method", href: "/privacy" },
    },
  },
  {
    slug: "startups",
    name: "For startups",
    navSummary: "Ship fast at ten people without borrowing trouble from next year.",
    hero: {
      eyebrow: "Solutions · Startups",
      title: "Your whole delivery plan is in two people's heads. Move one of them onto paper",
      subtitle:
        "At startup size there's no PM, no EM bench, no capacity model — there's a founder, a small team, and a shared gut feeling about 'this week'. JiraVision turns that gut feeling into a defensible draft before the sprint, so pace doesn't quietly become debt.",
      bullets: [
        "First sprint draft in about an afternoon of setup",
        "Load warnings that arrive before the burnout, not the resignation",
        "Per-seat pricing that starts small — live numbers on /pricing",
      ],
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Check what it costs", href: "/pricing" },
      badge: "14-day trial, no card",
    },
    problem: {
      title: "Speed at startup size has a hidden invoice",
      intro:
        "Moving fast is the correct strategy until it turns into a habit of saying yes without doing the arithmetic. The invoice arrives as slipped releases, a blown-out teammate, and an investor asking what happened to the roadmap.",
      items: [
        {
          title: "Every yes is a silent no",
          body: "Five things fit in the sprint on Monday; a demo request kills two of them by Wednesday. Nobody wrote the trade-off down, so nobody owns the outcome.",
        },
        {
          title: "Four hats, zero recognition",
          body: "The one senior engineer is also the reviewer, the on-call, the interview loop and the docs. Context-switching doesn't appear in any tool — until they leave.",
        },
        {
          title: "The tool tax compounds",
          body: "A planning tool, a survey tool, a metrics suite — each priced for someone bigger than you, each half-used by month three. Startups pay for enterprise features in triplicate.",
        },
      ],
    },
    features: {
      eyebrow: "What you get",
      title: "A delivery brain, freelance",
      intro: "Everything here is sized for a team of five to twenty-five: quick to set up, cheap to quit, honest about what it is.",
      items: [
        { title: "Drafts, not process", body: "The AI Scrum Master writes the sprint proposal with per-item rationale. You didn't hire a PM; you don't need a ceremony. Review, edit, approve." },
        { title: "The trade-off gets written down", body: "When the demo displaces the migration work, the draft says so. Investor-facing predictability built on decisions with receipts." },
        { title: "Hat-counting for real", body: "Reviews, interviews and firefighting show up in load views and skill trees — so the generalist hero is visible before they're invisible in a resignation." },
        { title: "Numbers that survive diligence", body: "Every metric opens to its formula and source events. When someone asks how you knew, the card answers — no dashboard theatre." },
        { title: "One subscription, not three", body: "Planning, wellbeing signals, recognition and metrics ship together, priced per seat. You can start on the smallest tier — see /pricing." },
        { title: "An afternoon, not a quarter", body: "Connect Jira, keep your board, get the first draft before standup. No consultants, no migration, nothing to undo if you leave." },
      ],
    },
    productMap: {
      eyebrow: "The stack",
      title: "What each product buys you at startup size",
      items: [
        { title: "AI Scrum Master", href: "/products/ai-scrum-master", summary: "The first thing to turn on — a written sprint plan with rationale, before you can afford an engineering manager." },
        { title: "Team Wellbeing", href: "/products/team-wellbeing", summary: "Two engineers can't absorb a resignation. The 30-second pulse is your early-warning system." },
        { title: "Ethical Metrics", href: "/products/ethical-metrics", summary: "Predictability and load numbers with visible formulas — the receipts behind your roadmap promises." },
        { title: "Gamification", href: "/products/gamification", summary: "Optional, opt-in: recognise the hat-swapping and review work that holds a small team together." },
      ],
    },
    deepDives: [
      {
        title: "Founder-led planning, without the founder bottleneck",
        body: "You're the roadmap, the sales call and the release manager. The draft plan arrives before Monday — sized to who's actually about, with the reasoning written next to each item — so your job shrinks to editing and approving. When the team asks 'why does this wait, and this ship?', the draft answered before anyone had to interrupt you to find out.",
        bullets: [
          "Sprint proposal waiting before planning, every cycle",
          "Every item carries its why — readable at 9am or 9pm",
          "You approve; the board is never touched without you",
        ],
        photoId: "photo-1522071820081-009f0129c71c",
        photoAlt: "A small startup team planning together around a laptop",
      },
      {
        title: "The pace that doesn't compound quietly",
        body: "Overtime at a startup is culturally invisible — everyone's 'all in'. That's exactly why the numbers matter: after-hours trends and load distribution show when speed has become a loan, two or three weeks before it becomes a resignation letter. Early warning is the whole product; you decide what to protect.",
        bullets: [
          "Crunch visible as drift, not drama",
          "Answers aggregated — nobody's manager gets a timesheet",
          "Recovery weeks are a suggestion with a playbook attached",
        ],
        photoId: "photo-1516321318423-f06f85e504b3",
        photoAlt: "Laptops and notebooks on a busy small-team desk",
      },
      {
        title: "Buy once. Cancel cheaply. Keep the receipts.",
        body: "Priced per seat, so ten people cost like ten people — the tiers start small and the current numbers live on /pricing. The trial needs no card, setup is an afternoon, and if you outgrow or lose interest, your data exports with you. The planning rationales and metric history you built are yours either way; that's the point of showing your working.",
        bullets: [
          "Per-seat plans that scale when you hire, not when a rep says so",
          "Annual billing option on /pricing — no surprise line items",
          "Export or delete workspace data at any time",
        ],
        photoId: "photo-1581091226825-a6a2a5aee158",
        photoAlt: "An engineer at a workbench with tools and a laptop",
      },
    ],
    demo: "none",
    workflow: {
      title: "An afternoon from signup to first draft",
      intro: "The trial exists precisely so you can test the whole loop before it costs you anything.",
      steps: [
        { title: "Connect your Jira project", body: "Read-only. Keep your board, your workflow, your habits — JiraVision reads what's already there." },
        { title: "Read the first draft", body: "Items with rationale, capacity that knows your real availability. Argue with the reasoning, not with a blank plan." },
        { title: "Approve and get on with it", body: "A human approves every plan — that's the architecture, not a setting. Then nobody re-asks what slipped and why." },
        { title: "Check the trend monthly", body: "Predictability, load spread and after-hours drift with formulas on the cards. Pace you can prove, or pace you can fix." },
      ],
    },
    audience: {
      title: "Who's actually holding the plan",
      intro: "In a startup that's usually three people, sometimes the same person twice.",
      items: [
        {
          who: "Founders and tech leads",
          body: "The roadmap lives in your head and your calendar. It gets written down, defended with evidence, and stops requiring your presence to be understood.",
          wins: ["Draft before every sprint", "Trade-offs in writing", "Numbers for the next investor call"],
        },
        {
          who: "Early employees wearing many hats",
          body: "The review-menting-on-call-docs generalist finally shows up as loaded — visibly to the team, before it shows up as burnout.",
          wins: ["Hat-swapping counted", "Load caps honoured in drafts", "Care work recognised, opt-in"],
        },
        {
          who: "Ops and finance on the founders' side",
          body: "One per-seat line instead of three half-used tools, with a trial that ends cleanly if the answer's no.",
          wins: ["No card to trial", "Scales down as easily as up", "Your data leaves with you"],
        },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: [
        "Teams of roughly 5–25 shipping product in Jira with no dedicated PM or EM bench",
        "Founders who want their roadmap promises defensible with receipts, not vibes",
        "Post-Series-A teams feeling the tool tax and the first real burnout risk",
      ],
      bad: [
        "Pre-product teams without a Jira board yet — there's nothing to connect; the trial will bore you",
        "Anyone hunting for project management autopilot: every plan needs your approval, by design",
        "Teams needing GitHub/GitLab-native today — roadmap, labelled planned; ask us at /contact",
      ],
    },
    method: {
      title: "What 'built for startups' actually means",
      intro: "The mechanics behind the pitch, including the numbers we won't restate here.",
      rows: [
        { label: "Setup cost", detail: "One read-only Jira connection and default thresholds. First draft lands the same day; there is no migration, training programme or onboarding fee." },
        { label: "Pricing shape", detail: "Per-seat tiers with a 14-day no-card trial, and an annual option that saves money. Exact current prices live on /pricing — we point there instead of quoting them." },
        { label: "Exit cost", detail: "Zero contractual lock. Export the workspace or delete it, and the sprint rationales plus metric history stay legible outside JiraVision." },
        { label: "What it is not", detail: "Not a timesheet, not CRM, not a hiring tool, and not therapy — a workload tool with receipts. Some things we say we don't build, and mean it." },
      ],
    },
    // NOTE(PLACEHOLDER): example quotes — replace when permissioned testimonials exist
    quotes: [
      {
        quote: "First time in two years our sprint plan existed before Monday. It read like an engineer wrote it overnight. It didn't — but it had done the maths.",
        name: "Early-access participant — CTO and co-founder",
        role: "Seed-stage devtools startup",
      },
      {
        quote: "The after-hours trend made us stop bragging about crunch weeks. That was uncomfortable and it saved one of my engineers.",
        name: "Early-access participant — Founding engineer",
        role: "AI startup, six people",
      },
    ],
    updateTitles: ["AI sprint reports", "JiraVision goes public"],
    faq: [
      { q: "We're tiny and busy — how long does setup actually take?", a: "An afternoon, realistically: connect one Jira project (read-only), keep the defaults, and review the first capacity-aware draft before your next planning round. There's no migration because there's nothing to migrate — your board stays yours." },
      { q: "We can't quote prices in a board deck from a landing page. Where do we look?", a: "/pricing has the current per-seat tiers, the annual option and what's included on each. We deliberately keep exact numbers in one place instead of four." },
      { q: "Do we need a Scrum master for this to work?", a: "No. The draft arrives written and reasoned; whoever leads the plan — founder, tech lead, the team rotating — edits and approves it. It's planning help, not ceremony enforcement." },
      { q: "We're not on Jira yet but we don't want Jira forever. Are we locked out?", a: "Jira is the live integration today. GitHub and GitLab support is on the roadmap and labelled planned — we'd rather say that than sell you 'soon'. Talk to us at /contact if timing matters." },
      { q: "What happens to our data if we cancel?", a: "You export or delete the workspace at any time; nothing is held hostage and your data is never used to train public models. The rationale and history you generated stay readable with your export." },
    ],
    related: solutionRelated("startups"),
    cta: {
      title: "Try it on one real sprint",
      body: "The no-card 14-day trial exists for exactly this: connect your board, approve (or reject) one real draft, and see the load picture before it costs you a teammate.",
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "See pricing first", href: "/pricing" },
    },
  },
]

export const solutionBySlug = (slug: string) => solutions.find((s) => s.slug === slug)
