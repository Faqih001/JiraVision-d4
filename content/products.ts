// Content for the four /products/* pages. Composed by components/sections/page-kit.tsx.
// Honesty rules (REDESIGN_PLAN): no invented numbers, no fake customers; anything
// unverified is flagged NOTE(PLACEHOLDER). Demo data lives in its own files.

export interface ProductCta {
  label: string
  href: string
}

export interface ProductContent {
  slug: string
  name: string
  navSummary: string
  hero: {
    eyebrow: string
    title: string
    subtitle: string
    bullets: string[]
    primary: ProductCta
    secondary: ProductCta
    badge?: string
    photoId: string
    photoAlt: string
  }
  problem: { title: string; intro: string; items: { title: string; body: string }[] }
  features: { eyebrow: string; title: string; intro: string; items: { title: string; body: string }[] }
  deepDives: { title: string; body: string; bullets: string[]; photoId: string; photoAlt: string }[]
  demo: "sandbox" | "gamification" | "equity" | "calculators"
  workflow: { title: string; intro: string; steps: { title: string; body: string }[] }
  audience: { title: string; intro: string; items: { who: string; body: string; wins: string[] }[] }
  fit: { title: string; good: string[]; bad: string[] }
  method: { title: string; intro: string; rows: { label: string; detail: string }[] }
  quotes: { quote: string; name: string; role: string }[]
  updateTitles: string[]
  faq: { q: string; a: string }[]
  related: { title: string; href: string; summary: string }[]
  cta: { title: string; body: string; primary: ProductCta; secondary: ProductCta }
}

const sharedRelated = (self: string) =>
  [
    {
      title: "AI Scrum Master",
      href: "/products/ai-scrum-master",
      summary: "Capacity-aware sprint drafts with a written rationale for every suggested item.",
    },
    {
      title: "Team Wellbeing",
      href: "/products/team-wellbeing",
      summary: "Anonymous load and mood signals, aggregated before anyone sees them.",
    },
    {
      title: "Gamification",
      href: "/products/gamification",
      summary: "Skill trees that count reviews, mentoring and care — not just speed.",
    },
    {
      title: "Ethical Metrics",
      href: "/products/ethical-metrics",
      summary: "Workload and fairness indicators with the formula on display.",
    },
  ].filter((r) => r.href !== `/products/${self}`)

