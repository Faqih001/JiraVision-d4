// Content for the migration hub (/migration), composed by
// app/(marketing)/migration/page.tsx and the co-located planner island.
//
// Honesty rules (REDESIGN_PLAN v2 §5b):
// - No invented migration counts, durations or success rates presented as
//   guarantees. Every number the planner prints is derived from the model
//   inputs below, in the open, and is labelled "typical, based on workspace
//   size — illustrative, not a commitment".
// - NOTE(PLACEHOLDER): values flagged PLACEHOLDER are unconfirmed by the owner
//   (attachment ceilings, per-tool export limits, competitor field semantics,
//   example quotes). The rendered copy stays neutral about them and never
//   states one as a promise; it always says "confirm scope with us".
// - Structural fact the whole page leans on: JiraVision sits ON Jira. It is not
//   a replacement issue database, so a Jira team does not migrate data at all.

import type { BgVariant } from "@/components/sections/section-bg"

export type MigrationSourceId = "jira" | "asana" | "linear" | "trello" | "notion"

export type MigrationPhaseKey =
  | "discovery"
  | "mapping"
  | "build"
  | "dualrun"
  | "cutover"
  | "archive"

/** One phase of the model. Hours are `base + hoursPerSeat × teamSize`. */
export interface MigrationPhaseModel {
  key: MigrationPhaseKey
  title: string
  intent: string
  tasks: string[]
  exitCriteria: string
  baseHours: number
  hoursPerSeat: number
}

/** Per-source multipliers on the phase model. 1 = the neutral mid-point. */
export type MigrationFactors = Record<MigrationPhaseKey, number>

export interface MigrationFieldRow {
  them: string
  ours: string
  how: "carries" | "rebuilt" | "stays behind"
  note: string
}

export interface MigrationSource {
  id: MigrationSourceId
  label: string
  kicker: string
  summary: string
  factors: MigrationFactors
  /**
   * Extra hours per seat when "carry attachments" is on, folded into the
   * workspace-build phase.
   * NOTE(PLACEHOLDER): these are model weights, not measured throughput, and the
   * attachment volume ceilings themselves are unconfirmed.
   */
  attachmentHoursPerSeat: number
  dualRunNote: string
  fieldMap: MigrationFieldRow[]
  audience: { who: string; body: string; wins: string[] }
}

export const migrationHero = {
  eyebrow: "Migration hub",
  badge: "Bring your history with you",
  title: "Moving in is not the same as losing everything",
  subtitle:
    "Most teams never migrate at all: JiraVision sits on top of your Jira, so your issues, history and sprints stay exactly where they are. If you're coming from Asana, Linear, Trello or Notion, this page is the honest version — what carries, what gets rebuilt, and what you should leave read-only for a while.",
  bullets: [
    "Jira teams: no export, no import — JiraVision reads your existing project",
    "Build a step-by-step plan for your own workspace and download it",
    "Effort ranges are labelled illustrative, never a commitment",
  ],
  primary: { label: "Plan my migration", href: "#planner" },
  secondary: { label: "Ask us before planning", href: "/contact" },
}

export const migrationProblem = {
  eyebrow: "The problem",
  title: "Nobody fears a new tool. They fear losing five years of history.",
  intro:
    "The hard part of adopting anything is the suspicion that you'll trade a known workspace for an empty one — and find out three months later that the context lived in comments nobody copied.",
  items: [
    {
      title: "The frame is usually wrong",
      body:
        "Vendor migration pages describe ripping the old tool out. That's the moment people freeze: an irreversible write on a workspace full of other people's work. We don't ask for it.",
    },
    {
      title: "JiraVision sits on Jira",
      body:
        "If your issues already live in Jira, there is no import. JiraVision reads your Jira project — issues, history, sprints, story points — and writes back only through the approval gate. Your source of truth doesn't move.",
    },
    {
      title: "For everyone else, it's a project",
      body:
        "Coming from Asana, Linear, Trello or Notion is real work with real sequencing. So it gets a plan with phases, exit criteria and an archive step — not a promises page.",
    },
  ],
}

