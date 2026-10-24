// Session outlines for /resources/webinars.
//
// NOTE(PLACEHOLDER): the previous version of these pages advertised recorded
// webinars with video embeds, slide downloads, attendee counts, likes and named
// speakers. None of that existed — the video URL was a Rickroll embed and the
// speakers were invented. PLACEHOLDERS.md tracks the owner decision about the
// legacy /resources content. This module keeps the three public URLs alive and
// describes only what the product actually does, linking to the documentation
// and the live dashboard pages that cover the same ground.
//
// When a recording exists, add `videoUrl` here and the reader will show it.

export type WebinarTopic = "AI Scrum Master" | "Ethical Metrics" | "Gamification"

export type WebinarEntry = {
  slug: string
  title: string
  description: string
  topic: WebinarTopic
  durationMinutes: number
  outline: { title: string; detail: string }[]
  /** slugs in content/documentation.ts — verified by tests/unit/webinars.test.ts */
  relatedDocs: string[]
  relatedProduct?: string
  /** signed-in route the session walks through */
  demoRoute?: string
  videoUrl?: string
}

export const webinarTopics: WebinarTopic[] = ["AI Scrum Master", "Ethical Metrics", "Gamification"]

/** Index filter chip value. */
export type WebinarFilter = WebinarTopic | "all"

export const webinars: Record<string, WebinarEntry> = {
  "ai-scrum-master-introduction": {
    slug: "ai-scrum-master-introduction",
    title: "Introduction to AI Scrum Master",
    description:
      "How the draft plan is built from capacity, history and skills — and why nothing reaches your board until a human accepts it.",
    topic: "AI Scrum Master",
    durationMinutes: 45,
    outline: [
      {
        title: "The approval gate",
        detail:
          "Every recommendation is a draft. Accepting it writes through the normal task and sprint endpoints, so it produces the same notifications and activity entries as a manual edit.",
      },
      {
        title: "What the draft reads",
        detail:
          "Open load per member, story points completed in recent sprints, meeting and PTO pressure for the next seven days, and the skills recorded on each member.",
      },
      {
        title: "The rationale per item",
        detail:
          "Each suggested task carries a plain-language reason rather than a bare score, so you can disagree with the reasoning instead of guessing at it.",
      },
      {
        title: "Health score, burndown and velocity forecast",
        detail:
          "The gauge, the actual/ideal/projected burndown lines and the forecast are all computed from the same task rows you can see on the board.",
      },
      {
        title: "Dismissing and re-drafting",
        detail:
          "Dismissed recommendations move to an archive that keeps the reason, and a mid-sprint re-draft names what slips and why.",
      },
    ],
    relatedDocs: ["ai-scrum-master-guide", "sprints-and-goals", "metrics-guide"],
    relatedProduct: "/products/ai-scrum-master",
    demoRoute: "/dashboard/ai-scrum-master",
  },

  "ethical-metrics-dashboard-demo": {
    slug: "ethical-metrics-dashboard-demo",
    title: "Ethical Metrics dashboard demo",
    description:
      "A walkthrough of indicators that print their own formula, the alert thresholds, and the list of metrics we refuse to build.",
    topic: "Ethical Metrics",
    durationMinutes: 40,
    outline: [
      {
        title: "Four team-level indicators",
        detail:
          "Predictability, workload distribution, review equity and after-hours drift — all aggregated to team level.",
      },
      {
        title: "Opening a card",
        detail:
          "Every card expands to show the formula, the source events and the exclusions. If a number cannot show its working it does not belong on the page.",
      },
      {
        title: "Workload balance and priority fairness",
        detail:
          "Who carries the load, and who carries the urgent work. The priority-fairness matrix is computed from the task list rather than a separate store.",
      },
      {
        title: "Load against seniority",
        detail:
          "Whether the heaviest load is landing on the least experienced members — the pattern that quietly turns into attrition.",
      },
      {
        title: "Thresholds, alerts and applying a recommendation",
        detail:
          "Configuration is stored per workspace; applying a recommendation performs the underlying change and records it, rather than editing the metric.",
      },
      {
        title: "The refusal list",
        detail:
          "No lines of code, no per-person velocity, no activity or keyboard-time scores, no default ranking of people against each other.",
      },
    ],
    relatedDocs: ["ethical-metrics", "metrics-guide", "dashboards"],
    relatedProduct: "/products/ethical-metrics",
    demoRoute: "/dashboard/ethical-metrics",
  },

  "gamification-for-developer-productivity": {
    slug: "gamification-for-developer-productivity",
    title: "Gamification for developer productivity",
    description:
      "Skill trees instead of speed leaderboards: how the team votes on which behaviours earn points, and where the guardrail switch sits.",
    topic: "Gamification",
    durationMinutes: 35,
    outline: [
      {
        title: "Skill trees, not leaderboards",
        detail:
          "Points map onto Craft, Collaboration and Stewardship branches. The default views are team totals and personal progression.",
      },
      {
        title: "Choosing the behaviours",
        detail:
          "The team votes on what earns points — reviews, mentoring, onboarding, documentation, tech-debt work. Points for the wrong thing produce the wrong work.",
      },
      {
        title: "Verifiable events",
        detail:
          "Points attach to events in the workspace rather than to self-reporting, so every claim has a source.",
      },
      {
        title: "Achievements and rewards",
        detail:
          "Achievements state their requirement before they are unlocked; redeeming a reward checks the balance and notifies whoever owns the catalogue.",
      },
      {
        title: "The guardrail switch",
        detail:
          "Individual ranking exists only behind an explicit switch that shows the consequences before you turn it on.",
      },
    ],
    relatedDocs: ["gamification", "user-roles", "notifications"],
    relatedProduct: "/products/gamification",
    demoRoute: "/dashboard/gamification",
  },
}

export const webinarList: WebinarEntry[] = Object.values(webinars)

export function getWebinar(slug: string): WebinarEntry | null {
  return webinars[slug] ?? null
}

export function webinarSlugs(): string[] {
  return webinarList.map((entry) => entry.slug)
}

export function webinarsByTopic(topic: WebinarTopic): WebinarEntry[] {
  return webinarList.filter((entry) => entry.topic === topic)
}

/** Other sessions, for the sidebar on a detail page. */
export function relatedWebinars(slug: string): WebinarEntry[] {
  return webinarList.filter((entry) => entry.slug !== slug)
}

/** Index search across title, description and outline copy. */
export function searchWebinars(query: string, topic: WebinarTopic | "all" = "all"): WebinarEntry[] {
  const needle = query.trim().toLowerCase()
  return webinarList.filter((entry) => {
    if (topic !== "all" && entry.topic !== topic) return false
    if (!needle) return true
    const haystack = [entry.title, entry.description, entry.topic, ...entry.outline.flatMap((item) => [item.title, item.detail])]
      .join(" ")
      .toLowerCase()
    return haystack.includes(needle)
  })
}
