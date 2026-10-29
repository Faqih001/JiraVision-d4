// The published ladder (design §11): five disciplines x four rungs = twenty rows, seeded
// by scripts/create-career-tables.mjs. Wording lives in git so it is reviewable; bands
// stay null until the owner publishes real numbers — inventing a range would be the same
// fabricated claim the rest of this project refuses.
//
// This file deliberately imports nothing at runtime and stays free of database/cookie
// imports: the seed script loads it directly with Node's type stripping, and the tests
// load it without a connection string.

import type { CareerSignalKey } from "@/lib/career/signals"

export const LADDER_DISCIPLINES = [
  "developer",
  "technician",
  "designer",
  "auditor",
  "coordinator",
  "analyst",
  "finance",
  "operations",
  "hr",
  "sales_marketing",
  "healthcare_science",
  "engineering",
] as const

export type LadderDiscipline = (typeof LADDER_DISCIPLINES)[number]

export type LadderChecklistItem = { key: string; label: string; hint: string }

export type CareerLevelSeed = {
  discipline: LadderDiscipline
  level: 1 | 2 | 3 | 4
  title: string
  summary: string
  expectations: string
  bandMin: null
  bandMax: null
  bandCurrency: null
  signals: Record<CareerSignalKey, number>
  checklist: LadderChecklistItem[]
}

const DISCIPLINE_NAME: Record<LadderDiscipline, string> = {
  developer: "Developer",
  technician: "Technician",
  designer: "Designer",
  auditor: "Auditor",
  coordinator: "Coordinator",
  analyst: "Analyst",
  finance: "Finance",
  operations: "Operations",
  hr: "Human Resources",
  sales_marketing: "Sales & Marketing",
  healthcare_science: "Healthcare & Science",
  engineering: "Engineering",
}

const LEVELS = [
  {
    level: 1,
    name: "Junior",
    summary:
      "Works under review: logs their own days, closes what they are given, and asks before changing anything shared.",
    expectations:
      "Expect a reviewer on most work. Evidence is the log you kept and the tasks you closed, not the title on your profile.",
  },
  {
    level: 2,
    name: "Intermediate",
    summary:
      "Works independently on familiar work: reviews are timely, deliverables are approved, and the log is consistent.",
    expectations:
      "Expect to own the outcome of assigned work. Evidence is deliverables that reached approved and reports that were not returned.",
  },
  {
    level: 3,
    name: "Senior",
    summary:
      "Owns a workstream: other people rely on their reports, decisions and handovers.",
    expectations:
      "Expect to be the person asked when the workstream is unclear. Evidence is acknowledged reports and work that crossed a team boundary.",
  },
  {
    level: 4,
    name: "Lead",
    summary:
      "Sets the standard for the discipline: unblocks others, keeps the record current, and teaches the work.",
    expectations:
      "Expect to answer for how the discipline is practised. Evidence is other people using what you set up, not only your own output.",
  },
] as const

// Non-decreasing by rung, and every target is a count the log already records. Points are
// the one target that can legitimately stay low for non-engineering disciplines; the
// checklist carries the discipline-specific part.
const TARGETS: Record<1 | 2 | 3 | 4, Record<CareerSignalKey, number>> = {
  1: {
    days_logged_90: 20,
    actions_logged_90: 40,
    reviews_logged_90: 4,
    tasks_completed_90: 6,
    points_completed_90: 13,
    deliverables_delivered: 2,
    reports_submitted: 1,
    disciplines_touched: 1,
    plan_items_promoted: 0,
  },
  2: {
    days_logged_90: 35,
    actions_logged_90: 80,
    reviews_logged_90: 8,
    tasks_completed_90: 12,
    points_completed_90: 26,
    deliverables_delivered: 4,
    reports_submitted: 2,
    disciplines_touched: 2,
    plan_items_promoted: 1,
  },
  3: {
    days_logged_90: 55,
    actions_logged_90: 140,
    reviews_logged_90: 14,
    tasks_completed_90: 20,
    points_completed_90: 45,
    deliverables_delivered: 7,
    reports_submitted: 3,
    disciplines_touched: 3,
    plan_items_promoted: 3,
  },
  4: {
    days_logged_90: 70,
    actions_logged_90: 200,
    reviews_logged_90: 20,
    tasks_completed_90: 30,
    points_completed_90: 65,
    deliverables_delivered: 10,
    reports_submitted: 4,
    disciplines_touched: 4,
    plan_items_promoted: 6,
  },
}

type Item = { key: string; label: string; hint: string }