// ---------------------------------------------------------------------------
// The planner model
// ---------------------------------------------------------------------------

export const migrationPhases: MigrationPhaseModel[] = [
  {
    key: "discovery",
    title: "Discovery",
    intent: "Read the workspace before anybody makes a decision about it.",
    tasks: [
      "Give JiraVision a read-only view of the source workspace",
      "Count issues, projects, custom fields and automation rules",
      "List every dashboard, integration and report that reads the old tool today",
      "Name the two people who can answer schema questions",
      "Write down what you would actually miss if the old tool vanished tomorrow",
    ],
    exitCriteria: "A written scope list exists and both named owners have agreed to it.",
    baseHours: 4,
    hoursPerSeat: 0.25,
  },
  {
    key: "mapping",
    title: "Field mapping",
    intent: "Every source field gets a target, a fallback, or an honest “stays behind”.",
    tasks: [
      "Agree issue types and status → board column pairs",
      "Point the sizing field at story points; flag fields with mixed types",
      "Decide what happens to archived and closed items (usually: they stay put)",
      "Convert label/colour taxonomies into components, or drop them on purpose",
      "Record every row the importer will refuse, before the import",
    ],
    exitCriteria:
      "A mapping sheet where every row reads carries, rebuilt, or stays behind — no “we'll see”.",
    baseHours: 6,
    hoursPerSeat: 0.5,
  },
  {
    key: "build",
    title: "Workspace build",
    intent: "Boards, permissions and automations exist before anyone depends on them.",
    tasks: [
      "Create projects and boards from the signed-off mapping sheet",
      "Set roles: who can edit, who is read-only, who approves AI proposals",
      "Rebuild only the automations people actually missed",
      "Attach the AI Scrum Master in read-only draft mode first",
      "Dry-run one real sprint on the pilot team",
    ],
    exitCriteria: "A pilot team runs a full sprint end to end without opening the old tool.",
    baseHours: 8,
    hoursPerSeat: 0.6,
  },
  {
    key: "dualrun",
    title: "Parallel run",
    intent: "Two sprints with both tools open, JiraVision as the working copy.",
    tasks: [
      "Run two consecutive sprints with the old tool still writable",
      "Compare committed vs delivered at every retro, in both tools",
      "Log each occasion the old tool won, with the reason",
      "Freeze creation of new dashboards and reports in the old tool",
    ],
    exitCriteria: "Zero blocking gaps across two consecutive sprints.",
    baseHours: 10,
    hoursPerSeat: 0.8,
  },
  {
    key: "cutover",
    title: "Cutover",
    intent: "A date, not a mood: one announcement, one switch, one watch period.",
    tasks: [
      "Pick the sprint boundary to switch on, at least five working days out",
      "Announce with the archive location, not just the date",
      "Flip default tooling and repoint integrations",
      "Watch the first sprint daily; old tool stays reachable",
    ],
    exitCriteria: "One full sprint closes with nobody needing write access to the old workspace.",
    baseHours: 3,
    hoursPerSeat: 0.15,
  },
  {
    key: "archive",
    title: "Archive & cleanup",
    intent: "The old workspace goes read-only. Nothing is deleted until you say so.",
    tasks: [
      "Set the old workspace read-only — do not delete it",
      "Write down who holds the export backup and where it lives",
      "Close out anything the importer dropped, item by item",
      "Keep the scope list with the account notes for future audits",
      "Only then decide about cancelling the old licence",
    ],
    exitCriteria:
      "Old tool is read-only, the backup location is written down, and no team member has write access.",
    baseHours: 2,
    hoursPerSeat: 0.05,
  },
]

/**
 * NOTE(PLACEHOLDER): the factor tables below are our working model of how much
 * heavier each source is than the Jira case. They are not measured delivery
 * data — they exist so the planner's arithmetic is inspectable, and they are the
 * first thing to replace with real numbers once migrations are logged.
 */
