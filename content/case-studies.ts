// Illustrative deployment scenarios for /resources/case-studies.
//
// NOTE(PLACEHOLDER): the previous version of these pages published three
// "customer stories" — named companies, named executives, attributed quotes and
// precise result percentages (35% productivity, 42% burnout reduction, 4.8/5
// satisfaction). None of it was real, and publishing invented customer
// testimonials is a false-advertising risk, not just filler. PLACEHOLDERS.md
// tracks the owner decision about replacing these with real references.
//
// Until a real customer agrees to be named, this module keeps the three public
// URLs alive as clearly-labelled scenarios: a fictitious team, the product
// settings that would be turned on for them (each linking to the real route),
// and the measures worth watching (each stating where the number comes from, so
// nothing is asserted that the product cannot compute).
//
// To publish a real story, add `customer: { name, url? }` plus `results` here;
// the reader shows the attribution block only when `customer` is present.

export type CaseStudyTopic = "AI Scrum Master" | "Team Wellbeing" | "Scaling Delivery"

export type CaseStudyStep = {
  title: string
  detail: string
  /** signed-in route the step configures */
  route?: string
  /** slug in content/documentation.ts — verified by tests/unit/case-studies.test.ts */
  doc?: string
}

export type CaseStudyMeasure = {
  label: string
  /** Where the number comes from. Never a claimed result. */
  how: string
}

export type CaseStudyEntry = {
  slug: string
  /** Obviously fictitious. Never presented as a customer. */
  team: string
  title: string
  summary: string
  topic: CaseStudyTopic
  shape: { label: string; value: string }[]
  situation: string[]
  setup: CaseStudyStep[]
  measures: CaseStudyMeasure[]
  relatedDocs: string[]
  relatedProduct?: string
  /** Present only for a real, permissioned reference. */
  customer?: { name: string; url?: string }
}

export const caseStudyTopics: CaseStudyTopic[] = [
  "AI Scrum Master",
  "Team Wellbeing",
  "Scaling Delivery",
]