const SHARED_CHECKLIST: Record<1 | 2 | 3 | 4, Item[]> = {
  1: [
    {
      key: "log-thirty-days",
      label: "Work logged on thirty distinct days",
      hint: "Counted from the work log over the rolling 90-day window.",
    },
    {
      key: "close-five-tasks",
      label: "Five assigned tasks closed",
      hint: "Tasks assigned to you that reached done, not tasks you watched.",
    },
  ],
  2: [
    {
      key: "review-most-weeks",
      label: "A review entry in most weeks",
      hint: "Work log entries of kind review or deliverable across the window.",
    },
    {
      key: "four-approved-deliverables",
      label: "Four deliverables approved or delivered",
      hint: "Deliverables that reached approved or delivered, not drafts.",
    },
  ],
  3: [
    {
      key: "report-acknowledged",
      label: "A report acknowledged by its recipient",
      hint: "A submitted period report that was acknowledged, not returned.",
    },
    {
      key: "own-a-workstream",
      label: "Own a workstream across more than one week",
      hint: "The report names you as its owner and the work crossed more than one week.",
    },
  ],
  4: [
    {
      key: "teach-a-task",
      label: "Take someone else through a task you used to do",
      hint: "They completed it and a handover note exists.",
    },
    {
      key: "keep-records-current",
      label: "Keep your records verified on schedule",
      hint: "Every overdue verification is dated; none was silently skipped.",
    },
  ],
}