export const migrationSources: MigrationSource[] = [
  {
    id: "jira",
    label: "Jira (already our source of truth)",
    kicker: "Jira",
    summary:
      "Nothing to import. JiraVision reads your Jira project and writes back only when you approve a plan, so migration here is configuration, not data movement.",
    factors: { discovery: 0.6, mapping: 0.25, build: 0.35, dualrun: 1, cutover: 0.5, archive: 0.6 },
    attachmentHoursPerSeat: 0,
    dualRunNote:
      "For Jira teams the parallel run is free: Jira stays authoritative the whole time, so “both tools open” is just the default state.",
    fieldMap: [
      { them: "Issue type", ours: "Issue type", how: "carries", note: "Read straight from Jira — no rename, no remap." },
      { them: "Status / workflow", ours: "Board column", how: "carries", note: "Statuses map one-to-one; the workflow itself is untouched." },
      { them: "Sprint", ours: "Sprint", how: "carries", note: "Jira sprints are read, never recreated." },
      { them: "Story points field", ours: "Story points", how: "carries", note: "Needs to be numeric and on the screen scheme — a config check, not a conversion." },
      { them: "Comments & history", ours: "Activity timeline", how: "carries", note: "Read from Jira. Nothing is re-entered or duplicated." },
    ],
    audience: {
      who: "Jira-only teams",
      body:
        "You are not migrating. You are connecting a read-only integration, approving a scope list, and turning the planning layer on sprint by sprint.",
      wins: [
        "No export file, no import job, no double-keying",
        "History and attachments stay in Jira where audit already points",
        "The worst case is uninstalling an app",
      ],
    },
  },
  {
    id: "asana",
    label: "Asana",
    kicker: "Asana",
    summary:
      "Sections and custom fields carry best; the work is deciding which section was really a status and which was really a workflow stage.",
    factors: { discovery: 1, mapping: 1.6, build: 1.7, dualrun: 1.2, cutover: 1.3, archive: 1 },
    attachmentHoursPerSeat: 0.5,
    dualRunNote:
      "Run at least two sprints with Asana still writable. Section semantics are where these projects disagree most, and it shows up under load, not in a mapping sheet.",
    fieldMap: [
      { them: "Task", ours: "Issue", how: "carries", note: "Name, description and assignee come across." },
      { them: "Section", ours: "Board column or epic", how: "rebuilt", note: "Needs a human decision per section: status or grouping?" },
      { them: "Number custom field", ours: "Story points", how: "carries", note: "Only when the field is numeric and consistent across the project." },
      { them: "Project", ours: "Jira project", how: "carries", note: "One Asana project per Jira project keeps the mapping legible." },
      { them: "Comments", ours: "Activity", how: "carries", note: "Text and @mentions as text. Nested file links need the attachment pass." },
    ],
    audience: {
      who: "Asana teams",
      body:
        "Strongest fit when Asana is already being used as a sprint board rather than a task list — the section structure maps cleanly once somebody rules on what each section means.",
      wins: [
        "Sections become columns or epics on purpose, not by accident",
        "Number fields pick up story-point meaning",
        "Comment threads come with the task",
      ],
    },
  },
  {
    id: "linear",
    label: "Linear",
    kicker: "Linear",
    summary:
      "The closest shape to ours of the four. Estimates and sub-issues translate directly; teams cycles is the one concept that needs a decision.",
    factors: { discovery: 0.9, mapping: 1.3, build: 1.4, dualrun: 1.1, cutover: 1.2, archive: 0.9 },
    attachmentHoursPerSeat: 0.35,
    dualRunNote:
      "Shortest parallel run of the non-Jira sources. If two sprints are clean, cut over — Linear's state model rarely surprises you twice.",
    fieldMap: [
      { them: "Issue", ours: "Issue", how: "carries", note: "Title, description, assignee, priority." },
      { them: "State", ours: "Board column", how: "carries", note: "The default five states map 1:1; custom categories need a rule." },
      { them: "Estimate", ours: "Story points", how: "carries", note: "Numeric estimates carry; point-scale labels need a fixed mapping." },
      { them: "Sub-issue", ours: "Child issue / sub-task", how: "carries", note: "Parent links are rebuilt after the child rows exist." },
      { them: "Cycle", ours: "Sprint", how: "rebuilt", note: "Continuous cycles become fixed sprints — a team habit change, not a data problem." },
    ],
    audience: {
      who: "Linear teams",
      body:
        "Usually a motivation migration rather than a data migration: you want capacity, load and fairness signals Linear doesn't produce. Plan the sprints first, the import second.",
      wins: [
        "Estimates carry as real numbers, not converted labels",
        "Sub-issue structure survives the move",
        "Cycle → sprint is the only workflow decision that matters",
      ],
    },
  },
  {
    id: "trello",
    label: "Trello",
    kicker: "Trello",
    summary:
      "Lists become columns and cards become issues cleanly. The gap is sizing: boards have no points, so the first sprint is where estimation starts.",
    factors: { discovery: 0.8, mapping: 1.4, build: 1.5, dualrun: 1.2, cutover: 1.1, archive: 0.9 },
    attachmentHoursPerSeat: 0.3,
    dualRunNote:
      "Boards with checklists and due dates hide real scope. Do the parallel run even for a small team — the surprises are in the checklists.",
    fieldMap: [
      { them: "List", ours: "Board column", how: "carries", note: "Order preserved, WIP limits are yours to add later." },
      { them: "Card", ours: "Issue", how: "carries", note: "Title, description, due date and members." },
      { them: "Checklist items", ours: "Sub-tasks", how: "carries", note: "Kept as child items, with completion state." },
      { them: "Labels", ours: "Components / labels", how: "rebuilt", note: "Colour-only labels are worth dropping rather than importing." },
      { them: "Story points", ours: "Story points", how: "stays behind", note: "There is nothing to carry — sizing begins on day one in JiraVision." },
    ],
    audience: {
      who: "Trello teams",
      body:
        "The migration is easy and the discipline is the project. Budget most of your effort into the first two sprints, where estimation is a new habit rather than a new tool.",
      wins: [
        "Lists and checklists translate without interpretation",
        "Capacity and workload answers arrive immediately",
        "Colour-taxonomy labels get deliberately pruned, not silently dropped",
      ],
    },
  },
  {
    id: "notion",
    label: "Notion",
    kicker: "Notion",
    summary:
      "Databases are the easy half. The hard half is deciding which pages are actually work items and which are documentation that should stay documentation.",
    factors: { discovery: 1.1, mapping: 1.9, build: 1.8, dualrun: 1.3, cutover: 1.4, archive: 1.1 },
    attachmentHoursPerSeat: 0.6,
    dualRunNote:
      "The longest parallel run of any source. Docs-as-tickets tend to surface in week three, when somebody notices a page nobody moved.",
    fieldMap: [
      { them: "Database item", ours: "Issue", how: "carries", note: "Properties become fields; the page body becomes the description." },
      { them: "Select option", ours: "Status / column", how: "carries", note: "One select should be the workflow; the rest become labels." },
      { them: "Number property", ours: "Story points", how: "carries", note: "Only if it means effort — the common failure is importing an ID column as points." },
      { them: "Relation", ours: "Linked issue", how: "rebuilt", note: "Two-way relations become explicit links, one direction at a time." },
      { them: "Page blocks / embeds", ours: "Description (text)", how: "stays behind", note: "Rich text converts; embeds, synced blocks and sub-pages stay put." },
    ],
    audience: {
      who: "Notion teams",
      body:
        "Run the discovery phase as a triage: docs stay in Notion, work items become issues. Teams that skip this end up with a Jira full of meeting notes.",
      wins: [
        "Documentation stops pretending to be a backlog",
        "Select-driven workflows map to real board columns",
        "Relations become traceable links instead of page titles",
      ],
    },
  },
]