export const caseStudies: Record<string, CaseStudyEntry> = {
  "acme-corp-transformation": {
    slug: "acme-corp-transformation",
    team: "Acme — 60-person product org",
    title: "Acme adopts a draft-then-approve sprint plan",
    summary:
      "A scenario for a product org whose sprint planning has outgrown one Scrum Master: what to turn on, in what order, and which numbers tell you whether it worked.",
    topic: "AI Scrum Master",
    shape: [
      { label: "Team", value: "60 people across 6 squads" },
      { label: "Cadence", value: "Two-week sprints, shared backlog per squad" },
      { label: "Existing tooling", value: "CSV export from the previous tracker" },
    ],
    situation: [
      "Planning takes a full day per squad and still ships over-committed sprints.",
      "One Scrum Master covers three squads, so two of them plan without one.",
      "Estimates are carried over from the last sprint whether or not they were right.",
      "Nobody can say which squads are over-loaded until the sprint already slipped.",
    ],
    setup: [
      {
        title: "Import the backlog before anything else",
        detail:
          "The CSV importer maps columns onto the real task fields — status, priority, story points, assignee, sprint and due date. Planning quality is bounded by import quality, so this comes first and the importer reports rows it could not place.",
        route: "/dashboard/tasks",
        doc: "importing-data",
      },
      {
        title: "Record capacity and skills per member",
        detail:
          "The draft plan reads open load, recent completed points, recorded meeting and PTO pressure, and the skills on each member's profile. Missing any of those produces a plan that looks confident and is not.",
        route: "/dashboard/team",
        doc: "inviting-users",
      },
      {
        title: "Turn on the draft plan for one squad",
        detail:
          "The AI Scrum Master produces a draft with a plain-language rationale per suggested task. Nothing reaches the board until a human accepts it, and accepting writes through the same task and sprint endpoints a manual edit uses — so the activity log and notifications look identical either way.",
        route: "/dashboard/ai-scrum-master",
        doc: "ai-scrum-master-guide",
      },
      {
        title: "Set sprint goals the draft can be measured against",
        detail:
          "Goals give the health score something to compare against beyond raw throughput. Without them the gauge only tells you whether tasks moved.",
        route: "/dashboard/goals",
        doc: "sprints-and-goals",
      },
      {
        title: "Subscribe the right people to the right events",
        detail:
          "Notifications are per-user and per-type. Squad leads get draft-ready and slipped-item alerts; the rest of the org does not.",
        route: "/dashboard/settings",
        doc: "notifications",
      },
      {
        title: "Run the retrospective against the actuals",
        detail:
          "Retros compare the committed plan with what shipped. That comparison is the feedback loop that makes the next draft better — skipping it leaves the plan learning nothing.",
        route: "/dashboard/retros",
        doc: "automation-and-activity",
      },
    ],
    measures: [
      {
        label: "Planning time per squad",
        how: "Wall-clock time in the planning meeting, recorded by the squad. JiraVision does not time your meetings.",
      },
      {
        label: "Committed versus completed points",
        how: "Computed on /dashboard/sprints from the task rows in each sprint — the same numbers the burndown lines plot.",
      },
      {
        label: "Draft acceptance rate",
        how: "Accepted versus dismissed recommendations, on /dashboard/ai-scrum-master. Dismissals keep their reason, so a low rate is diagnosable rather than mysterious.",
      },
      {
        label: "Load spread across the squad",
        how: "The workload-distribution indicator on /dashboard/ethical-metrics, which prints its own formula and exclusions when you open the card.",
      },
    ],
    relatedDocs: ["ai-scrum-master-guide", "sprints-and-goals", "importing-data", "metrics-guide"],
    relatedProduct: "/products/ai-scrum-master",
  },

  "globaltech-wellbeing": {
    slug: "globaltech-wellbeing",
    team: "GlobalTech — 200-person engineering org",
    title: "GlobalTech wires after-hours drift into an alert",
    summary:
      "A scenario for an org that keeps saying it cares about burnout but has no signal until someone resigns: which indicators to enable, what to deliberately leave off, and who is allowed to see what.",
    topic: "Team Wellbeing",
    shape: [
      { label: "Team", value: "200 engineers across 14 teams" },
      { label: "Cadence", value: "Continuous flow, no fixed sprint boundary" },
      { label: "Existing tooling", value: "Calendar plus a ticket tracker" },
    ],
    situation: [
      "Two senior engineers left in a quarter and both exit interviews named workload.",
      "The org measures output by tickets closed, which rewards the people working nights.",
      "Managers see individual numbers and start comparing them aloud.",
      "There is no agreed threshold for 'too much', so nobody raises it early.",
    ],
    setup: [
      {
        title: "Agree the refusal list first",
        detail:
          "Before any indicator is enabled, decide what will never be measured: no lines of code, no per-person velocity, no activity or keyboard-time scores, no default ranking of people against each other. Writing this down is what makes the rest of the rollout survivable.",
        doc: "ethical-metrics",
        route: "/dashboard/ethical-metrics",
      },
      {
        title: "Enable the four team-level indicators",
        detail:
          "Predictability, workload distribution, review equity and after-hours drift. All four aggregate to team level; each card expands to show its formula, the source events and the exclusions.",
        route: "/dashboard/ethical-metrics",
        doc: "metrics-guide",
      },
      {
        title: "Set thresholds and who gets alerted",
        detail:
          "Threshold configuration is stored per workspace. Alerts go to the people who can change the work — the team lead and the delivery manager — not to the whole org.",
        route: "/dashboard/team-wellbeing",
        doc: "team-wellbeing-setup",
      },
      {
        title: "Restrict who can see individual data at all",
        detail:
          "Roles decide whether a member, lead or admin can open per-person views. Individual ranking exists only behind an explicit switch that states its consequences before you turn it on.",
        route: "/dashboard/team",
        doc: "user-roles",
      },
      {
        title: "Give the check-in somewhere to land",
        detail:
          "Wellbeing check-ins are stored per member and feed the team-level trend. They are the only self-reported input in the model, so the page says so rather than blending them silently into computed figures.",
        route: "/dashboard/team-wellbeing",
        doc: "team-wellbeing-setup",
      },
      {
        title: "Export the numbers you publish upward",
        detail:
          "Any report dataset downloads as CSV or JSON. Publishing the same export leadership sees removes the temptation to re-narrate the numbers on the way up.",
        route: "/dashboard/reports",
        doc: "data-export",
      },
    ],
    measures: [
      {
        label: "After-hours drift",
        how: "Task events timestamped outside the member's configured working hours, aggregated to team level on /dashboard/ethical-metrics.",
      },
      {
        label: "Review equity",
        how: "Who reviews whose work, computed from review events in the workspace — the page shows the matrix it is built from.",
      },
      {
        label: "Load against seniority",
        how: "Whether the heaviest load lands on the least experienced members, from the member profiles and their open task load.",
      },
      {
        label: "Check-in trend",
        how: "Self-reported, per member, aggregated to team level. Treated as a signal to ask about, never as a score.",
      },
    ],
    relatedDocs: ["ethical-metrics", "team-wellbeing-setup", "user-roles", "data-export"],
    relatedProduct: "/products/team-wellbeing",
  },

  "startupx-scaling": {
    slug: "startupx-scaling",
    team: "StartupX — 8 people becoming 40",
    title: "StartupX scales from one board to five without a platform team",
    summary:
      "A scenario for a small org that has one shared board and is about to need five: how to split it, what to standardise, and which automation replaces the coordination one founder used to do from memory.",
    topic: "Scaling Delivery",
    shape: [
      { label: "Team", value: "8 today, 40 within three quarters" },
      { label: "Cadence", value: "One-week sprints, one board, everyone on it" },
      { label: "Existing tooling", value: "Spreadsheets and a chat channel" },
    ],
    situation: [
      "One board holds marketing, engineering and support work in the same columns.",
      "Status is communicated in chat and is stale within an hour.",
      "Nobody owns cross-team dependencies, so they surface at the deadline.",
      "Onboarding a new hire takes a founder two days of shadowing.",
    ],
    setup: [
      {
        title: "Start from a template, not a blank board",
        detail:
          "The board templates open directly in the product with columns, task fields and views already set. Copy one per team rather than inventing five variants of the same thing.",
        route: "/dashboard/kanban",
        doc: "boards-and-views",
      },
      {
        title: "Standardise the task fields once",
        detail:
          "Custom fields are defined at workspace level, so a 'customer tier' field means the same thing on all five boards and reports can group by it.",
        route: "/dashboard/tasks",
        doc: "task-fields",
      },
      {
        title: "Split the backlog from the sprint",
        detail:
          "Grooming happens in the backlog; the sprint is what the team committed to. Keeping them separate is what makes the committed-versus-completed number mean anything.",
        route: "/dashboard/backlog",
        doc: "sprints-and-goals",
      },
      {
        title: "Replace chat-status with automation",
        detail:
          "Rules fire on real events — task moved, comment added, sprint started — and post to the team's channel and to the notification feed. The rule list shows what each rule did last.",
        route: "/dashboard/automation",
        doc: "automation-and-activity",
      },
      {
        title: "Make cross-team dependencies visible",
        detail:
          "Goals sit above sprints and roll progress up from the tasks linked to them, which is where a dependency between two teams stops being tribal knowledge.",
        route: "/dashboard/goals",
        doc: "sprints-and-goals",
      },
      {
        title: "Write the onboarding path down",
        detail:
          "The quick start is the same document a new hire follows, and it only references routes that exist. Pair it with the activity feed so a newcomer can see how work actually moves here.",
        route: "/dashboard/activity",
        doc: "quick-start",
      },
    ],
    measures: [
      {
        label: "Cycle time per board",
        how: "Computed from task status-change timestamps on /dashboard/analytics — the page shows the window it aggregates over.",
      },
      {
        label: "Sprint commitment accuracy",
        how: "Points committed at sprint start versus completed at sprint end, on /dashboard/sprints.",
      },
      {
        label: "Cross-team goal progress",
        how: "Rolled up from the tasks linked to each goal on /dashboard/goals; the roll-up rule is shown on the goal.",
      },
      {
        label: "Time to first task for a new hire",
        how: "Observed by the team, not measured by the product. Stated here so it is not mistaken for a computed figure.",
      },
    ],
    relatedDocs: ["boards-and-views", "task-fields", "automation-and-activity", "quick-start"],
    relatedProduct: undefined,
  },
}