const DISCIPLINE_CHECKLIST: Record<LadderDiscipline, Record<1 | 2 | 3 | 4, Item>> = {
  developer: {
    1: {
      key: "ship-reviewed-change",
      label: "A change shipped after review",
      hint: "A merged pull request with a reviewer, not a commit pushed alone.",
    },
    2: {
      key: "own-a-module",
      label: "Own one module end to end",
      hint: "Named as the person who answers for it in the last review.",
    },
    3: {
      key: "lead-a-cross-team-change",
      label: "Lead a change that touched another team's code",
      hint: "Review comments addressed and a rollout note written.",
    },
    4: {
      key: "set-a-standard",
      label: "Set a standard the discipline follows",
      hint: "A template, lint rule or review checklist in use by other people.",
    },
  },
  technician: {
    1: {
      key: "record-a-handover",
      label: "An equipment handover recorded",
      hint: "Serial numbers and custody recorded in the handover note.",
    },
    2: {
      key: "keep-a-system-current",
      label: "Keep one system's documentation current",
      hint: "Verified within its interval, with the verification logged.",
    },
    3: {
      key: "restore-a-failed-service",
      label: "Restore a failed service and write the post-incident note",
      hint: "The note names the cause, the fix and the prevention.",
    },
    4: {
      key: "own-the-inventory",
      label: "Own the equipment inventory and its disposal trail",
      hint: "Every disposal has a reason and an approval recorded.",
    },
  },
  designer: {
    1: {
      key: "reviewed-design",
      label: "A design reviewed outside the project",
      hint: "Feedback recorded from someone who does not work on the project.",
    },
    2: {
      key: "contribute-a-component",
      label: "Contribute a component to the shared design system",
      hint: "Used by another project, not only this one.",
    },
    3: {
      key: "defend-a-decision",
      label: "Defend a design decision with evidence",
      hint: "Research or usage data cited in the review.",
    },
    4: {
      key: "set-a-pattern",
      label: "Set a reusable pattern for the product",
      hint: "Documented, adopted, and still in use after a quarter.",
    },
  },
  auditor: {
    1: {
      key: "signed-workpaper",
      label: "A workpaper signed off by a reviewer",
      hint: "Evidence attached and the reviewer named.",
    },
    2: {
      key: "complete-an-audit-cycle",
      label: "Complete an audit cycle unassisted",
      hint: "From planning to a signed report with no rework requested.",
    },
    3: {
      key: "follow-through-a-finding",
      label: "Find and follow through a material issue",
      hint: "From the finding to remediation agreed with the owner.",
    },
    4: {
      key: "own-the-method",
      label: "Own the sampling method",
      hint: "Documented, applied by other people, and defensible on review.",
    },
  },
  coordinator: {
    1: {
      key: "run-a-recurring-meeting",
      label: "Run a recurring coordination meeting for a month",
      hint: "Notes and actions logged for each occurrence.",
    },
    2: {
      key: "own-a-cadence",
      label: "Own a recurring cadence for a quarter",
      hint: "The schedule ran without you rebuilding it each time.",
    },
    3: {
      key: "resolve-a-cross-team-blocker",
      label: "Resolve a cross-team blocker",
      hint: "The resolution is recorded with the people involved named.",
    },
    4: {
      key: "run-a-cross-team-plan",
      label: "Run a plan with dependencies across teams",
      hint: "Dates, owners and blockers tracked to completion.",
    },
  },
  analyst: {
    1: {
      key: "document-a-data-source",
      label: "Document a data source with its schema and owner",
      hint: "Field definitions, refresh cadence and the person who answers for it.",
    },
    2: {
      key: "produce-a-repeatable-report",
      label: "Produce a report that ran three cycles without rework",
      hint: "Same structure, same data, no manual fixes between runs.",
    },
    3: {
      key: "own-an-analytical-method",
      label: "Own an analytical method used by another team",
      hint: "They cited your method and did not have to ask you how to run it.",
    },
    4: {
      key: "set-the-analytical-standard",
      label: "Set the analytical standard for the discipline",
      hint: "A methodology guide in active use by other analysts.",
    },
  },
  finance: {
    1: {
      key: "reconcile-a-ledger",
      label: "Reconcile a ledger within its reporting period",
      hint: "Every variance explained and signed off by a reviewer.",
    },
    2: {
      key: "close-a-period-unassisted",
      label: "Close a financial period unassisted",
      hint: "From journal entries to final report with no reviewer rework.",
    },
    3: {
      key: "own-a-financial-control",
      label: "Own a financial control end to end",
      hint: "The control is documented, tested and relied on by the next audit.",
    },
    4: {
      key: "set-a-financial-policy",
      label: "Set a financial policy adopted by the organisation",
      hint: "Approved, published and followed by other teams.",
    },
  },
  operations: {
    1: {
      key: "follow-a-standard-procedure",
      label: "Follow a standard operating procedure without deviation",
      hint: "Every step completed and signed off in the log.",
    },
    2: {
      key: "own-a-process",
      label: "Own a process and keep its documentation current",
      hint: "Verified within its interval, with the verification logged.",
    },
    3: {
      key: "improve-a-process",
      label: "Improve a process and measure the outcome",
      hint: "Before and after metrics recorded and acknowledged.",
    },
    4: {
      key: "own-the-operational-method",
      label: "Own the operational method for the discipline",
      hint: "Documented, applied by other people, and defensible on review.",
    },
  },
  hr: {
    1: {
      key: "process-a-case",
      label: "Process a case end to end under supervision",
      hint: "Every step recorded and signed off by a reviewer.",
    },
    2: {
      key: "own-a-case-load",
      label: "Own a case load for a quarter",
      hint: "All cases resolved within policy and within their timelines.",
    },
    3: {
      key: "advise-a-manager",
      label: "Advise a manager through a complex case",
      hint: "The advice is recorded, followed and the outcome acknowledged.",
    },
    4: {
      key: "set-a-policy",
      label: "Set a policy adopted across the organisation",
      hint: "Approved, published and followed by other teams.",
    },
  },
  sales_marketing: {
    1: {
      key: "log-a-pipeline-entry",
      label: "Log a pipeline entry with its next action",
      hint: "Stage, value, next step and date recorded.",
    },
    2: {
      key: "close-a-deal-cycle",
      label: "Close a deal cycle from lead to won",
      hint: "Every stage documented and the handover to delivery recorded.",
    },
    3: {
      key: "own-a-segment",
      label: "Own a market segment or product line",
      hint: "The plan is yours, the results are tracked, and the forecast is accurate.",
    },
    4: {
      key: "set-the-go-to-market",
      label: "Set the go-to-market approach for a product or segment",
      hint: "Documented, adopted, and still in use after a quarter.",
    },
  },
  healthcare_science: {
    1: {
      key: "follow-a-protocol",
      label: "Follow a clinical or laboratory protocol without deviation",
      hint: "Every step recorded and signed off by a supervisor.",
    },
    2: {
      key: "run-a-test-cycle",
      label: "Run a test or assessment cycle unassisted",
      hint: "From sample to report with no rework requested.",
    },
    3: {
      key: "own-a-method",
      label: "Own a method or protocol used by others",
      hint: "Documented, validated and relied on by other practitioners.",
    },
    4: {
      key: "set-the-standard",
      label: "Set the standard for the discipline",
      hint: "A guideline in active use and defensible on peer review.",
    },
  },
  engineering: {
    1: {
      key: "produce-a-reviewed-drawing",
      label: "Produce a drawing or specification that passed review",
      hint: "Reviewed by a senior and approved with no rework.",
    },
    2: {
      key: "own-a-design-package",
      label: "Own a design package from concept to issue",
      hint: "Every revision tracked and the final issue approved.",
    },
    3: {
      key: "lead-a-design-coordination",
      label: "Lead a design coordination across disciplines",
      hint: "Clashes resolved, comments addressed and a coordination note written.",
    },
    4: {
      key: "set-a-design-standard",
      label: "Set a design standard adopted by the discipline",
      hint: "A template, specification or method in use by other engineers.",
    },
  },
}

const itemKey = (discipline: LadderDiscipline, level: number, key: string) =>
  `${discipline}-l${level}-${key}`

export const CAREER_LADDER: CareerLevelSeed[] = LADDER_DISCIPLINES.flatMap((discipline) =>
  LEVELS.map((rung) => ({
    discipline,
    level: rung.level,
    title: `${rung.name} ${DISCIPLINE_NAME[discipline]}`,
    summary: rung.summary,
    expectations: rung.expectations,
    bandMin: null,
    bandMax: null,
    bandCurrency: null,
    signals: { ...TARGETS[rung.level] },
    checklist: [...SHARED_CHECKLIST[rung.level], DISCIPLINE_CHECKLIST[discipline][rung.level]].map(
      (item) => ({ ...item, key: itemKey(discipline, rung.level, item.key) }),
    ),
  })),
)

export function isLadderDiscipline(value: unknown): value is LadderDiscipline {
  return typeof value === "string" && (LADDER_DISCIPLINES as readonly string[]).includes(value)
}

export function ladderLevel(
  discipline: LadderDiscipline,
  level: number,
): CareerLevelSeed | null {
  return CAREER_LADDER.find((row) => row.discipline === discipline && row.level === level) ?? null
}