export const defaultMigrationConfig = {
  sourceId: "jira" as MigrationSourceId,
  teamSize: 20,
  includeAttachments: true,
  dualRun: true,
}

export const migrationTeamRange = { min: 5, max: 100, step: 1 }

/** Every estimate the planner prints is wrapped in this sentence. */
export const estimateDisclaimer =
  "typical, based on workspace size — illustrative, not a commitment"

/**
 * The planner's only scope proxy: team size. Kept explicit so MethodSection can
 * describe the model without hand-waving.
 */
export const scopeModel = {
  /** `boards = round(teamSize / boardsPerSeat)`, floored at 1. */
  boardsPerSeat: 5,
  /** Effort band around the model mid-point, as fractions. */
  bandLow: 0.7,
  bandHigh: 1.35,
  /** Elapsed weeks = mid-range hours ÷ this many focused hours per week. */
  hoursPerWeekMax: 10,
  hoursPerWeekMin: 6,
}

// ---------------------------------------------------------------------------
// Editorial sections
// ---------------------------------------------------------------------------

export const migrationSteps = {
  id: "steps",
  eyebrow: "The sequence",
  title: "Discovery, parallel run, cutover, archive — in that order",
  intro:
    "Every phase has an exit criterion, and the archive phase is a phase. That ordering is the reason a migration can be paused: you always know which gate you're standing in front of.",
  steps: [
    {
      title: "Discovery",
      body:
        "Read-only. We inventory issues, fields, automations and the dashboards people depend on. Nothing is written anywhere.",
    },
    {
      title: "Parallel run",
      body:
        "Two sprints with both tools open. The old tool stays writable precisely because we expect it to win a few arguments.",
    },
    {
      title: "Cutover",
      body:
        "A named date at a sprint boundary, announced with the archive location attached. One switch, then a daily watch period.",
    },
    {
      title: "Archive",
      body:
        "The old workspace goes read-only and stays there. Deletion is a separate, much later decision — usually never taken.",
    },
  ],
}