export const products: ProductContent[] = [
  {
    slug: "ai-scrum-master",
    name: "AI Scrum Master",
    navSummary: "Capacity-aware sprint planning drafts that explain themselves.",
    hero: {
      eyebrow: "AI Scrum Master",
      title: "The sprint draft your team can actually defend",
      subtitle:
        "JiraVision reads capacity, history and skills, drafts the sprint, and writes the reasoning next to every item. You edit, you approve, nothing moves without you.",
      bullets: [
        "Per-item rationale in plain language",
        "Accounts for holidays, on-call and open-ended work",
        "Two-way Jira sync — read-only until you approve",
      ],
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Try the sandbox", href: "#sandbox" },
      badge: "Powered by IBM Granite",
      photoId: "photo-1517245386807",
      photoAlt: "A team planning a sprint around a whiteboard",
    },
    problem: {
      title: "Sprints fail before planning even starts",
      intro:
        "Planning meetings run on optimism and loudest-voice rules. The evidence is already in your Jira — nobody has time to read it before Thursday.",
      items: [
        {
          title: "Capacity is a guess",
          body: "Who's on leave, who's on-call, what's the real interruption rate — the plan rarely knows, so the team absorbs the difference.",
        },
        {
          title: "Rationale lives in heads",
          body: "Commitments get defended with vibes. When someone asks why they got three spikes, there's no written answer.",
        },
        {
          title: "History doesn't repeat, it gets ignored",
          body: "Last sprint's over-commitment is this sprint's input — except nobody collates it before the meeting.",
        },
      ],
    },
    features: {
      eyebrow: "What you get",
      title: "A planning partner with receipts",
      intro: "Every capability produces something you can read, edit and approve — never an invisible action.",
      items: [
        { title: "Capacity-aware drafts", body: "Time off, on-call rotations and past completion rates feed one greedy, explainable pass." },
        { title: "Written rationale", body: "Each suggested item carries the reason it was picked and who it fits, in plain English." },
        { title: "Skill matching", body: "Stretch assignments are flagged as stretch — with the person's own opt-in." },
        { title: "Draft, don't commit", body: "The plan is a proposal until a human approves it in your workspace." },
        { title: "Mid-sprint re-planning", body: "When scope breaks, get a re-draft that names what slips and why." },
        { title: "Estimate quality tracking", body: "Compare drafts to reality each cycle; the model's accuracy is shown, not asserted." },
      ],
    },
    deepDives: [
      {
        title: "The draft arrives before the meeting",
        body: "Connect Jira once. Before planning, you get a sprint proposal sized to the team's real availability — holidays, on-call and the historical gap between estimates and reality.",
        bullets: ["Ready-to-review proposal, not a blank board", "Every number traces to a source you can open", "Edit anything; the rationale updates live"],
        photoId: "photo-1522071820081",
        photoAlt: "Laptop showing a sprint planning dashboard",
      },
      {
        title: "Rationale you can argue with",
        body: "“Ada gets the billing spike because she shipped two of them and has 6 points of slack.” When the reasoning is written down, the team can disagree with the actual reason instead of the person.",
        bullets: ["Plain-language explanations per item", "Alternative assignments shown with trade-offs", "Model confidence displayed, never hidden"],
        photoId: "photo-1552664730",
        photoAlt: "Engineers reviewing a plan together",
      },
      {
        title: "Human approval is the only write path",
        body: "JiraVision proposes; your team decides. Board changes, reassignments and sprint content only happen when someone approves — and the approval is logged.",
        bullets: ["Read-only until approval", "Every applied change is attributed and auditable", "One-click revert for the whole draft"],
        photoId: "photo-1531482615713",
        photoAlt: "A hand approving a checklist on screen",
      },
    ],
    demo: "sandbox",
    workflow: {
      title: "From connected to committed in four steps",
      intro: "The whole loop happens inside tools you already run.",
      steps: [
        { title: "Connect Jira", body: "Point JiraVision at a project. It reads boards, issues, cycles and calendars — read-only." },
        { title: "Review the draft", body: "Open the proposal before planning. Every item shows its reason, fit and risk." },
        { title: "Edit and approve", body: "Move, drop or swap anything. When the team agrees, one approval writes the sprint." },
        { title: "Close the loop", body: "After the cycle, predicted vs actual is charted — and feeds the next draft." },
      ],
    },
    audience: {
      title: "Who this changes the week of",
      intro: "Three seats in the planning meeting, one shared draft.",
      items: [
        { who: "Engineering managers", body: "Walk in with a plan that already counted the holidays, and a written answer for every “why me”.", wins: ["Defensible commitments", "Less re-planning by Slack", "Predictability trend per team"] },
        { who: "Scrum masters", body: "Facilitate from a proposal instead of a blank board; disputes move to the evidence.", wins: ["Shorter planning sessions", "Rationale-first conversations", "Mid-sprint re-drafts"] },
        { who: "ICs", body: "See why work landed on you — and push back on the reason, not the person.", wins: ["No silent overload", "Stretch flagged, not forced", "Fair share visible"] },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: ["Teams running Scrum or hybrid cycles in Jira", "Leads who want planning arguments settled with evidence", "Teams recovering from a bad over-commitment streak"],
      bad: ["Teams wanting auto-pilot sprint management — approval is mandatory here", "Orgs needing per-person productivity rankings", "Non-Jira boards today (GitHub/GitLab are roadmap, labelled planned)"],
    },
    method: {
      title: "How the draft is built",
      intro: "The model is deliberately simple and fully inspectable. Here is the recipe.",
      rows: [
        { label: "Inputs", detail: "Jira issue history, sprint velocity, calendar availability and on-call rota, team-declared skills. Nothing else — no keystrokes, no content of messages." },
        { label: "Selection", detail: "A greedy pass ranks backlog items by skill fit, then size, against remaining capacity. Deterministic: same inputs, same draft." },
        { label: "Rationale", detail: "IBM Granite turns the selection trace into plain-English sentences. The numbers come from the algorithm; the prose comes from the model." },
        { label: "Safeguards", detail: "Suggestions expire after the cycle, approvals are logged and attributed, and the whole draft is reversible in one action." },
      ],
    },
    // NOTE(PLACEHOLDER): example quotes — replace when permissioned testimonials exist
    quotes: [
      { quote: "The first sprint draft in two years my team didn't immediately argue with — it had already counted the holidays.", name: "Early-access participant — Engineering manager", role: "Series B fintech" },
      { quote: "Opening an item and reading why it was picked ended the standing 'why does everyone think my work is small' argument.", name: "Early-access participant — Staff engineer", role: "Product studio" },
    ],
    updateTitles: ["AI sprint reports", "Estimate quality dashboard"],
    faq: [
      { q: "Does it write to my Jira on its own?", a: "No. JiraVision is read-only until a human approves a draft, and every applied change is logged with who approved it." },
      { q: "Which model, and can we see the reasoning?", a: "IBM Granite generates the plain-language rationale. The selection itself is a deterministic algorithm so the same inputs always produce the same draft." },
      { q: "What if the draft is wrong?", a: "Edit it. Every change is one click to revert, and predicted-vs-actual tracking shows the model's accuracy over time — we'd rather show the number than claim it." },
      { q: "Does it work without Jira?", a: "Jira is live today; GitHub and GitLab signals are on the roadmap and labelled as planned, not available." },
      { q: "How is this different from Jira Advanced Insights?", a: "Jira's insights report the past. JiraVision drafts the next sprint forward — capacity-aware, with per-item rationale and a human approval gate." },
    ],
    related: sharedRelated("ai-scrum-master"),
    cta: {
      title: "Draft your next sprint before the meeting",
      body: "Connect one Jira project and see the first capacity-aware draft with rationale on every item. 14-day trial, no card.",
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Talk to us first", href: "/contact" },
    },
  },
  {
    slug: "team-wellbeing",
    name: "Team Wellbeing",
    navSummary: "Burnout early-warning signals that never surveil individuals.",
    hero: {
      eyebrow: "Team Wellbeing",
      title: "See burnout before the resignation letter",
      subtitle:
        "Anonymous check-ins and workload signals, aggregated to team level before anyone sees them. You get the early warning; your people keep their privacy.",
      bullets: [
        "Individual answers are never shown raw — by design",
        "Thresholds your team sets and can see",
        "Rebalance suggestions linked to the signal",
      ],
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Check the risk model", href: "#calculators" },
      badge: "Privacy-first",
      photoId: "photo-1507003211169",
      photoAlt: "A calm, plant-filled team workspace",
    },
    problem: {
      title: "Overload hides until it explodes",
      intro:
        "Burnout doesn't announce itself in standup. It shows up as quiet overtime, shrinking review quality — and then as a resignation.",
      items: [
        { title: "Signals exist, nobody reads them", body: "After-hours commits, meeting load and carrying three spikes at once are already in your tools — buried." },
        { title: "Pulse surveys arrive too late", body: "Quarterly surveys measure the damage after it's done, and anonymity promises make honest answers rare." },
        { title: "Managers guess or snoop", body: "Without a privacy-safe middle path, leaders either fly blind or start watching people — both fail." },
      ],
    },
    features: {
      eyebrow: "What you get",
      title: "Early warning without the surveillance",
      intro: "Every signal is chosen so the team sees the pattern and the individual keeps their name off it.",
      items: [
        { title: "Anonymous check-ins", body: "A 30-second pulse per cycle. Answers are aggregated before display — small groups are merged, never shown." },
        { title: "Workload heat", body: "Who's carrying what, surfaced as team distribution — over-capacity flagged, identities visible only to the person." },
        { title: "After-hours trend", body: "Evening and weekend activity tracked as a team trend, not a person-by-person report card." },
        { title: "Thresholds you own", body: "The team sets what counts as 'too much'. Changing a threshold is visible and explained." },
        { title: "Rebalance prompts", body: "When a threshold trips, get concrete moves — with the AI Scrum Master's rationale attached." },
        { title: "Honest limits", body: "No keyboard watching, no screenshots, no 'productivity scores'. Some things we simply don't build." },
      ],
    },
    deepDives: [
      {
        title: "The 30-second pulse",
        body: "Once per cycle, the team answers four questions. That's the whole ritual. Responses roll into a team-level view within hours — never as individual rows.",
        bullets: ["Fewer questions, kept honest by action", "Group sizes below the threshold are merged", "Everyone sees the same aggregate the manager sees"],
        photoId: "photo-1522202176988",
        photoAlt: "A person answering a short survey on a phone",
      },
      {
        title: "Load, seen as a shape",
        body: "The dashboard shows the distribution, not the person: who's above capacity, which skills are bottlenecks, where the next sprint will pinch. Individuals see their own row; managers see the picture.",
        bullets: ["Over-capacity flagged before the sprint breaks", "Meeting load and context-switching included", "Drill-down stops at the team boundary"],
        photoId: "photo-1519389950473",
        photoAlt: "A balanced workload chart on a screen",
      },
      {
        title: "When the alarm rings, there's a plan",
        body: "A tripped threshold isn't a report to forward — it comes with moves: drop scope, reassign with rationale, protect a recovery week. The template for that week ships with the product.",
        bullets: ["Recovery-week playbook included", "Actions reviewed in retro, not in a 1:1 ambush", "Every alert shows the data behind it"],
        photoId: "photo-1560250097",
        photoAlt: "A team taking a restorative break together",
      },
    ],
    demo: "calculators",
    workflow: {
      title: "From signal to relief in one cycle",
      intro: "Wellbeing data is only useful if something moves because of it.",
      steps: [
        { title: "Set thresholds together", body: "The team decides what 'too much' means — after-hours hours, load spread, pulse scores. Defaults are sane." },
        { title: "Pulse and observe", body: "Check-ins and tool signals accumulate quietly. No daily nagging, no per-person dashboards." },
        { title: "Trip the wire", body: "When a threshold is crossed, the team lead sees the aggregate signal with its data and a menu of concrete moves." },
        { title: "Act and review", body: "Rebalance, drop scope or schedule recovery. The next retro checks whether the fix worked." },
      ],
    },
    audience: {
      title: "Who this protects",
      intro: "Different seats, one shared interest: people who are still here next year.",
      items: [
        { who: "People ops", body: "Real workload evidence between engagement surveys — without becoming the surveillance department.", wins: ["Aggregated by design", "Defensible thresholds", "Trend, not gossip"] },
        { who: "Engineering leads", body: "Know who's overloaded before they say it in an exit interview — and a playbook for what to do.", wins: ["Mid-sprint early warning", "Concrete rebalance moves", "Recovery-week template"] },
        { who: "Individual contributors", body: "Your answers stay yours. The thing your manager sees is a number with a formula, not your name.", wins: ["Never shown raw", "You see the same aggregate", "Opt-in where it matters"] },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: ["Teams that already trust each other enough to self-report", "Leaders who want evidence, not vibes, before changing workloads", "Orgs with a real action budget — signals without moves make it worse"],
      bad: ["Managers wanting per-person activity reports (we won't build them)", "Teams under an active reorg freeze — pulses need psychological safety", "Anyone expecting therapy: this is workload, not wellbeing care"],
    },
    method: {
      title: "How the signals are built",
      intro: "The privacy model is the product. Here's exactly what happens to your data.",
      rows: [
        { label: "Collection", detail: "Check-in answers (anonymous by default), Jira activity timestamps, calendar meeting load. No message content, no screen capture, no keystrokes." },
        { label: "Aggregation", detail: "Individual responses merge into team-level figures before display. Groups below the minimum size combine with neighbours — shown as 'merged', never split." },
        { label: "Thresholds", detail: "Alerts fire on team-level metrics the team configured. Every alert links to the underlying aggregate and its formula." },
        { label: "Retention", detail: "Raw individual check-in text is deleted after aggregation on a schedule you set. Export or delete workspace data any time." },
      ],
    },
    // NOTE(PLACEHOLDER): example quotes — replace when permissioned testimonials exist
    quotes: [
      { quote: "We caught a colleague carrying three sprints' worth of load mid-cycle and rebalanced. That used to surface in the exit interview.", name: "Early-access participant — People ops lead", role: "Product studio" },
      { quote: "The pulse takes 30 seconds and actually changes something. People answer honestly because the aggregate is public.", name: "Early-access participant — Team lead", role: "Health-tech startup" },
    ],
    updateTitles: ["Wellbeing signals move to team-level aggregation", "Recovery-week playbook"],
    faq: [
      { q: "Can my manager see my individual answers?", a: "Never raw. Check-ins are aggregated to team level before display, and small groups are merged. The team sees the same aggregate leadership does." },
      { q: "Isn't after-hours tracking just surveillance?", a: "We track the team's trend, not a person's timesheet, and the team sets the threshold. If you want per-person activity reports, this is the wrong product — deliberately." },
      { q: "What data does it actually read?", a: "Check-in answers, Jira timestamps and calendar meeting load. No message content, no screen capture. Full list in the method section above." },
      { q: "How fast does it catch problems?", a: "Within one cycle: the pulse plus live workload signals trip thresholds mid-sprint, not at the quarterly survey." },
      { q: "Do we need a psychologist on staff?", a: "No — the playbooks are written for team leads. And to be clear: JiraVision is a workload tool, not a clinical service; it points to help, it doesn't replace it." },
    ],
    related: sharedRelated("team-wellbeing"),
    cta: {
      title: "Protect the team you have",
      body: "Set thresholds with your team, run the first anonymous pulse this week, and see the load picture before it breaks. 14-day trial, no card.",
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Read the privacy method", href: "/privacy" },
    },
  },
  {
    slug: "gamification",
    name: "Gamification",
    navSummary: "Recognition for the work that actually keeps teams alive.",
    hero: {
      eyebrow: "Gamification",
      title: "Points for the work velocity metrics throw away",
      subtitle:
        "Reviews, mentoring, runbooks, unblocking teammates — the invisible glue of engineering gets visible. Opt-in, team-level, and nobody ranks anyone on speed.",
      bullets: [
        "The team chooses what counts and what it's worth",
        "Skill trees, not leaderboards, by default",
        "Individual rankings are an explicit guardrail-off setting",
      ],
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Play the sandbox", href: "#gamification" },
      badge: "Opt-in by design",
      photoId: "photo-1511512578047",
      photoAlt: "Teammates celebrating a small win together",
    },
    problem: {
      title: "Good teams reward the wrong things",
      intro:
        "Velocity leaderboards reward the loudest work. The person who reviews carefully, mentors patiently and writes the boring docs gets a 'thanks' in Slack — and nothing else.",
      items: [
        { title: "Care is invisible", body: "Review depth and knowledge sharing don't show up in any number leadership reads." },
        { title: "Leaderboards distort", body: "Rank people on output and you get gaming: padded estimates, cherry-picked tickets, hoarded knowledge." },
        { title: "Badges get insulting", body: "Generic 'rockstar ninja' points at work that matters to nobody. Recognition people resent is worse than none." },
      ],
    },
    features: {
      eyebrow: "What you get",
      title: "Recognition your team actually designed",
      intro: "Every behaviour that earns points is chosen by the team, and the guardrails ship on by default.",
      items: [
        { title: "Team-defined behaviours", body: "The catalogue starts empty-ish: you pick what counts — pairing, incident command, docs — and its worth." },
        { title: "Skill trees", body: "Craft, Collaboration, Stewardship paths with visible nodes. Progress is a map, not a race." },
        { title: "Team-level defaults", body: "Recognition surfaces show branches and totals. Individual standings exist only if the team explicitly enables them." },
        { title: "Real work signals", body: "Points attach to Jira events — merged reviews, closed spikes, runbook updates — not self-reporting." },
        { title: "Opt-in participation", body: "People who skip the system skip it cleanly. Their work still counts in every other view." },
        { title: "Anti-pattern guard", body: "We flag when a config starts rewarding volume over care — and say so in the UI." },
      ],
    },
    deepDives: [
      {
        title: "Design the game, or don't",
        body: "On day one the team votes on which behaviours earn points and how much. The product ships suggestions — reviews, mentoring, onboarding, tech-debt work — but nothing counts until your team says so.",
        bullets: ["Voting built into setup", "Changes are logged and visible", "A behaviour nobody wants gets deleted, not enforced"],
        photoId: "photo-1529156069898",
        photoAlt: "A team agreeing on rules around a table",
      },
      {
        title: "Skill trees make growth visible",
        body: "Instead of a ladder of points, contributions map onto branch nodes — 'Reliability: runbook author', 'Collaboration: unblocked three teammates'. New hires can see what the team values; veterans can see their range.",
        bullets: ["Nodes unlock from real events, not nominations", "Branches mirror your actual engineering practices", "Everyone sees their own tree; the team sees the forest"],
        photoId: "photo-1531403009284",
        photoAlt: "A branching diagram drawn on paper",
      },
      {
        title: "The guardrails are the point",
        body: "Turn off 'team-level only' and the UI shows you exactly what you're about to do: a ranking of humans by output. We made that consequence visible on purpose. Most teams leave it on.",
        bullets: ["Opt-in participation, always", "Rankings require an explicit, logged team decision", "Quarterly prompt: is this config still what the team chose?"],
        photoId: "photo-1556761175",
        photoAlt: "A protective railing on a walkway",
      },
    ],
    demo: "gamification",
    workflow: {
      title: "Set up in one retro, live forever",
      intro: "The whole configuration happens inside a ritual you already run.",
      steps: [
        { title: "Pick behaviours", body: "Choose from the catalogue or write your own. Assign each a branch and a worth, by team vote." },
        { title: "Choose guardrails", body: "Team-level recognition on, opt-in on. Flip either only as an explicit, logged decision." },
        { title: "Let events flow", body: "Points attach to real Jira events automatically. Nobody logs anything by hand." },
        { title: "Review quarterly", body: "The config asks for a refresh every quarter. Dead behaviours get retired before they get gamed." },
      ],
    },
    audience: {
      title: "Who stops feeling invisible",
      intro: "The people the metric economy forgets, and the leads who need them to stay.",
      items: [
        { who: "Senior reviewers and mentors", body: "The work that makes everyone else faster finally shows up as progress, not just a favour.", wins: ["Reviews and pairing count", "Mentorship on the tree", "No more hidden load"] },
        { who: "New hires", body: "A visible map of what the team values — faster than osmosis, kinder than guessing.", wins: ["Know what counts", "Clear next nodes", "Belonging signal"] },
        { who: "Tech leads", body: "Recognition data that argues for the unglamorous work in planning meetings.", wins: ["Evidence for tech-debt time", "Care work made visible", "Culture you can point at"] },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: ["Teams that already recognise each other in retros", "Orgs where the quiet work genuinely goes unrewarded today", "People who want a map of what 'good here' looks like"],
      bad: ["Leaders wanting a productivity scoreboard — the guardrails exist to stop that", "Teams under trust pressure where any tracking feels like surveillance (start with wellbeing, not points)", "Anyone expecting us to force adoption: participation is opt-in, permanently"],
    },
    method: {
      title: "How points are earned",
      intro: "No mystery mechanics. Here's the whole rulebook.",
      rows: [
        { label: "Events", detail: "Points attach to verifiable Jira events: reviews merged, spikes closed with docs, runbooks updated, onboarding buddies completed. No self-declared points." },
        { label: "Worth", detail: "Each behaviour's value is set by team vote during setup, with sane suggested ranges. Changing a value is logged and shown to the team." },
        { label: "Display", detail: "Default view: branch progress and team totals. Individual standings require an explicit guardrail change, and the UI previews what that means first." },
        { label: "Anti-gaming", detail: "Volume spikes trigger a config review prompt, not a reward. Duplicate-event dedupe and a 'this looks weird' flag ship on by default." },
      ],
    },
    // NOTE(PLACEHOLDER): example quotes — replace when permissioned testimonials exist
    quotes: [
      { quote: "Our quiet reviewer finally has a tree that shows what everyone in the team already knew.", name: "Early-access participant — Engineering manager", role: "Devtools startup" },
      { quote: "The guardrail preview convinced us not to turn on rankings. That screen is worth the subscription.", name: "Early-access participant — Tech lead", role: "Agency" },
    ],
    updateTitles: ["Skill-tree branches ship with the team config", "Anti-gaming config review"],
    faq: [
      { q: "Isn't gamification just a leaderboard?", a: "The default is the opposite: skill trees and team totals. Individual rankings exist only behind an explicit guardrail switch that shows you the consequences first." },
      { q: "Can people opt out?", a: "Yes, cleanly. Opt-out means no points tracked for that person; their work still appears everywhere else in the product. Participation data is opt-in by design." },
      { q: "What stops people gaming it?", a: "Points come from verifiable events, volume spikes trigger a team config review, and the team retires behaviours that stop meaning anything." },
      { q: "Who decides what counts?", a: "Your team, by vote, during setup and at every quarterly refresh. We suggest; we never impose." },
      { q: "Does this work with remote teams?", a: "It's built on async Jira events, so yes — the sandbox above is the same view remote teammates see." },
    ],
    related: sharedRelated("gamification"),
    cta: {
      title: "Make the invisible work visible",
      body: "Run the setup vote in your next retro and start counting the work that actually keeps the team alive. 14-day trial, no card.",
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Play with the demo", href: "/#gamification" },
    },
  },
  {
    slug: "ethical-metrics",
    name: "Ethical Metrics",
    navSummary: "Delivery and fairness numbers that show their working.",
    hero: {
      eyebrow: "Ethical Metrics",
      title: "Every metric opens to show its formula",
      subtitle:
        "Predictability, load balance, review equity, after-hours drift — team-level indicators with the calculation, source and caveats printed next to the number.",
      bullets: [
        "Methodology visible on every card, always",
        "Team-level by default; individuals see their own slice",
        "Anti-patterns documented: what we refuse to measure",
      ],
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "Explore the demo", href: "#equity" },
      badge: "Receipts included",
      photoId: "photo-1551288049",
      photoAlt: "A clean analytics chart on a screen",
    },
    problem: {
      title: "Metrics people distrust get ignored or abused",
      intro:
        "When a number appears with no formula, one half of the team assumes it's wrong and the other assumes it's a weapon. Both readings are rational.",
      items: [
        { title: "Vanity leaderboards", body: "Velocity rankings make slides and destroy behaviour — the fastest way to game a metric is to publish it per person." },
        { title: "Invisible imbalance", body: "Review load and after-hours work concentrate quietly. Nobody's dashboard says so because nobody trusts dashboards." },
        { title: "Args that never end", body: "'Your numbers are wrong' is unresolvable when nobody can show how the number was made." },
      ],
    },
    features: {
      eyebrow: "What you get",
      title: "Numbers with receipts",
      intro: "A deliberately small set of metrics, each fully documented, each pointing at an action.",
      items: [
        { title: "Predictability", body: "Committed vs delivered per team per cycle — with the definition of 'delivered' printed on the card." },
        { title: "Workload distribution", body: "Who carries points, reviews and after-hours work — shown as spread, flagged past thresholds you set." },
        { title: "Review equity", body: "Review load balance and depth proxies, so the quiet reviewers stop being the default janitors." },
        { title: "Drift alerts", body: "Slow-burn changes — after-hours creep, growing imbalance — flagged with the trend line attached." },
        { title: "Formula on the card", body: "Every metric expands to numerator, denominator, source events, exclusions and last recalculation." },
        { title: "The refusal list", body: "We publish what we won't build: lines-of-code, per-person velocity, activity scores, keyboard-time." },
      ],
    },
    deepDives: [
      {
        title: "Open a metric, read its mind",
        body: "Click any number and the card expands: the exact formula, which Jira events feed it, what's excluded (and why), and the team's own threshold. Disputes become edits to a definition, not arguments about motives.",
        bullets: ["Numerator and denominator, in words", "Source events listed by type", "Exclusions explained, not hidden"],
        photoId: "photo-1460925895917",
        photoAlt: "A magnifying glass over printed figures",
      },
      {
        title: "Distribution, not ranking",
        body: "The equity view shows the shape of load across the team and names the outliers as numbers, not as a league table. Managers see the pattern; the flagged imbalance comes with the rebalance moves to fix it.",
        bullets: ["Watch thresholds set by the team", "Flagged bars marked with a rule, not a vibe", "One click hands the fix to the AI Scrum Master"],
        photoId: "photo-1554774854",
        photoAlt: "Bars of unequal height on a chart",
      },
      {
        title: "Drift before drama",
        body: "After-hours commits and review concentration rarely spike — they creep. Trend alerts fire on slope, not just level, with the seasonality check printed alongside.",
        bullets: ["Slope-based alerts you configure", "Seasonality and release-week context shown", "Alert history is auditable, including dismissed ones"],
        photoId: "photo-1506784983877",
        photoAlt: "A slow upward trend line on graph paper",
      },
    ],
    demo: "equity",
    workflow: {
      title: "From dashboard to decision",
      intro: "A metric that can't be acted on is decoration. Every card links to a move.",
      steps: [
        { title: "Pick the set", body: "Start from the documented menu of nine metrics. Enable only what someone owns and will act on." },
        { title: "Set thresholds", body: "Watch bands are team decisions — the defaults come from the product's own playbook, not a benchmark we invented." },
        { title: "Read the working", body: "Every review starts from the formula panel. Definition changes are logged and visible to the team." },
        { title: "Act on the flag", body: "Tripped thresholds offer concrete moves — rebalance, re-scope, recovery week — each traceable back to the signal." },
      ],
    },
    audience: {
      title: "Who gets the argument settled",
      intro: "The metric fights that eat review meetings — ended by showing the working.",
      items: [
        { who: "Executives", body: "Portfolio predictability and load balance across teams, with methodology one click away for the sceptics in the room.", wins: ["No vanity metrics", "Comparability caveats printed", "Trend vs noise distinguished"] },
        { who: "Engineering leads", body: "Defensible numbers for reviews and headcount cases — because the team agreed to the definitions.", wins: ["Formula-first reviews", "Drift alerts with context", "Audit trail on every flag"] },
        { who: "Teams", body: "Proof that the quiet work is counted and the loud numbers aren't being used against anyone.", wins: ["Team-level by default", "Thresholds you own", "Refusal list you can read"] },
      ],
    },
    fit: {
      title: "Be honest about the fit",
      good: ["Teams tired of metric disputes with no shared definition", "Leads defending predictability or headcount with evidence", "Orgs ready to publish their refusal list internally"],
      bad: ["Anyone wanting per-person performance numbers (not coming)", "Companies looking for vendor-invented industry benchmarks", "Teams wanting 40 dashboards — we ship nine metrics with moves attached"],
    },
    method: {
      title: "Our metric contract",
      intro: "The rules every metric in this product must pass to ship.",
      rows: [
        { label: "1 · Formula visible", detail: "Numerator, denominator, exclusions and source events on the card. If it can't be written plainly, it doesn't ship." },
        { label: "2 · Team-level", detail: "Individual granularity exists only for the person themselves. Manager views stop at the team boundary." },
        { label: "3 · Actionable", detail: "Every metric documents the move it's meant to trigger. Metrics without moves go on the deprecation list." },
        { label: "4 · Refusal list", detail: "Lines of code, per-person velocity, activity/keystroke scores and anything resembling surveillance are permanently out of scope." },
      ],
    },
    // NOTE(PLACEHOLDER): example quotes — replace when permissioned testimonials exist
    quotes: [
      { quote: "Opening a metric and seeing its formula ended a standing argument with my staff engineers. That alone was worth it.", name: "Early-access participant — CTO", role: "Health-tech startup" },
      { quote: "The refusal list is why we bought. A vendor that tells you what it won't measure is one that understands measurement.", name: "Early-access participant — VP Engineering", role: "Fintech scale-up" },
    ],
    updateTitles: ["Formula-on-card rollout", "Drift alerts with seasonality context"],
    faq: [
      { q: "Which metrics do you refuse to build?", a: "Lines of code, per-person velocity, activity or keyboard-time scores, and any per-person ranking view by default. The full refusal list is part of the product docs." },
      { q: "Can we benchmark against other companies?", a: "Not today — we'd rather show you your own trend than invent an industry number. Cross-team comparison within your workspace is available, caveats printed." },
      { q: "Who can see individual data?", a: "Only the individual. Managers and execs see team aggregates; flagged individuals see their own detail so they can correct it." },
      { q: "How do you handle seasonality and release weeks?", a: "Trend alerts include a context line showing release windows and known quiet periods, and thresholds can be temporarily widened for launch weeks — visibly." },
      { q: "What's the source of the numbers?", a: "Jira events (issues, transitions, reviews) and calendar meeting load. Every card lists its exact source events and last recalculation time." },
    ],
    related: sharedRelated("ethical-metrics"),
    cta: {
      title: "Put the receipts on the dashboard",
      body: "Start with three documented metrics, set the thresholds with your team, and end the 'whose numbers are these' meeting. 14-day trial, no card.",
      primary: { label: "Start free trial", href: "/signup" },
      secondary: { label: "See the demo data", href: "/#equity" },
    },
  },
]

export const productBySlug = (slug: string) => products.find((p) => p.slug === slug)