export const caseStudyList: CaseStudyEntry[] = Object.values(caseStudies)

export function getCaseStudy(slug: string): CaseStudyEntry | null {
  return caseStudies[slug] ?? null
}

export function caseStudySlugs(): string[] {
  return caseStudyList.map((entry) => entry.slug)
}

export function caseStudiesByTopic(topic: CaseStudyTopic): CaseStudyEntry[] {
  return caseStudyList.filter((entry) => entry.topic === topic)
}

/** Other scenarios, for the sidebar on a detail page. */
export function relatedCaseStudies(slug: string): CaseStudyEntry[] {
  return caseStudyList.filter((entry) => entry.slug !== slug)
}

export type CaseStudyFilter = CaseStudyTopic | "all"

/** Index search across title, summary, situation and setup copy. */
export function searchCaseStudies(
  query: string,
  topic: CaseStudyFilter = "all",
): CaseStudyEntry[] {
  const needle = query.trim().toLowerCase()
  return caseStudyList.filter((entry) => {
    if (topic !== "all" && entry.topic !== topic) return false
    if (!needle) return true
    const haystack = [
      entry.team,
      entry.title,
      entry.summary,
      entry.topic,
      ...entry.situation,
      ...entry.setup.flatMap((step) => [step.title, step.detail]),
      ...entry.measures.flatMap((measure) => [measure.label, measure.how]),
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(needle)
  })
}