// "Not a data-loss event" band.
export const migrationDataBand = {
  id: "data",
  eyebrow: "Not a data-loss event",
  title: "What actually comes with you",
  intro:
    "Read this before the planner. The scariest question in any migration is what you can't get back, so here is the split written down: what is copied, what stays where it is, and what we deliberately do not touch.",
  columns: [
    {
      title: "Copied into your workspace",
      accent: "carries" as const,
      items: [
        "Issues or tasks: title, description, assignee, due date",
        "Comment threads and history where the source exposes them",
        "Status, priority and estimate fields that have a numeric target",
        "Sub-tasks and checklists, with their completion state",
      ],
    },
    {
      title: "Stays where it is",
      accent: "stays" as const,
      items: [
        "For Jira teams: everything. Jira remains the source of truth",
        "Attachments remain in the original system unless copied on purpose",
        "Archived and closed items usually stay archived — by decision",
        "Documentation pages stay documentation, not issues",
      ],
    },
    {
      title: "Never copied",
      accent: "excluded" as const,
      items: [
        "Credentials, tokens and SAML configuration",
        "User accounts — people are invited, not imported",
        "Embeds, synced blocks and cross-workspace page widgets",
        "Nothing is deleted from the old tool by us, ever",
      ],
    },
  ],
  /**
   * NOTE(PLACEHOLDER): attachment volume ceilings and per-source export limits
   * are unconfirmed, so this line states a process instead of a number.
   */
  footnote:
    "Attachment scope is the one thing we won't quote a number for on a page: ceilings depend on your workspace and on source-side export limits we have not pinned down. Confirm scope with us before committing — we'll tell you where your workspace lands.",
  footnoteCta: { label: "Ask about attachment scope", href: "/contact" },
}

export const migrationDecisions = {
  eyebrow: "Your side of the table",
  title: "Four decisions only you can make",
  intro:
    "We can run the mechanics. These four calls belong to the team, and every one of them is a conversation that gets cheaper before the migration than after it.",
  items: [
    {
      title: "What each status means",
      body:
        "In the old tool, “In Review” probably means three different things to three different people. Pick one meaning per column, or the column becomes a parking bay.",
    },
    {
      title: "Which field is the sizing field",
      body:
        "One numeric field, and it means effort. Teams that carry a ticket ID or an hours-original-estimate column in as story points get a capacity model that lies to them.",
    },
    {
      title: "What stays documentation",
      body:
        "Especially from Notion and Asana: pages that describe work are not work items. Decide the boundary, or inherit a backlog of meeting notes.",
    },
    {
      title: "When the date is, and where the archive lives",
      body:
        "Cutover needs a named sprint boundary and a written location for the read-only workspace. “Soon” is not a plan; nobody has to sign anything on the day.",
    },
  ],
  bgVariant: "stacked" as BgVariant,
}

