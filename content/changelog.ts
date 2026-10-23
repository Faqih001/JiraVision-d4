// Changelog entries — the single source for /changelog and the navbar featured card.
// NOTE(owner): keep dates and claims factual; entries are ordered newest first.

export interface ChangelogEntry {
  date: string // ISO yyyy-mm-dd
  version: string
  category: "Feature" | "Improvement" | "Fix"
  title: string
  body: string
}

export const changelog: ChangelogEntry[] = [
  {
    date: "2026-10-23",
    version: "1.4",
    category: "Feature",
    title: "AI sprint reports",
    body: "Capacity-aware sprint drafts now ship with a written rationale per suggested item, so planning decisions can be reviewed and edited before approval.",
  },
  {
    date: "2026-09-30",
    version: "1.3",
    category: "Improvement",
    title: "Wellbeing signals move to team-level aggregation",
    body: "Check-in and workload indicators are now aggregated before display by default. Individual responses are never surfaced raw.",
  },
  {
    date: "2026-08-28",
    version: "1.2",
    category: "Feature",
    title: "Ethical metrics methodology view",
    body: "Every fairness and workload metric now links to the exact formula and data window behind it.",
  },
  {
    date: "2026-07-15",
    version: "1.1",
    category: "Improvement",
    title: "Skill trees recognise review and mentoring work",
    body: "Gamification paths now include code review, pairing and knowledge-sharing activities, opt-in per team.",
  },
  {
    date: "2026-06-10",
    version: "1.0",
    category: "Feature",
    title: "JiraVision goes public",
    body: "Initial launch: AI Scrum Master, Team Wellbeing, Gamification and Ethical Metrics for teams connecting Jira workspaces.",
  },
]

export const latestChangelog = changelog[0]
