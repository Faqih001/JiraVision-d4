// Template library content. NOTE(PLACEHOLDER): these are proposed starter
// templates — none ship until the owner confirms them. The full preview/claim
// flow lands with the template library page (plan V2-5).

export type TemplateCategory = "Planning" | "Rituals" | "Wellbeing" | "Metrics" | "Docs"

export interface TemplateDef {
  id: string
  title: string
  category: TemplateCategory
  summary: string
  includes: string[]
  forStage: string
}

export const templateCategories: TemplateCategory[] = [
  "Planning",
  "Rituals",
  "Wellbeing",
  "Metrics",
  "Docs",
]

export const templates: TemplateDef[] = [
  {
    id: "capacity-sprint",
    title: "Capacity-first sprint plan",
    category: "Planning",
    summary: "Commit by available hours and skills before story points get anyone into trouble.",
    includes: ["Capacity worksheet", "Skills matrix", "Slack buffer rule"],
    forStage: "Teams that consistently over-commit",
  },
  {
    id: "backlog-triage",
    title: "Weekly backlog triage",
    category: "Planning",
    summary: "A 25-minute routine that keeps priorities honest without a meeting marathon.",
    includes: ["Triage checklist", "Decision log template", "Escalation lanes"],
    forStage: "Product + eng pairs",
  },
  {
    id: "retro-rotate",
    title: "Rotating retro formats",
    category: "Rituals",
    summary: "Four retro styles on a cycle so the room doesn't calcify into complaint theatre.",
    includes: ["Ship-it / sailboat / starfish prompts", "Action-owner sheet"],
    forStage: "Established scrums",
  },
  {
    id: "demo-day",
    title: "Demo day that isn't a status meeting",
    category: "Rituals",
    summary: "Show working software and the care behind it — reviews, fixes and docs count too.",
    includes: ["Run-of-show", "Recognition slots", "Async recording guide"],
    forStage: "Teams up to 30 people",
  },
  {
    id: "wip-limits",
    title: "WIP-limit rollout",
    category: "Rituals",
    summary: "Introduce limits in stages, measure flow, and keep the team's veto real.",
    includes: ["Rollout phases", "Flow metrics sheet", "Escape-hatch policy"],
    forStage: "Kanban-ish teams",
  },
  {
    id: "checkin-pulse",
    title: "Wellbeing check-in pulse",
    category: "Wellbeing",
    summary: "Anonymous mid-sprint pulse with team-level-only reporting, from day one.",
    includes: ["Question set (5)", "Aggregation rules", "Act-on thresholds"],
    forStage: "Leads who suspect, don't know",
  },
  {
    id: "after-hours",
    title: "After-hours recovery plan",
    category: "Wellbeing",
    summary: "A concrete protocol for the week after a hard deadline — decompression built in.",
    includes: ["Load-drop schedule", "Meeting blackout block", "Standby handoff notes"],
    forStage: "On-call and launch teams",
  },
  {
    id: "load-rebalance",
    title: "Mid-sprint rebalance playbook",
    category: "Wellbeing",
    summary: "Spot the overloaded person before standup #20 and move work, not blame.",
    includes: ["Signal list", "Rebalance moves menu", "How to say it script"],
    forStage: "Scrum masters and EMs",
  },
  {
    id: "metric-menu",
    title: "Ethical metrics starter menu",
    category: "Metrics",
    summary: "Nine metrics with formulas, anti-patterns and the question each one answers.",
    includes: ["Metric cards", "Formula appendix", "Do-not-ranking list"],
    forStage: "First dashboards",
  },
  {
    id: "predictability",
    title: "Predictability review",
    category: "Metrics",
    summary: "Compare drafts to reality each cycle — estimate quality, not blame quality.",
    includes: ["Commit vs finish sheet", "Drift chart spec", "Review agenda"],
    forStage: "Quarterly planning prep",
  },
  {
    id: "runbook",
    title: "Team runbook kit",
    category: "Docs",
    summary: "Operational docs people actually update, with owners and expiry dates.",
    includes: ["Runbook skeleton", "Review cadence", "Searchability rules"],
    forStage: "Tribal-knowledge escape",
  },
  {
    id: "ai-review",
    title: "AI suggestions review log",
    category: "Docs",
    summary: "Track which AI drafts you accepted, edited or rejected — and why.",
    includes: ["Decision log", "Reason codes", "Monthly digest template"],
    forStage: "Teams piloting AI planning",
  },
]