export const migrationMethod = {
  eyebrow: "How these numbers are made",
  title: "The estimate model, with the working shown",
  intro:
    "The planner above is arithmetic you can audit. Here is every input it uses — including the ones we'd rather not have to explain, like why we won't promise you a date.",
  rows: [
    {
      label: "One input: team size",
      detail:
        "Every phase costs base + (hours per seat × your team size). Team size is a proxy for workspace size; it is not a measure of how disciplined you are.",
    },
    {
      label: "One weight: which tool you're leaving",
      detail:
        "Each source carries a multiplier per phase. Jira is well under 1 because there is no data movement; Notion is over 1 because documentation triage is slow.",
    },
    {
      label: "A band, not a point",
      detail:
        "We show 70% to 135% of the mid figure. A single number implies a precision nobody has earned, and the low end is what a good week looks like.",
    },
    {
      label: "Elapsed weeks ≠ effort",
      detail:
        "Weeks are the mid-range hours divided by 6–10 focused hours per week. Nobody migrates a workspace full-time, and pretending otherwise is how dates get missed.",
    },
    {
      label: "Two switches change the shape",
      detail:
        "Carrying attachments adds scope-review hours to the build phase. Turning off the parallel run deletes a whole phase — and moves its risk into your cutover week.",
    },
    {
      label: "What the model refuses to claim",
      detail:
        "No migration counts, no “typical team finishes in X weeks”, no adoption-rate promises. We have not logged enough migrations yet to publish any of those honestly.",
    },
    {
      label: "Where the numbers come from",
      detail:
        "Our own phase checklist, priced by hand. The inputs we haven't confirmed — attachment ceilings and competitor field semantics — are the first things to replace once real migrations are instrumented. Until then they are labelled as model weights, never as facts.",
    },
  ],
  bgVariant: "hatch" as BgVariant,
}

export const migrationFit = {
  title: "When a migration is not worth it",
  good: [
    "You're on Jira and want planning, load and fairness signals — there's no migration to do",
    "One to four teams that can run a real parallel sprint without a programme plan",
    "Your old tool's reporting is the actual reason for leaving, and it's documented",
    "Somebody can own the mapping sheet for two weeks",
  ],
  bad: [
    "You're on Jira Data Center with a compliance regime that blocks a cloud integration — talk to us first",
    "The tool isn't the problem: nobody estimates, or the roadmap is decided elsewhere",
    "A 400-seat single workspace where no team can name their own custom fields",
    "You need the old licence cancelled by a date that is already next week",
  ],
  bgVariant: "dots" as BgVariant,
}

export const migrationAudience = {
  eyebrow: "Per-source notes",
  title: "What changes by source, and what doesn't",
  intro:
    "The sequence is the same for everyone. What changes is which phase eats your time, and how much of your old workspace's meaning survives the trip.",
  items: migrationSources.map((s) => s.audience),
  bgVariant: "band-clay" as BgVariant,
}

export const migrationQuotes = {
  title: "What early teams said afterwards",
  /**
   * NOTE(PLACEHOLDER): example quotes from the early-access round, left
   * unattributed on purpose. Replace with permissioned, attributed testimonials
   * or delete this section — do not invent names or companies.
   */
  items: [
    {
      quote:
        "The part that convinced our lead engineer was the archive step. Read-only, not deleted — so saying yes wasn't irreversible.",
      name: "Early-access participant",
      role: "Engineering manager",
    },
    {
      quote:
        "We came from Notion and spent longer deciding which pages were work than we did importing anything. They warned us, in writing, before we started.",
      name: "Early-access participant",
      role: "Product lead",
    },
  ],
  bgVariant: "shapes" as BgVariant,
}

