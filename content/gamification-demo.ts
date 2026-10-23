// DEMO DATA — illustrative sample for the playground; no real customer data.

import type { Behavior, Branch, SkillNode, TeamLevel } from "@/lib/gamification/xp"

export interface DemoMember {
  initials: string
  role: string
}

export const branches: Branch[] = [
  { id: "craft", name: "Craft", blurb: "Reviews, safe shipping and keeping the codebase tidy." },
  { id: "collaboration", name: "Collaboration", blurb: "Pairing, unblocking and sharing context." },
  { id: "stewardship", name: "Stewardship", blurb: "Mentoring, docs and follow-through." },
]

export const behaviors: Behavior[] = [
  { id: "pr-review", label: "Reviewed a PR", points: 2, branch: "craft" },
  { id: "pairing", label: "Paired with a teammate", points: 3, branch: "collaboration" },
  { id: "mentoring", label: "Mentored a junior", points: 4, branch: "stewardship" },
  { id: "prod-fix", label: "Shipped a fix to prod", points: 3, branch: "craft" },
  { id: "runbook", label: "Wrote a runbook", points: 4, branch: "stewardship" },
  { id: "retro-action", label: "Ran a retro action", points: 3, branch: "stewardship" },
  { id: "unblock", label: "Helped unblock someone", points: 3, branch: "collaboration" },
  { id: "tech-debt", label: "Cleaned up tech debt", points: 4, branch: "craft" },
]

export const skillNodes: SkillNode[] = [
  {
    id: "craft-review",
    branch: "craft",
    short: "Review",
    name: "Review Craft",
    description: "Reviewing counts as real engineering work, not overtime.",
    threshold: 2,
  },
  {
    id: "craft-ship",
    branch: "craft",
    short: "Ship",
    name: "Safe Shipping",
    description: "Releasing to prod with a rollback plan in hand.",
    threshold: 5,
  },
  {
    id: "craft-debt",
    branch: "craft",
    short: "Tidy",
    name: "Debt Hunter",
    description: "Leaving the codebase tidier than you found it.",
    threshold: 9,
  },
  {
    id: "collab-pair",
    branch: "collaboration",
    short: "Pair",
    name: "Pairing Basics",
    description: "Two minds on one problem beats two branches of rework.",
    threshold: 2,
  },
  {
    id: "collab-unblock",
    branch: "collaboration",
    short: "Unblock",
    name: "Unblocker",
    description: "Getting a teammate moving again before your own next task.",
    threshold: 4,
  },
  {
    id: "collab-glue",
    branch: "collaboration",
    short: "Glue",
    name: "Team Glue",
    description: "The connective work that keeps the whole team moving.",
    threshold: 6,
  },
  {
    id: "stew-docs",
    branch: "stewardship",
    short: "Docs",
    name: "Runbook Author",
    description: "Writing the doc you wished existed at 3am.",
    threshold: 3,
  },
  {
    id: "stew-retro",
    branch: "stewardship",
    short: "Follow",
    name: "Follow-through",
    description: "Retro actions that actually happen, not just get noted.",
    threshold: 7,
  },
  {
    id: "stew-people",
    branch: "stewardship",
    short: "Care",
    name: "People First",
    description: "Mentoring and long-term health over short-term heroics.",
    threshold: 11,
  },
]

export const teamLevels: TeamLevel[] = [
  { level: 1, title: "Getting started", minXp: 0 },
  { level: 2, title: "Warming up", minXp: 6 },
  { level: 3, title: "Balanced team", minXp: 12 },
  { level: 4, title: "Seasoned crew", minXp: 18 },
  { level: 5, title: "Reference team", minXp: 24 },
]

export const members: DemoMember[] = [
  { initials: "AK", role: "Demo engineer" },
  { initials: "JM", role: "Demo engineer" },
  { initials: "RS", role: "Demo engineer" },
  { initials: "TP", role: "Demo engineer" },
]

// Illustrative attribution so the "no team-level-only" guardrail mode has
// something honest to show; a real config would map behaviour events to people.
export const behaviorAttribution: Readonly<Record<string, string>> = {
  "pr-review": "JM",
  pairing: "AK",
  mentoring: "TP",
  "prod-fix": "RS",
  runbook: "AK",
  "retro-action": "JM",
  unblock: "RS",
  "tech-debt": "TP",
}