export const migrationFaq = {
  id: "faq",
  title: "Questions about moving in",
  items: [
    {
      q: "Do we have to export our Jira data anywhere?",
      a: "No. If Jira is your issue tracker, JiraVision reads it through the integration and writes back only through the approval gate. There is no export file, no import job, and no window where your history is in two places.",
    },
    {
      q: "Will our comments and history come across from Asana, Linear, Trello or Notion?",
      a: "Text comments and the item history that a source exposes through its API do carry. Nested page content, embeds and synced blocks don't — those stay where they are, and the field maps above list them row by row.",
    },
    {
      q: "What about attachments?",
      a: "Attachments stay in the original system unless you ask for a copy pass. Volume ceilings and per-source export limits are things we confirm against your workspace rather than quote on a page — ask us and we'll tell you before you commit.",
    },
    {
      q: "How long does it take?",
      a: "The planner gives you an illustrative range from team size and source, with the arithmetic on screen. Treat it as a starting shape for a conversation, not a delivery date. We publish no average migration time because we haven't instrumented enough of them to do that honestly.",
    },
    {
      q: "Can we go back if it doesn't work?",
      a: "Yes — that is the whole point of the parallel run and the read-only archive. Nothing in the old workspace is deleted by us, ever. For Jira teams the rollback is “stop using the layer”; for the others it's “start writing in the old tool again”, and your data was still there the whole time.",
    },
    {
      q: "Who does the work — us or you?",
      a: "You own the decisions (what each section means, which fields are sizing, what stays documentation). We run the discovery inventory, the mapping sheet and the workspace build alongside you. Nobody should be doing this alone at 11pm.",
    },
    {
      q: "What's the minimum sensible team size for this?",
      a: "The planner covers five people upward. Below that, connect JiraVision to Jira or run one sprint in it alongside your current tool and decide from experience — a migration plan for three people is theatre.",
    },
  ],
  moreHref: "/faq",
  moreLabel: "All questions",
  bgVariant: "grain" as BgVariant,
}

// Related links. The /compare/* slugs mirror content/compare.ts (the compare
// pages built alongside this hub); if those slugs change, update this array only
// — it is the single source for the migration hub's outbound links.
export const migrationRelated = {
  eyebrow: "Keep looking",
  title: "Neighbouring pages",
  items: [
    {
      title: "Jira, with the layer on top",
      href: "/compare/generic-jira",
      summary: "What JiraVision adds by reading your Jira — and what it deliberately never replaces.",
    },
    {
      title: "Asana vs JiraVision",
      href: "/compare/asana",
      summary: "Where task-list thinking stops answering sprint questions, feature by feature.",
    },
    {
      title: "Linear vs JiraVision",
      href: "/compare/linear",
      summary: "Closest shape of the four sources — the gap is capacity and fairness signals.",
    },
    {
      title: "Notion vs JiraVision",
      href: "/compare/notion",
      summary: "Docs versus backlog: the triage that decides what a migration actually means.",
    },
    {
      title: "AI Scrum Master",
      href: "/products/ai-scrum-master",
      summary: "The reason most teams switch on the layer first and worry about the tool later.",
    },
    {
      title: "Pricing",
      href: "/pricing",
      summary: "Per-seat, 14-day trial, no card — and no onboarding fee bolted onto a migration.",
    },
  ],
  bgVariant: "grid" as BgVariant,
}

export const migrationCta = {
  title: "Bring your history with you — or don't move yet",
  body:
    "Start with a read-only discovery pass and a scope list you can argue with. If the answer is “not worth it”, we'll say so in writing, because the fit section above isn't decoration.",
  primary: { label: "Start free trial", href: "/signup" },
  secondary: { label: "Book a migration walkthrough", href: "/contact" },
  watermark: "⇄",
}

export const migrationAnchorNav = {
  links: [
    { label: "Planner", href: "#planner" },
    { label: "Data", href: "#data" },
    { label: "Sequence", href: "#steps" },
    { label: "Field mapping", href: "#mapping" },
    { label: "Parallel run", href: "#dualrun" },
    { label: "Rollback", href: "#rollback" },
    { label: "Estimates", href: "#method" },
    { label: "Sources", href: "#sources" },
    { label: "FAQ", href: "#faq" },
  ],
}
